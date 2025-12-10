import { NextRequest } from 'next/server';
import { z } from 'zod';
import { capturePayPalOrder } from '@/lib/paypal';
import { db } from '@/lib/db';
import { orders, coupons, couponRedemptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const captureOrderSchema = z.object({
  orderId: z.string(),
});

export async function POST(req: NextRequest) {
  // orderId captured here so catch{} can reference it when needed
  let orderId: string | null = null;
  const formatApiError = (code: string, message: string, details?: unknown, httpStatus = 500) => {
    let d: string | undefined = undefined;
    try {
      if (details) {
        d = typeof details === 'string' ? details : JSON.stringify(details);
        if (d.length > 1000) d = d.slice(0, 1000) + '...';
      }
    } catch (e) {
      d = undefined;
    }
    // Log helpful server-side message for debugging (do not disclose sensitive data)
    try {
      console.error('[PayPal Capture] API_ERROR:', { code, message, details: d, httpStatus });
    } catch (e) {
      // ignore logging issues
    }
    return Response.json({ error: code, message, details: d }, { status: httpStatus });
  };
  try {
    const body = await req.json();
    const parsed = captureOrderSchema.parse(body);
    orderId = parsed.orderId;

    // 🔒 IDEMPOTÊNCIA: Verificar se ordem já foi capturada
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, orderId))
      .limit(1);

    if (existingOrder) {
      if (existingOrder.status === 'completed' && existingOrder.paymentStatus === 'paid') {
        return Response.json({
          success: true,
          orderId: existingOrder.id,
          status: existingOrder.status,
          alreadyCaptured: true,
        });
      }
    }

    // 1. Capturar pagamento no PayPal
    const captureData = await capturePayPalOrder(orderId);
    // Logar alguns campos para debug (sem expor sensíveis)
    try {
      console.log('[PayPal Capture] captureData.status:', captureData.status);
      console.log('[PayPal Capture] payer:', captureData.payer?.email_address);
      console.log(
        '[PayPal Capture] purchase_units length:',
        captureData.purchase_units?.length || 0
      );
    } catch (e) {
      console.warn('[PayPal Capture] Falha ao logar captureData detalhado', e);
    }

    // Capture status can be reported on captureData.status or nested under purchase_units[].payments.captures[0].status
    const captureStatus =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.status || captureData.status;

    if (captureStatus !== 'COMPLETED') {
      console.error(
        '[PayPal Capture] captureStatus not completed:',
        captureStatus,
        'captureData:',
        captureData
      );
      // Detect specific pending reason that requires manual merchant action
      const captureDetails = captureData?.purchase_units?.[0]?.payments?.captures?.[0] || {};
      const statusDetailsReason = captureDetails?.status_details?.reason as string | undefined;
      if (statusDetailsReason === 'RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION') {
        console.warn(
          '[PayPal Capture] Capture is pending due to merchant receiving preference requiring manual action',
          { orderId, statusDetailsReason }
        );
        // Mark DB order as pending and include a note
        try {
          const [foundOrder] = await db
            .select()
            .from(orders)
            .where(eq(orders.paypalOrderId, orderId ?? ''))
            .limit(1);
          if (
            foundOrder &&
            !(foundOrder.status === 'completed' && foundOrder.paymentStatus === 'paid')
          ) {
            await db
              .update(orders)
              .set({
                status: 'pending',
                paymentStatus: 'pending',
                updatedAt: new Date(),
              })
              .where(eq(orders.id, foundOrder.id));
            console.log(
              '[PayPal Capture] DB order marked as pending (merchant manual action required) for paypalOrderId',
              orderId
            );
          }
        } catch (updateErr) {
          console.error(
            '[PayPal Capture] Erro ao marcar pedido como pending em manual action:',
            updateErr
          );
        }

        // ❌ NÃO enviar confirmação para status PENDING (será enviada quando completar)
        console.log('[PayPal Capture] Status PENDING - aguardando ação do vendedor');

        return Response.json({
          success: false,
          orderId: orderId,
          status: 'pending',
          paymentStatus: 'pending',
          pendingReason: statusDetailsReason,
          message: 'Pagamento recebido, aguardando ação manual do vendedor',
        });
      }

      return formatApiError(
        'CAPTURE_NOT_COMPLETED',
        'Pagamento não foi completado',
        { captureStatus, captureData },
        400
      );
    }

    // 2. Buscar pedido no banco pelo paypalOrderId
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, orderId))
      .limit(1);

    if (!order) {
      console.error('[PayPal Capture] Pedido não encontrado:', orderId);
      return formatApiError(
        'ORDER_NOT_FOUND',
        'Pedido não encontrado',
        { paypalOrderId: orderId },
        404
      );
    }

    // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar integridade dos valores
    const orderTotal = parseFloat(order.total); // Valor em BRL (banco)
    const orderCurrency = order.currency || 'BRL';
    const paidAmount = parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value);
    const paidCurrency = captureData.purchase_units[0].payments.captures[0].amount.currency_code;

    // Se moedas forem diferentes, converter para comparação
    let expectedAmountInPayPal = orderTotal;

    if (orderCurrency !== paidCurrency) {
      // Buscar taxa de conversão (mesma API usada na criação)
      try {
        const ratesResponse = await fetch('https://api.exchangerate-api.com/v4/latest/BRL');
        const ratesData = await ratesResponse.json();
        const rate = ratesData.rates[paidCurrency] || (paidCurrency === 'USD' ? 0.2 : 0.18);
        expectedAmountInPayPal = orderTotal * rate;
      } catch {
        console.error('[PayPal Capture] ⚠️ Erro ao buscar taxa, usando fallback');
        const fallbackRate = paidCurrency === 'USD' ? 0.2 : 0.18;
        expectedAmountInPayPal = orderTotal * fallbackRate;
      }
    }

    // Permitir diferença de até 5% por variação cambial
    const tolerance = expectedAmountInPayPal * 0.05;
    const difference = Math.abs(expectedAmountInPayPal - paidAmount);

    if (difference > tolerance) {
      console.error(`⚠️ ALERTA DE SEGURANÇA: Valores muito diferentes!`);
      console.error(`  - Esperado: ${expectedAmountInPayPal.toFixed(2)} ${paidCurrency}`);
      console.error(`  - Recebido: ${paidAmount.toFixed(2)} ${paidCurrency}`);
      console.error(
        `  - Diferença: ${difference.toFixed(2)} (tolerância: ${tolerance.toFixed(2)})`
      );

      // NÃO BLOQUEAR - apenas alertar, pois taxas de câmbio variam
      console.warn('⚠️ Continuando captura apesar da diferença (variação cambial possível)');
    } else {
      console.log(
        `✅ Valores conferem (diferença: ${difference.toFixed(4)} - dentro da tolerância)`
      );
    }

    // 3. Atualizar pedido para "completed"
    const updatedOrders = await db
      .update(orders)
      .set({
        status: 'completed',
        paymentStatus: 'paid', // ✅ IGUAL AO STRIPE
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))
      .returning();

    const updatedOrder = updatedOrders[0];

    // ✅ INCREMENTAR CONTADOR DO CUPOM (se houver)
    if (updatedOrder.couponCode) {
      try {
        await db
          .update(coupons)
          .set({
            usedCount: sql`${coupons.usedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(coupons.code, updatedOrder.couponCode));

        // ✅ REGISTRAR USO DO CUPOM PELO USUÁRIO
        if (updatedOrder.userId) {
          const [couponData] = await db
            .select()
            .from(coupons)
            .where(eq(coupons.code, updatedOrder.couponCode))
            .limit(1);

          if (couponData) {
            await db.insert(couponRedemptions).values({
              couponId: couponData.id,
              userId: updatedOrder.userId,
              orderId: updatedOrder.id,
              amountDiscounted: updatedOrder.discountAmount || '0',
            });

            console.log(
              `📝 Registro de resgate do cupom criado para userId: ${updatedOrder.userId}`
            );
          }
        }
      } catch (err) {
        console.error('Erro ao incrementar contador do cupom:', err);
      }
    }

    // 4. 🚀 ENVIAR E-MAIL DE CONFIRMAÇÃO
    if (updatedOrder.email) {
      try {
        // ✅ USAR O MESMO ENDPOINT QUE OS WEBHOOKS (envia email com links + notificações)
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.NEXTAUTH_URL ||
          'https://arafacriou.com.br';

        const confirmationResponse = await fetch(`${baseUrl}/api/orders/send-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: updatedOrder.id,
          }),
        });

        if (confirmationResponse.ok) {
          console.log(
            '✅ [PayPal Capture] Email de confirmação com links enviado via /api/orders/send-confirmation'
          );
        } else {
          const errorData = await confirmationResponse.json();
          console.error('❌ [PayPal Capture] Erro ao enviar confirmação:', errorData);
        }
      } catch (emailError) {
        console.error('⚠️ [PayPal Capture] Erro ao enviar email:', emailError);
      }
    }

    return Response.json({
      success: true,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatApiError('INVALID_PAYLOAD', 'Dados inválidos', error.issues, 400);
    }
    console.error('Erro ao capturar PayPal Order:', error);
    // Log extracted details if present (use typed cast for safety)
    try {
      const errObj = error as unknown as { payload?: unknown };
      if (errObj.payload) {
        console.error('[PayPal Capture] payload:', JSON.stringify(errObj.payload));
      }
    } catch (e) {
      /* ignore */
    }

    const errMessage = String(error);
    // Try to extract structured payload from known error shape
    let extractedDetails: unknown = undefined;
    let detectedAlreadyCaptured = false;
    try {
      if (error && typeof error === 'object') {
        const e = error as unknown as { payload?: unknown; message?: string };
        if (e.payload) {
          extractedDetails = e.payload;
          try {
            const p = e.payload as Record<string, unknown> | undefined;
            const name = p?.name as string | undefined;
            const detailsArr = Array.isArray(p?.details) ? (p?.details as unknown[]) : [];
            if (
              name === 'UNPROCESSABLE_ENTITY' &&
              detailsArr.some((d: unknown) =>
                String((d as Record<string, unknown>)?.issue || '')
                  .toUpperCase()
                  .includes('ORDER_ALREADY_CAPTURED')
              )
            ) {
              detectedAlreadyCaptured = true;
            }
          } catch (pe) {
            // ignore
          }
        } else if (e.message && e.message.includes('PayPal capture failed:')) {
          // Try to pull JSON from the default error message
          const m: string = e.message;
          const jsonPart = m.substring(m.indexOf('{'));
          try {
            extractedDetails = JSON.parse(jsonPart);
          } catch (e) {
            // not JSON, keep raw message
            extractedDetails = m;
          }
        }
      }
    } catch (e) {
      // ignore extraction errors
    }
    // Tratamento específico para ordens já capturadas - considerar como sucesso
    if (
      errMessage.includes('ORDER_ALREADY_CAPTURED') ||
      errMessage.includes('order is already captured') ||
      errMessage.includes('Capture failed') ||
      detectedAlreadyCaptured
    ) {
      console.warn(
        '[PayPal Capture] Detected already captured order, attempting to mark DB order as completed'
      );

      try {
        // tentar marcar pedido no DB como completo caso ainda esteja pendente
        const [foundOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.paypalOrderId, orderId ?? ''))
          .limit(1);
        if (
          foundOrder &&
          !(foundOrder.status === 'completed' && foundOrder.paymentStatus === 'paid')
        ) {
          await db
            .update(orders)
            .set({
              status: 'completed',
              paymentStatus: 'paid',
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(orders.id, foundOrder.id));
          console.log('[PayPal Capture] DB order marked as completed for paypalOrderId', orderId);
        }
      } catch (updateErr) {
        console.error(
          '[PayPal Capture] Erro ao marcar pedido como completo ao tratar already captured:',
          updateErr
        );
      }

      return Response.json({ success: true, orderId: orderId, alreadyCaptured: true });
    }
    return formatApiError(
      'INTERNAL_ERROR',
      'Erro interno do servidor',
      extractedDetails || { message: errMessage },
      500
    );
  }
}
