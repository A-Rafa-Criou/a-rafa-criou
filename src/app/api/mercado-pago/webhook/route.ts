import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, coupons, couponRedemptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Simples controle de idempotência (ideal: usar storage externo)
const processedEvents = new Set<string>();

/**
 * Valida a assinatura do webhook do Mercado Pago
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): boolean {
  if (!xSignature || !xRequestId || !secret) {
    return false;
  }

  try {
    // Extrair ts e hash da assinatura
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key.trim() === 'ts') ts = value;
      if (key.trim() === 'v1') hash = value;
    }

    if (!ts || !hash) {
      return false;
    }

    // Criar o manifesto: id + request-id + ts
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Calcular HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const calculatedHash = hmac.digest('hex');

    // Comparar hashes
    const isValid = calculatedHash === hash;

    return isValid;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extrair payment ID de diferentes formatos possíveis
    let paymentId: string | null = null;
    let dataIdForSignature: string | null = null; // ID usado na validação de assinatura

    // Formato 1: { data: { id: "123" } }
    if (body.data?.id) {
      paymentId = body.data.id;
      dataIdForSignature = body.data.id;
    }
    // Formato 2: { id: "123" }
    else if (body.id && typeof body.id === 'string') {
      paymentId = body.id;
      dataIdForSignature = body.id;
    }
    // Formato 3: { resource: "/v1/payments/123" } ou { resource: "123" }
    else if (body.resource && typeof body.resource === 'string') {
      // Se for um número direto (sem URL)
      if (/^\d+$/.test(body.resource)) {
        paymentId = body.resource;
        dataIdForSignature = body.resource;
      } else {
        // Se for uma URL com /payments/
        const match = body.resource.match(/\/payments\/(\d+)/);
        if (match) {
          paymentId = match[1];
          dataIdForSignature = match[1];
        }
      }
    }
    // Formato 4: { topic: "payment", id: 123 } - id como number
    else if (body.topic === 'payment' && body.id && typeof body.id === 'number') {
      paymentId = body.id.toString();
      dataIdForSignature = body.id.toString();
    }

    if (!paymentId) {
      // Se for merchant_order, ignorar silenciosamente (não é erro)
      if (body.topic === 'merchant_order' || body.resource?.includes('merchant_orders')) {
        return NextResponse.json({ received: true, message: 'Merchant order webhook ignored' });
      }

      return NextResponse.json({ received: true, message: 'No payment ID found' });
    }

    // ✅ VALIDAR ASSINATURA (se MERCADOPAGO_WEBHOOK_SECRET estiver configurado)
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (webhookSecret && dataIdForSignature) {
      const xSignature = req.headers.get('x-signature');
      const xRequestId = req.headers.get('x-request-id');

      const isValid = validateWebhookSignature(
        xSignature,
        xRequestId,
        dataIdForSignature,
        webhookSecret
      );

      if (!isValid) {
        // Modo compatibilidade - Mercado Pago às vezes envia webhooks sem assinatura válida
      }
    }

    // Idempotência: não processar o mesmo evento duas vezes (dentro de 1 minuto)
    if (processedEvents.has(paymentId)) {
      return NextResponse.json({ status: 'duplicated' });
    }
    processedEvents.add(paymentId);
    // Limpar após 1 minuto para permitir novos webhooks do mesmo pagamento
    setTimeout(() => processedEvents.delete(paymentId), 60000);

    // SEMPRE consultar a API do Mercado Pago para garantir status correto
    if (paymentId) {
      // ✅ Suportar tanto MERCADOPAGO_ACCESS_TOKEN quanto MERCADOPAGO_ACCESS_TOKEN_PROD
      const accessToken =
        process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN_PROD;

      if (!accessToken) {
        console.error('[MP Webhook] ❌ Token não configurado');
        throw new Error('Token do Mercado Pago não configurado');
      }

      // Buscar status do pagamento diretamente da API do Mercado Pago
      try {
        const paymentResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!paymentResponse.ok) {
          console.error('[MP Webhook] Erro na API:', paymentResponse.status);
          throw new Error(`Erro ao buscar pagamento: ${paymentResponse.status}`);
        }

        const payment = await paymentResponse.json();

        // Busca pedido pelo paymentId OU pelo external_reference (order ID) OU pelo preference_id
        let order = await db
          .select()
          .from(orders)
          .where(eq(orders.paymentId, paymentId))
          .limit(1)
          .then(rows => rows[0]);

        // Se não encontrou, tenta buscar pelo external_reference (order ID)
        if (!order && payment.external_reference) {
          order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, payment.external_reference))
            .limit(1)
            .then(rows => rows[0]);
        }

        // Se não encontrou, tenta buscar pelo preference_id no paymentId
        if (!order && payment.metadata?.preference_id) {
          order = await db
            .select()
            .from(orders)
            .where(eq(orders.paymentId, `PREF_${payment.metadata.preference_id}`))
            .limit(1)
            .then(rows => rows[0]);
        }

        // Se não encontrou, tenta buscar pedidos com PREF_ que ainda não foram atualizados
        if (!order) {
          const recentOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.paymentProvider, 'mercadopago'))
            .limit(10);

          const foundOrder = recentOrders.find(o => o.paymentId?.startsWith('PREF_'));

          if (foundOrder) {
            order = foundOrder;
          }
        }

        if (!order) {
          console.error('[MP Webhook] Pedido não encontrado para payment ID');
          return NextResponse.json({ received: true, message: 'Order not found' });
        }

        if (order) {
          // ✅ ATUALIZAR O PAYMENT ID REAL (substituir o PREF_ temporário ou adicionar se não existir)
          if (!order.paymentId || order.paymentId.startsWith('PREF_')) {
            await db
              .update(orders)
              .set({
                paymentId: paymentId, // Substituir pelo payment ID real
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));
          }

          let newStatus = 'pending';
          let paymentStatus = 'pending';

          // Tratar status do Mercado Pago → IGUAL À STRIPE
          if (['approved', 'paid', 'authorized'].includes(payment.status)) {
            newStatus = 'completed';
            paymentStatus = 'paid'; // ✅ IGUAL À STRIPE
          } else if (['pending', 'in_process', 'in_mediation'].includes(payment.status)) {
            newStatus = 'pending';
            paymentStatus = 'pending';
          } else if (
            ['cancelled', 'rejected', 'expired', 'charged_back'].includes(payment.status)
          ) {
            newStatus = 'cancelled';
            paymentStatus = 'cancelled';
          } else if (payment.status === 'refunded') {
            newStatus = 'refunded';
            paymentStatus = 'refunded';
          }

          await db
            .update(orders)
            .set({
              status: newStatus,
              paymentStatus: paymentStatus, // ✅ AGORA USA 'paid' em vez de 'approved'
              updatedAt: new Date(),
              paidAt: newStatus === 'completed' ? new Date() : order.paidAt,
            })
            .where(eq(orders.id, order.id));

          // ✅ INCREMENTAR CONTADOR DO CUPOM (se houver e pedido foi completado)
          if (newStatus === 'completed' && order.status !== 'completed' && order.couponCode) {
            try {
              await db
                .update(coupons)
                .set({
                  usedCount: sql`${coupons.usedCount} + 1`,
                  updatedAt: new Date(),
                })
                .where(eq(coupons.code, order.couponCode));

              // ✅ REGISTRAR USO DO CUPOM PELO USUÁRIO
              if (order.userId) {
                const [couponData] = await db
                  .select()
                  .from(coupons)
                  .where(eq(coupons.code, order.couponCode))
                  .limit(1);

                if (couponData) {
                  await db.insert(couponRedemptions).values({
                    couponId: couponData.id,
                    userId: order.userId,
                    orderId: order.id,
                    amountDiscounted: order.discountAmount || '0',
                  });
                }
              }
            } catch (couponError) {
              console.error('[MP Webhook] Erro ao processar cupom:', couponError);
            }
          }

          // Enviar e-mail de confirmação se o pedido foi completado
          if (newStatus === 'completed' && order.status !== 'completed') {
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
            } catch (emailError) {
              console.error('[MP Webhook] Erro ao enviar e-mail:', emailError);
            }
          }
        }
      } catch (apiError) {
        console.error('[MP Webhook] Erro na API do Mercado Pago:', apiError);
        throw apiError;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[MP Webhook] Erro geral:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
