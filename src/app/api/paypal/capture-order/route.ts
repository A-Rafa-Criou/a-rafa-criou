import { NextRequest } from 'next/server';
import { z } from 'zod';
import { capturePayPalOrder } from '@/lib/paypal';
import { db } from '@/lib/db';
import { orders, orderItems, files, coupons, couponRedemptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { resend, FROM_EMAIL } from '@/lib/email';
import { PurchaseConfirmationEmail } from '@/emails/purchase-confirmation';
import { render } from '@react-email/render';
import { getR2SignedUrl } from '@/lib/r2-utils';

const captureOrderSchema = z.object({
  orderId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = captureOrderSchema.parse(body);

    console.log('[PayPal Capture] 🎯 Capturando ordem:', orderId);

    // 🔒 IDEMPOTÊNCIA: Verificar se ordem já foi capturada
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.paypalOrderId, orderId))
      .limit(1);

    if (existingOrder) {
      if (existingOrder.status === 'completed' && existingOrder.paymentStatus === 'paid') {
        console.log(
          '[PayPal Capture] ✅ Ordem já foi capturada anteriormente - retornando sucesso'
        );
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

    console.log('[PayPal Capture] Status:', captureData.status);

    if (captureData.status !== 'COMPLETED') {
      return Response.json(
        { error: 'Pagamento não foi completado', status: captureData.status },
        { status: 400 }
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
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar integridade dos valores
    const orderTotal = parseFloat(order.total); // Valor em BRL (banco)
    const orderCurrency = order.currency || 'BRL';
    const paidAmount = parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value);
    const paidCurrency = captureData.purchase_units[0].payments.captures[0].amount.currency_code;

    console.log('[PayPal Capture] 🔍 Validação de valores:');
    console.log(`  - Pedido no banco: R$ ${orderTotal.toFixed(2)} (moeda: ${orderCurrency})`);
    console.log(`  - Pago no PayPal: ${paidAmount.toFixed(2)} ${paidCurrency}`);

    // Se moedas forem diferentes, converter para comparação
    let expectedAmountInPayPal = orderTotal;

    if (orderCurrency !== paidCurrency) {
      // Buscar taxa de conversão (mesma API usada na criação)
      try {
        const ratesResponse = await fetch('https://api.exchangerate-api.com/v4/latest/BRL');
        const ratesData = await ratesResponse.json();
        const rate = ratesData.rates[paidCurrency] || (paidCurrency === 'USD' ? 0.2 : 0.18);
        expectedAmountInPayPal = orderTotal * rate;

        console.log(`  - Taxa de conversão: ${rate}`);
        console.log(
          `  - Valor esperado convertido: ${expectedAmountInPayPal.toFixed(2)} ${paidCurrency}`
        );
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
              price: parseFloat(item.price),
              downloadUrl,
            };
          })
        );

        console.log('📦 Produtos com URLs de download:', productsWithDownloadUrls.length);

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
      return Response.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 });
    }

    console.error('Erro ao capturar PayPal Order:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
