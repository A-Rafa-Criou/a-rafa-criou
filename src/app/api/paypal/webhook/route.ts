import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { orders, coupons, couponRedemptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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

    console.log('═══════════════════════════════════════════════════════');
    console.log('[PayPal Webhook] EVENTO RECEBIDO:');
    console.log('Tipo:', body.event_type);
    console.log('ID:', body.id);
    console.log('═══════════════════════════════════════════════════════');

    // Validar assinatura
    if (!validatePayPalWebhook(req)) {
      console.error('[PayPal Webhook] 🚫 Assinatura inválida');
      return Response.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Idempotência
    const eventId = body.id;
    if (processedEvents.has(eventId)) {
      console.log('[PayPal Webhook] ⏭️ Evento duplicado, ignorando');
      return Response.json({ status: 'duplicated' });
    }
    processedEvents.add(eventId);
    setTimeout(() => processedEvents.delete(eventId), 60000);

    // Processar diferentes tipos de eventos
    switch (body.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('[PayPal Webhook] ✅ Ordem aprovada - CAPTURANDO AUTOMATICAMENTE...');
        await handleOrderApproved(body.resource);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('[PayPal Webhook] 💰 Pagamento capturado com sucesso');
        await handlePaymentCompleted(body.resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        console.log('[PayPal Webhook] ❌ Pagamento negado/recusado');
        await handlePaymentFailed(body.resource);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        console.log('[PayPal Webhook] 🔄 Pagamento reembolsado');
        await handlePaymentRefunded(body.resource);
        break;

      default:
        console.log('[PayPal Webhook] ℹ️ Evento não tratado:', body.event_type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[PayPal Webhook] Erro:', error);
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
      console.error('[PayPal Webhook] PayPal Order ID não encontrado');
      return;
    }

    console.log('[PayPal Webhook] 🔍 Processando ordem aprovada:', paypalOrderId);

    // Buscar pedido no banco
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, paypalOrderId))
      .limit(1);

    if (!order) {
      console.warn('[PayPal Webhook] Pedido não encontrado:', paypalOrderId);
      return;
    }

    console.log('[PayPal Webhook] 📦 Pedido encontrado no banco:', order.id);

    // Se já está completed, não processar novamente
    if (order.status === 'completed' && order.paymentStatus === 'paid') {
      console.log('[PayPal Webhook] ✅ Pedido já estava completed, ignorando');
      return;
    }

    // ✅ CAPTURAR PAGAMENTO AUTOMATICAMENTE usando a API do PayPal diretamente
    try {
      console.log('[PayPal Webhook] 🚀 Capturando pagamento automaticamente...');
      
      const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
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
        console.log('[PayPal Webhook] 🎉 Captura automática bem-sucedida!');
        console.log('[PayPal Webhook] ✅ Pedido ID:', captureData.orderId);
        console.log('[PayPal Webhook] ✅ Status:', captureData.status);
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

    console.log('[PayPal Webhook] 💰 Processando pagamento completado:', paypalOrderId);

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

    console.log('[PayPal Webhook] 📦 Pedido encontrado no banco:', order.id);
    console.log('[PayPal Webhook] 📊 Status atual:', order.status, '/', order.paymentStatus);

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

            console.log('[PayPal Webhook] ✅ Registro de resgate do cupom criado');
          }
        }
      } catch (err) {
        console.error('[PayPal Webhook] ⚠️ Erro ao processar cupom:', err);
      }
    }

    // Enviar e-mail de confirmação (somente se não estava completed antes)
    if (order.status !== 'completed') {
      try {
        const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        await fetch(`${APP_URL}/api/orders/send-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        });
        
        console.log('[PayPal Webhook] 📧 E-mail de confirmação enviado');
      } catch (emailError) {
        console.error('[PayPal Webhook] ⚠️ Erro ao enviar e-mail:', emailError);
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

    await db
      .update(orders)
      .set({
        status: 'cancelled',
        paymentStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
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
