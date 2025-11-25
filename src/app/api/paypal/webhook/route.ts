import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { orders, coupons, couponRedemptions, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createCommissionForPaidOrder } from '@/lib/affiliates/webhook-processor';
import { sendPaymentFailedNotification } from '@/lib/notifications/helpers';

/**
 * Webhook do PayPal
 * Documentação: https://developer.paypal.com/api/rest/webhooks/
 *
 * Eventos suportados:
 * - CHECKOUT.ORDER.APPROVED
 * - PAYMENT.CAPTURE.COMPLETED
 * - PAYMENT.CAPTURE.DENIED
 * - PAYMENT.CAPTURE.REFUNDED
 */

// Simples controle de idempotência
const processedEvents = new Set<string>();

/**
 * Valida assinatura do webhook PayPal
 */
function validatePayPalWebhook(req: NextRequest): boolean {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    console.warn('[PayPal Webhook] PAYPAL_WEBHOOK_ID não configurado - validação desabilitada');
    return true; // Em desenvolvimento, permitir sem validação
  }

  // Headers necessários para validação
  const transmissionId = req.headers.get('paypal-transmission-id');
  const transmissionTime = req.headers.get('paypal-transmission-time');
  const certUrl = req.headers.get('paypal-cert-url');
  const authAlgo = req.headers.get('paypal-auth-algo');
  const transmissionSig = req.headers.get('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error('[PayPal Webhook] Headers de validação ausentes');
    return false;
  }

  // TODO: Implementar validação completa com certificado SSL
  // Por agora, apenas log
  console.log('[PayPal Webhook] Headers recebidos, validação simplificada ativada');

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    // Validar assinatura
    if (!validatePayPalWebhook(req)) {
      return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Idempotência
    const eventId = body.id;
    if (processedEvents.has(eventId)) {
      return Response.json({ status: 'duplicated' });
    }
    processedEvents.add(eventId);
    setTimeout(() => processedEvents.delete(eventId), 60000);

    // Processar diferentes tipos de eventos
    switch (body.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(body.resource);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCompleted(body.resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        await handlePaymentFailed(body.resource);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentRefunded(body.resource);
        break;

      default:
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}

/**
 * Processa ordem aprovada - CAPTURA AUTOMATICAMENTE
 */
async function handleOrderApproved(resource: Record<string, unknown>) {
  try {
    const paypalOrderId = resource.id as string | undefined;

    if (!paypalOrderId) {
      return;
    }

    // Buscar pedido no banco
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, paypalOrderId))
      .limit(1);

    if (!order) {
      return;
    }

    // Se já está completed, não processar novamente
    if (order.status === 'completed' && order.paymentStatus === 'paid') {
      return;
    }

    // ✅ CAPTURAR PAGAMENTO AUTOMATICAMENTE usando a API do PayPal diretamente
    try {
      const APP_URL =
        process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';

      const captureResponse = await fetch(`${APP_URL}/api/paypal/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: paypalOrderId }),
      });

      if (!captureResponse.ok) {
        const errorText = await captureResponse.text();
        console.error('[PayPal Webhook] ❌ Falha na captura - Status:', captureResponse.status);
        console.error('[PayPal Webhook] ❌ Resposta:', errorText);
        return;
      }

      const captureData = await captureResponse.json();

      if (captureData.success) {
      } else {
        console.error('[PayPal Webhook] ❌ Falha na captura automática:', captureData);
      }
    } catch (err) {
      console.error('[PayPal Webhook] ❌ Erro ao capturar automaticamente:', err);
    }
  } catch (error) {
    console.error('[PayPal Webhook] ❌ Erro ao processar ordem aprovada:', error);
  }
}

/**
 * Processa pagamento completado
 */
async function handlePaymentCompleted(resource: Record<string, unknown>) {
  try {
    // Extrair PayPal Order ID do resource
    const supplementaryData = resource.supplementary_data as Record<string, unknown> | undefined;
    const relatedIds = supplementaryData?.related_ids as Record<string, unknown> | undefined;
    const paypalOrderId = relatedIds?.order_id as string | undefined;

    if (!paypalOrderId) {
      console.error('[PayPal Webhook] PayPal Order ID não encontrado no resource');
      console.error('[PayPal Webhook] Resource recebido:', JSON.stringify(resource, null, 2));
      return;
    }

    // Buscar pedido no banco
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, paypalOrderId))
      .limit(1);

    if (!order) {
      console.warn('[PayPal Webhook] ❌ Pedido não encontrado:', paypalOrderId);
      return;
    }

    // Se já está completed com pagamento pago, não processar novamente (idempotência)
    if (order.status === 'completed' && order.paymentStatus === 'paid') {
      console.log('[PayPal Webhook] ✅ Pedido já estava completed com pagamento pago, ignorando');
      return;
    }

    // Atualizar pedido para completed + paid (IGUAL AO PIX E STRIPE)
    await db
      .update(orders)
      .set({
        status: 'completed',
        paymentStatus: 'paid', // ✅ IGUAL AO PIX E STRIPE
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    console.log('[PayPal Webhook] ✅ Pedido atualizado para completed/paid');

    // ✅ INCREMENTAR CONTADOR DO CUPOM (somente se não estava completed antes)
    if (order.status !== 'completed' && order.couponCode) {
      try {
        await db
          .update(coupons)
          .set({
            usedCount: sql`${coupons.usedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(coupons.code, order.couponCode));

        console.log('[PayPal Webhook] ✅ Contador do cupom incrementado');

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
      } catch (err) {
        console.error('[PayPal Webhook] ⚠️ Erro ao processar cupom:', err);
      }
    }

    // Enviar e-mail de confirmação (somente se não estava completed antes)
    if (order.status !== 'completed') {
      try {
        const APP_URL =
          process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';

        await fetch(`${APP_URL}/api/orders/send-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        });

        console.log('[PayPal Webhook] 📧 E-mail de confirmação enviado');
      } catch (emailError) {
        console.error('[PayPal Webhook] ⚠️ Erro ao enviar e-mail:', emailError);
      }

      // 💰 PROCESSAR COMISSÃO DE AFILIADO (se houver)
      try {
        await createCommissionForPaidOrder(order.id);
      } catch (affiliateError) {
        console.error(
          '[PayPal Webhook] ⚠️ Erro ao processar comissão de afiliado:',
          affiliateError
        );
      }
    }
  } catch (error) {
    console.error('[PayPal Webhook] ❌ Erro ao processar pagamento completado:', error);
  }
}

/**
 * Processa pagamento falhado
 */
async function handlePaymentFailed(resource: Record<string, unknown>) {
  try {
    const supplementaryData = resource.supplementary_data as Record<string, unknown> | undefined;
    const relatedIds = supplementaryData?.related_ids as Record<string, unknown> | undefined;
    const paypalOrderId = relatedIds?.order_id as string | undefined;

    if (!paypalOrderId) return;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, paypalOrderId))
      .limit(1);

    if (!order) return;

    // Buscar nome do usuário se existir
    let customerName: string | undefined;
    if (order.userId) {
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);
      customerName = user?.name || undefined;
    }

    await db
      .update(orders)
      .set({
        status: 'cancelled',
        paymentStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Notificar admins sobre pagamento falhado via Web Push
    await sendPaymentFailedNotification({
      customerName: customerName,
      customerEmail: order.email,
      orderId: order.id,
      orderTotal: order.total || undefined,
      paymentMethod: 'PayPal',
      errorReason: 'Pagamento negado pelo PayPal',
    });

    console.log('[PayPal Webhook] Pagamento falhado processado:', order.id);
  } catch (error) {
    console.error('[PayPal Webhook] Erro ao processar falha:', error);
  }
}

/**
 * Processa reembolso
 */
async function handlePaymentRefunded(resource: Record<string, unknown>) {
  try {
    const supplementaryData = resource.supplementary_data as Record<string, unknown> | undefined;
    const relatedIds = supplementaryData?.related_ids as Record<string, unknown> | undefined;
    const paypalOrderId = relatedIds?.order_id as string | undefined;

    if (!paypalOrderId) return;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, paypalOrderId))
      .limit(1);

    if (!order) return;

    await db
      .update(orders)
      .set({
        status: 'refunded',
        paymentStatus: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Decrementar contador do cupom se houver
    if (order.couponCode) {
      await db
        .update(coupons)
        .set({
          usedCount: sql`GREATEST(0, ${coupons.usedCount} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(coupons.code, order.couponCode));
    }
  } catch (error) {
    console.error('[PayPal Webhook] Erro ao processar reembolso:', error);
  }
}
