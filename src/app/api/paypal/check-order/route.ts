import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Endpoint para verificar status de um pedido PayPal
 * Similar ao check-payment do Mercado Pago
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paypalOrderId = searchParams.get('paypalOrderId');
  const dbOrderId = searchParams.get('orderId');

  if (!paypalOrderId && !dbOrderId) {
    return NextResponse.json({ error: 'paypalOrderId ou orderId obrigatório' }, { status: 400 });
  }

  try {
    // Buscar pedido no banco
    let order;
    if (dbOrderId) {
      const [foundOrder] = await db.select().from(orders).where(eq(orders.id, dbOrderId)).limit(1);
      order = foundOrder;
    } else if (paypalOrderId) {
      const [foundOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.paypalOrderId, paypalOrderId))
        .limit(1);
      order = foundOrder;
    }

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Se já está completed, retornar imediatamente
    if (order.status === 'completed' && order.paymentStatus === 'paid') {
      return NextResponse.json({
        order: {
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
        },
        paypal: {
          status: 'COMPLETED',
        },
      });
    }

    // Se ainda está pending, consultar PayPal API
    if (order.paypalOrderId) {
      try {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error('[PayPal Check Order] Credenciais não configuradas');
          return NextResponse.json({
            order: {
              id: order.id,
              status: order.status,
              paymentStatus: order.paymentStatus,
            },
          });
        }

        // Obter token de acesso
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResponse = await fetch(
          `https://api${process.env.NODE_ENV === 'production' ? '' : '-m.sandbox'}.paypal.com/v1/oauth2/token`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
          }
        );

        if (!tokenResponse.ok) {
          console.error('[PayPal Check Order] Erro ao obter token');
          return NextResponse.json({
            order: {
              id: order.id,
              status: order.status,
              paymentStatus: order.paymentStatus,
            },
          });
        }

        const { access_token } = await tokenResponse.json();

        // Consultar status da ordem no PayPal
        const orderResponse = await fetch(
          `https://api${process.env.NODE_ENV === 'production' ? '' : '-m.sandbox'}.paypal.com/v2/checkout/orders/${order.paypalOrderId}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!orderResponse.ok) {
          console.error('[PayPal Check Order] Erro ao consultar ordem:', orderResponse.status);
          return NextResponse.json({
            order: {
              id: order.id,
              status: order.status,
              paymentStatus: order.paymentStatus,
            },
          });
        }

        const paypalOrder = await orderResponse.json();

        // Se foi aprovado ou completado, tentar capturar
        if (paypalOrder.status === 'APPROVED' || paypalOrder.status === 'COMPLETED') {
          console.log('[PayPal Check Order] Ordem aprovada/completada, tentando capturar...');

          // Tentar capturar automaticamente
          try {
            const APP_URL =
              process.env.NEXTAUTH_URL ||
              process.env.NEXT_PUBLIC_APP_URL ||
              'https://arafacriou.com.br';

            const captureResponse = await fetch(`${APP_URL}/api/paypal/capture-order`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.paypalOrderId }),
            });

            if (captureResponse.ok) {
              const captureData = await captureResponse.json();
              console.log('[PayPal Check Order] ✅ Captura bem-sucedida:', captureData);

              // Retornar status atualizado
              return NextResponse.json({
                order: {
                  id: order.id,
                  status: 'completed',
                  paymentStatus: 'paid',
                },
                paypal: {
                  status: 'COMPLETED',
                },
              });
            }
          } catch (captureError) {
            console.error('[PayPal Check Order] Erro ao capturar:', captureError);
          }
        }

        return NextResponse.json({
          order: {
            id: order.id,
            status: order.status,
            paymentStatus: order.paymentStatus,
          },
          paypal: {
            status: paypalOrder.status,
          },
        });
      } catch (error) {
        console.error('[PayPal Check Order] Erro ao consultar PayPal:', error);
      }
    }

    // Retornar status do banco se não conseguiu consultar PayPal
    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error('[PayPal Check Order] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
