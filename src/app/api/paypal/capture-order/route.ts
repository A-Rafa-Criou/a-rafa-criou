import { NextRequest } from 'next/server';
import { z } from 'zod';
import { capturePayPalOrder } from '@/lib/paypal';
import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  files,
  coupons,
  couponRedemptions,
  productVariations,
} from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { resend, FROM_EMAIL } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';
import { getR2SignedUrl } from '@/lib/r2-utils';
import { sendOrderConfirmation } from '@/lib/notifications/helpers';

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

    // 4. Buscar itens do pedido
    const orderItemsData = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, updatedOrder.id));

    // 5. 🚀 ENVIAR E-MAIL DE CONFIRMAÇÃO
    if (updatedOrder.email) {
      try {
        // Gerar URLs assinadas para cada produto
        const productsWithDownloadUrls = await Promise.all(
          orderItemsData.map(async item => {
            let downloadUrl = '';
            let variationName: string | undefined;

            // Priorizar arquivo da variação
            if (item.variationId) {
              const byVar = await db
                .select({ filePath: files.path })
                .from(files)
                .where(eq(files.variationId, item.variationId))
                .limit(1);

              if (byVar.length > 0 && byVar[0]?.filePath) {
                downloadUrl = await getR2SignedUrl(byVar[0].filePath, 15 * 60);
              }

              // Buscar nome da variação
              const [variation] = await db
                .select({ name: productVariations.name })
                .from(productVariations)
                .where(eq(productVariations.id, item.variationId))
                .limit(1);

              if (variation) {
                variationName = variation.name;
              }
            }

            // Fallback para arquivo do produto
            if (!downloadUrl && item.productId) {
              const byProd = await db
                .select({ filePath: files.path })
                .from(files)
                .where(eq(files.productId, item.productId))
                .limit(1);

              if (byProd.length > 0 && byProd[0]?.filePath) {
                downloadUrl = await getR2SignedUrl(byProd[0].filePath, 15 * 60);
              }
            }

            return {
              name: item.name,
              variationName,
              price: parseFloat(item.price),
              downloadUrl,
            };
          })
        );

        // Renderizar e enviar e-mail
        const emailHtml = await render(
          PurchaseConfirmationEmail({
            customerName: captureData.payer?.name?.given_name || 'Cliente',
            orderId: updatedOrder.id,
            orderDate: new Date().toLocaleDateString('pt-BR'),
            products: productsWithDownloadUrls,
            totalAmount: parseFloat(updatedOrder.total),
          })
        );

        await resend.emails.send({
          from: FROM_EMAIL,
          to: updatedOrder.email,
          subject: `✅ Pedido Confirmado #${updatedOrder.id.slice(0, 8)} - A Rafa Criou`,
          html: emailHtml,
        });

        // 🔔 ENVIAR NOTIFICAÇÕES (Email + Web Push)
        if (updatedOrder.userId) {
          // Determinar símbolo da moeda
          const currency = (updatedOrder.currency || 'BRL').toUpperCase();
          const currencySymbols: Record<string, string> = {
            BRL: 'R$',
            USD: '$',
            EUR: '€',
            MXN: 'MEX$',
          };
          const symbol = currencySymbols[currency] || currency;

          // Calcular valor em BRL se não for BRL
          let orderTotalBRL: string | undefined;
          if (currency !== 'BRL') {
            // Taxas atualizadas (valores mais próximos da realidade)
            const rates: Record<string, number> = {
              USD: 5.33,
              EUR: 5.85,
              MXN: 0.29,
            };
            const rate = rates[currency] || 1;
            const totalBRL = parseFloat(updatedOrder.total) * rate;
            orderTotalBRL = `R$ ${totalBRL.toFixed(2)}`;
          }

          await sendOrderConfirmation({
            userId: updatedOrder.userId,
            customerName: captureData.payer?.name?.given_name || 'Cliente',
            customerEmail: captureData.payer?.email_address || updatedOrder.email || undefined,
            orderId: updatedOrder.id,
            orderTotal: `${symbol} ${parseFloat(updatedOrder.total).toFixed(2)}`,
            orderTotalBRL,
            orderItems: productsWithDownloadUrls.map(p => ({
              name: p.name,
              variationName: p.variationName,
              quantity: 1,
              price: `${symbol} ${p.price.toFixed(2)}`,
            })),
            orderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/conta/pedidos/${updatedOrder.id}`,
          });
          console.log('✅ Notificações enviadas (Email + Web Push)');
        }
      } catch (emailError) {
        console.error('⚠️ Erro ao enviar email:', emailError);
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
    try {
      if (error && typeof error === 'object') {
        const e = error as unknown as { payload?: unknown; message?: string };
        if (e.payload) {
          extractedDetails = e.payload;
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
      errMessage.includes('Capture failed')
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
