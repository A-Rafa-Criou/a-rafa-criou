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
    // (debug) Will compute APP_URL when attempting capture to ensure same-origin calls in dev
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
            // Use the current request origin as a default so server-to-server calls go to the current host (important for local dev)
            const requestOrigin = new URL(req.url).origin;
            const APP_URL =
              process.env.NEXTAUTH_URL ||
              process.env.NEXT_PUBLIC_APP_URL ||
              requestOrigin ||
              'https://arafacriou.com.br';

            const captureResponse = await fetch(`${APP_URL}/api/paypal/capture-order`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.paypalOrderId }),
            });
            let captureData: unknown = null;
            try {
              captureData = await captureResponse.json();
            } catch (e) {
              console.warn('[PayPal Check Order] capture-order returned non-json response');
            }

            // If capture-order returned ok, OR the body explicitly says alreadyCaptured, treat as success
            const captureBody = captureData as unknown;
            const alreadyCapturedFlag =
              captureBody && typeof captureBody === 'object' && 'alreadyCaptured' in captureBody
                ? (captureBody as Record<string, unknown>)['alreadyCaptured'] === true
                : false;

            if (captureResponse.ok || alreadyCapturedFlag) {
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
            } else {
              // Normalize capture error details
              // Capture data might be an object like { error: '...' }, or nested; normalize it to a message string
              let captureMessage: string | undefined;
              try {
                if (captureData == null) {
                  captureMessage = `Erro ao capturar ordem (status ${captureResponse.status})`;
                } else if (typeof captureData === 'string') {
                  captureMessage = captureData;
                } else if (typeof captureData === 'object') {
                  // Narrow the object shape for safer access
                  const cd = captureData as {
                    details?: unknown;
                    message?: unknown;
                    error?: unknown;
                  };
                  // Prefer `details` when returned as it contains PayPal API payload details, otherwise human message fields
                  if (cd.details && typeof cd.details === 'string') {
                    captureMessage = cd.details;
                  } else if (cd.message && typeof cd.message === 'string') {
                    captureMessage = cd.message;
                  } else if (cd.error && typeof cd.error === 'string') {
                    captureMessage = cd.error;
                  } else {
                    // Try to stringify nested object fields
                    captureMessage = JSON.stringify(cd);
                  }
                }

                if (!captureMessage || captureMessage.length === 0) {
                  captureMessage = `Erro ao capturar ordem (status ${captureResponse.status})`;
                }
              } catch (e) {
                captureMessage = `Erro ao capturar ordem (status ${captureResponse.status})`;
              }
              console.error(
                '[PayPal Check Order] Capture falhou, status:',
                captureResponse.status,
                'message:',
                captureMessage,
                'body:',
                captureData
              );

              return NextResponse.json({
                order: {
                  id: order.id,
                  status: order.status,
                  paymentStatus: order.paymentStatus,
                },
                paypal: {
                  status: paypalOrder.status,
                },
                captureError: {
                  status: captureResponse.status,
                  message: captureMessage,
                  // Truncate details to avoid leaking sensitive bits in UI/logs; still helpful for debugging
                  details:
                    typeof captureData === 'object'
                      ? JSON.stringify(captureData).slice(0, 1000)
                      : undefined,
                },
              });
            }
          } catch (captureError) {
            console.error('[PayPal Check Order] Erro ao capturar:', captureError);
            // Ensure we always send a structured captureError along with status
            return NextResponse.json(
              {
                order: {
                  id: order.id,
                  status: order.status,
                  paymentStatus: order.paymentStatus,
                },
                paypal: {
                  status: paypalOrder.status,
                },
                captureError: {
                  status: 500,
                  message: String(captureError) || 'Erro ao capturar ordem (exceção)',
                },
              },
              { status: 200 }
            );
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
    return NextResponse.json(
      {
        order: undefined,
        paypal: undefined,
        captureError: {
          status: 500,
          message: 'Erro interno do servidor',
        },
        error: 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}
