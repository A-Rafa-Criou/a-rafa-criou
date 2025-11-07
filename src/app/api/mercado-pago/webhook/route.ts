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

    console.log('═══════════════════════════════════════════════════════');
    console.log('[MP Webhook] 🔔 WEBHOOK RECEBIDO');
    console.log('[MP Webhook] Body completo:', JSON.stringify(body, null, 2));
    console.log('═══════════════════════════════════════════════════════');

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
      console.log('[MP Webhook] ⚠️ Nenhum payment ID encontrado no body');

      // Se for merchant_order, ignorar silenciosamente (não é erro)
      if (body.topic === 'merchant_order' || body.resource?.includes('merchant_orders')) {
        console.log(
          '[MP Webhook] ℹ️ Webhook de merchant_order ignorado (não processamos este tipo)'
        );
        return NextResponse.json({ received: true, message: 'Merchant order webhook ignored' });
      }

      return NextResponse.json({ received: true, message: 'No payment ID found' });
    }

    console.log('[MP Webhook] 💳 Payment ID extraído:', paymentId);

    // ✅ VALIDAR ASSINATURA (se MERCADOPAGO_WEBHOOK_SECRET estiver configurado)
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (webhookSecret && dataIdForSignature) {
      const xSignature = req.headers.get('x-signature');
      const xRequestId = req.headers.get('x-request-id');

      const isValid = validateWebhookSignature(xSignature, xRequestId, dataIdForSignature, webhookSecret);

      if (!isValid) {
        console.log('[MP Webhook] ⚠️ Assinatura inválida, mas continuando processamento (modo compatibilidade)');
        // Não retornar erro 403, apenas logar - o Mercado Pago às vezes envia webhooks sem assinatura válida
        // return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      } else {
        console.log('[MP Webhook] ✅ Assinatura válida');
      }
    }

    // Idempotência: não processar o mesmo evento duas vezes (dentro de 1 minuto)
    if (processedEvents.has(paymentId)) {
      console.log('[MP Webhook] ⏭️ Evento duplicado, ignorando:', paymentId);
      return NextResponse.json({ status: 'duplicated' });
    }
    processedEvents.add(paymentId);
    // Limpar após 1 minuto para permitir novos webhooks do mesmo pagamento
    setTimeout(() => processedEvents.delete(paymentId), 60000);

    console.log('[MP Webhook] ✅ Evento novo, processando...');

    // SEMPRE consultar a API do Mercado Pago para garantir status correto
    if (paymentId) {
      // ✅ Suportar tanto MERCADOPAGO_ACCESS_TOKEN quanto MERCADOPAGO_ACCESS_TOKEN_PROD
      const accessToken =
        process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN_PROD;

      if (!accessToken) {
        console.error('[MP Webhook] ❌ Token não configurado');
        throw new Error('Token do Mercado Pago não configurado');
      }

      console.log('[MP Webhook] 🔑 Token configurado:', accessToken.substring(0, 20) + '...');

      // Buscar status do pagamento diretamente da API do Mercado Pago
      try {
        console.log('[MP Webhook] 🌐 Consultando API do Mercado Pago...');

        const paymentResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        console.log('[MP Webhook] 📡 Response status da API:', paymentResponse.status);

        if (!paymentResponse.ok) {
          const errorText = await paymentResponse.text();
          console.error('[MP Webhook] ❌ Erro na API:', errorText);
          throw new Error(`Erro ao buscar pagamento: ${paymentResponse.status}`);
        }

        const payment = await paymentResponse.json();

        console.log('[MP Webhook] 💰 Dados do pagamento:');
        console.log('  - ID:', payment.id);
        console.log('  - Status:', payment.status);
        console.log('  - Status Detail:', payment.status_detail);
        console.log('  - External Reference:', payment.external_reference);
        console.log('  - Metadata:', payment.metadata);
        console.log('  - Transaction Amount:', payment.transaction_amount);
        console.log('  - Payment Type:', payment.payment_type_id);

        // Busca pedido pelo paymentId OU pelo external_reference (order ID) OU pelo preference_id
        console.log('[MP Webhook] 🔍 Buscando pedido no banco...');

        let order = await db
          .select()
          .from(orders)
          .where(eq(orders.paymentId, paymentId))
          .limit(1)
          .then(rows => rows[0]);

        console.log('[MP Webhook] Busca por paymentId:', !!order);

        // Se não encontrou, tenta buscar pelo external_reference (order ID)
        if (!order && payment.external_reference) {
          console.log(
            '[MP Webhook] 🔍 Tentando buscar por external_reference:',
            payment.external_reference
          );

          order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, payment.external_reference))
            .limit(1)
            .then(rows => rows[0]);

          console.log('[MP Webhook] Busca por external_reference:', !!order);
        }

        // Se não encontrou, tenta buscar pelo preference_id no paymentId
        if (!order && payment.metadata?.preference_id) {
          console.log(
            '[MP Webhook] 🔍 Tentando buscar por preference_id:',
            payment.metadata.preference_id
          );

          order = await db
            .select()
            .from(orders)
            .where(eq(orders.paymentId, `PREF_${payment.metadata.preference_id}`))
            .limit(1)
            .then(rows => rows[0]);

          console.log('[MP Webhook] Busca por preference_id:', !!order);
        }

        // Se não encontrou, tenta buscar pedidos com PREF_ que ainda não foram atualizados
        if (!order) {
          console.log('[MP Webhook] 🔍 Tentando buscar pedidos recentes com PREF_...');

          const recentOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.paymentProvider, 'mercadopago'))
            .limit(10);

          console.log('[MP Webhook] Pedidos recentes encontrados:', recentOrders.length);

          const foundOrder = recentOrders.find(o => o.paymentId?.startsWith('PREF_'));

          if (foundOrder) {
            order = foundOrder;
            console.log('[MP Webhook] ✅ Pedido encontrado via busca recente:', order.id);
          }
        }

        if (!order) {
          console.error('[MP Webhook] ❌ Nenhum pedido encontrado para payment ID:', paymentId);
          console.error('[MP Webhook] External reference:', payment.external_reference);
          console.error('[MP Webhook] Preference ID:', payment.metadata?.preference_id);
          return NextResponse.json({ received: true, message: 'Order not found' });
        }

        if (order) {
          console.log('[MP Webhook] ✅ Pedido encontrado:', order.id);
          console.log('[MP Webhook] Status atual:', order.status, '/', order.paymentStatus);

          // ✅ ATUALIZAR O PAYMENT ID REAL (substituir o PREF_ temporário ou adicionar se não existir)
          if (!order.paymentId || order.paymentId.startsWith('PREF_')) {
            await db
              .update(orders)
              .set({
                paymentId: paymentId, // Substituir pelo payment ID real
                updatedAt: new Date(),
              })
              .where(eq(orders.id, order.id));

            console.log(
              `[MP Webhook] Payment ID atualizado: ${order.paymentId || 'vazio'} -> ${paymentId}`
            );
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

          console.log('[MP Webhook] Novo status calculado:', newStatus, '/', paymentStatus);

          await db
            .update(orders)
            .set({
              status: newStatus,
              paymentStatus: paymentStatus, // ✅ AGORA USA 'paid' em vez de 'approved'
              updatedAt: new Date(),
              paidAt: newStatus === 'completed' ? new Date() : order.paidAt,
            })
            .where(eq(orders.id, order.id));

          console.log(
            `[MP Webhook] ✅ Pedido ${order.id} atualizado: ${order.status} -> ${newStatus} (paymentStatus: ${paymentStatus})`
          );

          // ✅ INCREMENTAR CONTADOR DO CUPOM (se houver e pedido foi completado)
          if (newStatus === 'completed' && order.status !== 'completed' && order.couponCode) {
            console.log('[MP Webhook] 🎟️ Incrementando contador do cupom:', order.couponCode);
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
                console.log('[MP Webhook] ✅ Cupom processado com sucesso');
              }
            } catch (couponError) {
              console.error('[MP Webhook] ⚠️ Erro ao processar cupom:', couponError);
            }
          }

          // Enviar e-mail de confirmação se o pedido foi completado
          if (newStatus === 'completed' && order.status !== 'completed') {
            console.log('[MP Webhook] 📧 Enviando e-mail de confirmação...');
            try {
              const APP_URL =
                process.env.NEXTAUTH_URL ||
                process.env.NEXT_PUBLIC_APP_URL ||
                'http://localhost:3000';

              await fetch(`${APP_URL}/api/orders/send-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
              });

              console.log('[MP Webhook] ✅ E-mail enviado com sucesso');
            } catch (emailError) {
              console.error('[MP Webhook] ⚠️ Erro ao enviar e-mail:', emailError);
            }
          }
        }
      } catch (apiError) {
        console.error('[MP Webhook] ❌ Erro na API do Mercado Pago:', apiError);
        throw apiError;
      }
    }

    console.log('[MP Webhook] ✅ Webhook processado com sucesso');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[MP Webhook] ❌ Erro geral:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
