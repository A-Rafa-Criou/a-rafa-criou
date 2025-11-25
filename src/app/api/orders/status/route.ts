import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');

  if (!paymentId && !orderId) {
    return NextResponse.json({ error: 'paymentId ou orderId obrigatório' }, { status: 400 });
  }

  // Buscar pedido por paymentId ou orderId
  let order;
  if (orderId) {
    const [foundOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    order = foundOrder;
  } else if (paymentId) {
    const [foundOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.paymentId, paymentId))
      .limit(1);
    order = foundOrder;
  }

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  // ✅ Se ainda estiver pending, consultar Mercado Pago para ver se já foi aprovado
  if (
    order.status === 'pending' &&
    (order.paymentProvider === 'pix' || order.paymentProvider === 'mercadopago')
  ) {
    if (!order.paymentId) {
      return NextResponse.json({
        status: order.status,
        paymentStatus: order.paymentStatus,
      });
    }

    // ✅ Suportar tanto MERCADOPAGO_ACCESS_TOKEN quanto MERCADOPAGO_ACCESS_TOKEN_PROD
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN_PROD;

    if (!accessToken) {
      console.error('[Order Status] Token do Mercado Pago não configurado');
      return NextResponse.json({
        status: order.status,
        paymentStatus: order.paymentStatus,
      });
    }

    try {
      // Remover prefixo PREF_ se existir
      const cleanPaymentId = order.paymentId.replace('PREF_', '');

      console.log('[Order Status] Consultando Mercado Pago:', cleanPaymentId);

      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${cleanPaymentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (paymentResponse.ok) {
        const payment = await paymentResponse.json();

        console.log('[Order Status] Status do pagamento:', payment.status);

        // Se foi aprovado no Mercado Pago, atualizar banco
        if (['approved', 'paid', 'authorized'].includes(payment.status)) {
          console.log('[Order Status] ✅ Pagamento aprovado! Atualizando banco...');

          await db
            .update(orders)
            .set({
              status: 'completed',
              paymentStatus: 'paid', // ✅ IGUAL AO PIX E STRIPE
              updatedAt: new Date(),
              paidAt: new Date(),
              // Atualizar paymentId se estava com PREF_
              ...(order.paymentId.startsWith('PREF_') && { paymentId: cleanPaymentId }),
            })
            .where(eq(orders.id, order.id));

          // Enviar e-mail de confirmação
          try {
            const APP_URL =
              process.env.NEXTAUTH_URL ||
              process.env.NEXT_PUBLIC_APP_URL ||
              'https://arafacriou.com.br';

            await fetch(`${APP_URL}/api/orders/send-confirmation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.id }),
            });

            console.log('[Order Status] 📧 E-mail de confirmação enviado');
          } catch (emailError) {
            console.error('[Order Status] ⚠️ Erro ao enviar e-mail:', emailError);
          }

          return NextResponse.json({
            status: 'completed',
            paymentStatus: 'paid',
          });
        }
      } else {
        console.error('[Order Status] Erro ao consultar Mercado Pago:', paymentResponse.status);
      }
    } catch (error) {
      console.error('[Order Status] Erro ao consultar Mercado Pago:', error);
    }
  }

  return NextResponse.json({
    status: order.status,
    paymentStatus: order.paymentStatus,
  });
}
