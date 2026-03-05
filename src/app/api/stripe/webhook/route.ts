import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  products,
  productVariations,
  coupons,
  couponRedemptions,
  productI18n,
} from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getActivePromotions, calculatePromotionalPrice } from '@/lib/db/products';
import {
  createCommissionForPaidOrder,
  associateOrderToAffiliate,
} from '@/lib/affiliates/webhook-processor';
import { grantFileAccessForOrder } from '@/lib/affiliates/file-access-processor';

export async function POST(req: NextRequest) {
  console.log('[Stripe Webhook] 📥 Webhook recebido em', new Date().toISOString());

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] ❌ Header stripe-signature ausente');
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  // Verificar se o webhook secret está configurado
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error(
      '[Stripe Webhook] ❌ STRIPE_WEBHOOK_SECRET não está configurada nas variáveis de ambiente!'
    );
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('[Stripe Webhook] ✅ Assinatura verificada com sucesso');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Stripe Webhook] ❌ Falha na verificação da assinatura:', errorMessage);
    console.error(
      '[Stripe Webhook] 🔑 Webhook secret começa com:',
      process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...'
    );
    console.error('[Stripe Webhook] 📝 Signature header:', signature.substring(0, 30) + '...');
    console.error(
      '[Stripe Webhook] 💡 DICA: Se você trocou de conta Stripe (ex: pessoal → empresarial), o STRIPE_WEBHOOK_SECRET precisa ser atualizado no Vercel com o novo whsec_ da conta empresarial.'
    );
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  console.log(`[Stripe Webhook] 📋 Evento recebido: ${event.type} | ID: ${event.id}`);

  // Processar evento: payment_intent.succeeded
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(
      `[Stripe Webhook] 💳 PaymentIntent: ${paymentIntent.id} | Amount: ${paymentIntent.amount} ${paymentIntent.currency} | Status: ${paymentIntent.status}`
    );
    console.log(`[Stripe Webhook] 📦 Metadata:`, JSON.stringify(paymentIntent.metadata, null, 2));

    try {
      // Parsear metadata - formato compacto: "varId1:qty1,varId2:qty2"
      let items: Array<{ productId?: string; variationId: string; quantity: number }> = [];

      const itemsMetadata = paymentIntent.metadata.items || '';
      if (itemsMetadata.includes(':')) {
        // Novo formato compacto
        items = itemsMetadata.split(',').map(item => {
          const [variationId, quantity] = item.split(':');
          return { variationId, quantity: parseInt(quantity, 10) };
        });
      } else {
        // Fallback para formato antigo (JSON) - manter compatibilidade
        try {
          items = JSON.parse(itemsMetadata);
        } catch {
          items = [];
        }
      }

      const userId =
        paymentIntent.metadata.userId === 'guest' ? null : paymentIntent.metadata.userId || null;
      const customerEmail =
        paymentIntent.receipt_email ||
        paymentIntent.metadata.customer_email ||
        paymentIntent.metadata.email ||
        '';

      console.log(
        `[Stripe Webhook] 👤 userId: ${userId || 'guest'} | email: ${customerEmail || 'N/A'} | items count: ${items.length}`
      );

      if (items.length === 0) {
        console.error(
          '[Stripe Webhook] ⚠️ ALERTA: Nenhum item encontrado no metadata! metadata.items:',
          paymentIntent.metadata.items
        );
      }

      // 🔍 Buscar pedido pendente existente (criado no create-pix)
      const existingOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
        .limit(1);

      let order;
      const orderItemsData: Array<{
        id: string;
        productId?: string | null;
        productName: string;
        variationName: string;
        price: number;
        quantity: number;
        variationId: string | null;
      }> = [];

      console.log(`[Stripe Webhook] 🔍 Pedidos existentes encontrados: ${existingOrders.length}`);

      if (existingOrders.length > 0) {
        // ✅ ATUALIZAR pedido existente para "completed"
        const existingOrder = existingOrders[0];
        console.log(
          `[Stripe Webhook] 📋 Pedido existente: ${existingOrder.id} | Status: ${existingOrder.status} | Total: ${existingOrder.total}`
        );

        // ✅ IDEMPOTÊNCIA: Se pedido já está completed, não reprocessar
        if (existingOrder.status === 'completed') {
          console.log(`✅ Pedido ${existingOrder.id} já processado - ignorando evento duplicado`);
          return Response.json({ received: true, message: 'Already processed' });
        }

        // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar integridade dos valores
        const orderTotal = parseFloat(existingOrder.total);
        const paidAmount = paymentIntent.amount / 100;

        // Permitir diferença de até 0.01 (arredondamento)
        if (Math.abs(orderTotal - paidAmount) > 0.01) {
          console.error(`⚠️ ALERTA DE SEGURANÇA: Valores não conferem!`);

          // Não atualizar pedido se valores não conferem
          return Response.json(
            {
              error: 'Valores não conferem',
              received: false,
            },
            { status: 400 }
          );
        }

        const updatedOrders = await db
          .update(orders)
          .set({
            status: 'completed', // ⚠️ pending → completed
            paymentStatus: 'paid',
            paidAt: new Date(),
          })
          .where(eq(orders.id, existingOrder.id))
          .returning();

        order = updatedOrders[0];
        console.log(`[Stripe Webhook] ✅ Pedido atualizado para completed: ${order.id}`);

        // ✅ INCREMENTAR CONTADOR DO CUPOM (se houver)
        if (order.couponCode) {
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
          } catch (err) {
            console.error('Erro ao incrementar contador do cupom:', err);
          }
        }

        // Buscar itens do pedido já criados
        const existingItems = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        // Converter para formato esperado pelo email
        for (const item of existingItems) {
          orderItemsData.push({
            id: item.id,
            productId: item.productId,
            productName: item.name,
            variationName: '', // Já está no name
            price: parseFloat(item.price),
            quantity: item.quantity,
            variationId: item.variationId,
          });
        }
      } else {
        // Extrair dados do cupom dos metadados
        const couponCode = paymentIntent.metadata.couponCode || null;

        // ✅ Usar valores CONVERTIDOS do metadata
        const convertedTotal = paymentIntent.metadata.convertedTotal
          ? parseFloat(paymentIntent.metadata.convertedTotal)
          : paymentIntent.amount / 100;

        // Calcular subtotal e desconto convertidos
        let convertedSubtotal = convertedTotal;
        let convertedDiscount = 0;

        if (
          paymentIntent.metadata.discount &&
          paymentIntent.metadata.finalTotal &&
          paymentIntent.metadata.originalTotal
        ) {
          const discountBRL = parseFloat(paymentIntent.metadata.discount);
          const finalTotalBRL = parseFloat(paymentIntent.metadata.finalTotal);

          // Calcular proporção: se desconto BRL é 5 e final BRL é 40,
          // então desconto convertido = convertedTotal * (5/40)
          if (finalTotalBRL > 0) {
            convertedDiscount = (discountBRL / finalTotalBRL) * convertedTotal;
            convertedSubtotal = convertedTotal + convertedDiscount;
          }
        }

        const newOrders = await db
          .insert(orders)
          .values({
            userId,
            email: customerEmail,
            status: 'completed',
            subtotal: convertedSubtotal.toFixed(2),
            discountAmount: convertedDiscount.toFixed(2),
            total: convertedTotal.toFixed(2),
            currency: paymentIntent.currency.toUpperCase(),
            paymentProvider: 'stripe',
            paymentId: paymentIntent.id,
            stripePaymentIntentId: paymentIntent.id,
            paymentStatus: 'paid',
            paidAt: new Date(),
            ...(couponCode && { couponCode }),
          })
          .returning();

        order = newOrders[0];
        console.log(
          `[Stripe Webhook] ✅ Novo pedido criado: ${order.id} | Total: ${order.total} ${order.currency}`
        );

        // 🔗 ASSOCIAR PEDIDO AO AFILIADO (se tiver no metadata)
        try {
          const affiliateCode = paymentIntent.metadata.affiliateCode || null;
          const affiliateClickId = paymentIntent.metadata.affiliateClickId || null;

          if (affiliateCode || affiliateClickId) {
            await associateOrderToAffiliate(order.id, affiliateCode, affiliateClickId);
            console.log('[Stripe Webhook] ✅ Pedido associado ao afiliado:', affiliateCode);
          }
        } catch (affiliateError) {
          console.error('[Stripe Webhook] ⚠️ Erro ao associar afiliado:', affiliateError);
        }

        // ✅ INCREMENTAR CONTADOR DO CUPOM (se houver)
        if (couponCode) {
          try {
            await db
              .update(coupons)
              .set({
                usedCount: sql`${coupons.usedCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(coupons.code, couponCode));

            // ✅ REGISTRAR USO DO CUPOM PELO USUÁRIO
            if (userId) {
              const [couponData] = await db
                .select()
                .from(coupons)
                .where(eq(coupons.code, couponCode))
                .limit(1);

              if (couponData) {
                await db.insert(couponRedemptions).values({
                  couponId: couponData.id,
                  userId: userId,
                  orderId: order.id,
                  amountDiscounted: convertedDiscount.toFixed(2),
                });
              }
            }
          } catch (err) {
            console.error('Erro ao incrementar contador do cupom:', err);
          }
        }

        // Buscar promoções ativas UMA VEZ (cache)
        const promotionsMap = await getActivePromotions();
        const { variationPromotions, productPromotions, globalPromotion } = promotionsMap;

        // Criar itens do pedido apenas se for um novo pedido
        for (const item of items) {
          // Buscar variação primeiro (necessário para preço e productId)
          if (!item.variationId) {
            console.error('❌ Item sem variationId:', item);
            continue;
          }

          const [variation] = await db
            .select({
              id: productVariations.id,
              name: productVariations.name,
              price: productVariations.price,
              productId: productVariations.productId,
            })
            .from(productVariations)
            .where(eq(productVariations.id, item.variationId))
            .limit(1);

          if (!variation) {
            console.error('❌ Variação não encontrada:', item.variationId);
            continue;
          }

          // Buscar produto
          const [product] = await db
            .select({
              id: products.id,
              name: products.name,
            })
            .from(products)
            .where(eq(products.id, variation.productId))
            .limit(1);

          if (!product) {
            console.error('❌ Produto não encontrado:', variation.productId);
            continue;
          }

          // Buscar tradução se locale não for 'pt'
          const locale = paymentIntent.metadata.locale || 'pt';
          let productName = product.name;

          if (locale !== 'pt') {
            const [translation] = await db
              .select({ translatedName: productI18n.name })
              .from(productI18n)
              .where(and(eq(productI18n.productId, product.id), eq(productI18n.locale, locale)))
              .limit(1);

            if (translation?.translatedName) {
              productName = translation.translatedName;
            }
          }

          const basePrice = parseFloat(variation.price);

          // ✅ APLICAR PREÇO PROMOCIONAL COM CACHE - prioridade: variação > produto > global
          const promotion =
            variationPromotions.get(item.variationId) ||
            productPromotions.get(variation.productId) ||
            globalPromotion ||
            undefined;
          const priceInfo = calculatePromotionalPrice(basePrice, promotion);
          const itemPrice = priceInfo.finalPrice; // Usar preço com promoção

          // ✅ CONVERTER preço do item para a moeda do pedido
          const orderCurrency = paymentIntent.currency.toUpperCase();
          let itemPriceConverted = itemPrice; // BRL por padrão

          if (orderCurrency !== 'BRL' && paymentIntent.metadata.finalTotal && convertedTotal > 0) {
            // Calcular taxa de conversão a partir do total
            const finalTotalBRL = parseFloat(paymentIntent.metadata.finalTotal);
            const conversionRate = convertedTotal / finalTotalBRL;
            itemPriceConverted = itemPrice * conversionRate;
          }

          const itemSubtotal = itemPriceConverted * item.quantity;

          // Se houver desconto, aplicar proporcionalmente ao item
          let itemTotal = itemSubtotal;
          if (convertedDiscount > 0 && convertedSubtotal > 0) {
            // Calcular desconto proporcional: (subtotal_item / subtotal_total) * desconto_total
            const proportionalDiscount = (itemSubtotal / convertedSubtotal) * convertedDiscount;
            itemTotal = itemSubtotal - proportionalDiscount;
          }

          const createdItems = await db
            .insert(orderItems)
            .values({
              orderId: order.id,
              productId: variation.productId,
              variationId: item.variationId || null,
              name: productName,
              quantity: item.quantity,
              price: itemPriceConverted.toFixed(2), // ✅ Preço convertido
              total: itemTotal.toFixed(2),
            })
            .returning();

          const createdItem = createdItems[0];

          orderItemsData.push({
            id: createdItem.id,
            productId: createdItem.productId,
            productName: productName,
            variationName: '',
            price: itemPrice,
            quantity: item.quantity,
            variationId: item.variationId,
          });
        }
      }

      // 🚀 ENVIAR E-MAIL DE CONFIRMAÇÃO usando endpoint centralizado
      if (customerEmail) {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || 'https://arafacriou.com.br';
          const response = await fetch(`${baseUrl}/api/orders/send-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao enviar email: ${response.status} - ${errorText}`);
          }
        } catch (emailErr) {
          console.error(
            '[Stripe Webhook] ⚠️ Erro ao enviar email de confirmação:',
            emailErr instanceof Error ? emailErr.message : emailErr
          );
        }
      }

      // 💰 PROCESSAR COMISSÃO DE AFILIADO (se houver)
      try {
        const isDestinationCharge = paymentIntent.metadata.destinationCharge === 'true';
        // Buscar transfer ID se for destination charge (Stripe cria automaticamente)
        let destinationTransferId: string | undefined;
        if (isDestinationCharge && paymentIntent.latest_charge) {
          try {
            const chargeId =
              typeof paymentIntent.latest_charge === 'string'
                ? paymentIntent.latest_charge
                : paymentIntent.latest_charge.id;
            const charge = await stripe.charges.retrieve(chargeId);
            if (charge.transfer && typeof charge.transfer === 'string') {
              destinationTransferId = charge.transfer;
            }
          } catch (transferLookupErr) {
            console.error(
              '[Stripe Webhook] ⚠️ Erro ao buscar transfer de destination charge:',
              transferLookupErr instanceof Error ? transferLookupErr.message : transferLookupErr
            );
          }
        }
        await createCommissionForPaidOrder(order.id, isDestinationCharge, destinationTransferId);
      } catch (affiliateError) {
        console.error('⚠️ Erro ao processar comissão de afiliado:', affiliateError);
        // Não bloquear o webhook se a comissão falhar
      }

      // 📁 CONCEDER ACESSO A ARQUIVOS (licença comercial)
      try {
        await grantFileAccessForOrder(order.id);
      } catch (fileAccessError) {
        console.error('⚠️ Erro ao conceder acesso a arquivos:', fileAccessError);
        // Não bloquear o webhook se o acesso falhar
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('❌ Erro ao processar webhook:', errorMessage);
      console.error('❌ Stack:', errorStack);
      console.error('❌ PaymentIntent ID:', paymentIntent.id);
      console.error('❌ Metadata:', JSON.stringify(paymentIntent.metadata));
      return Response.json({ error: 'Internal error', details: errorMessage }, { status: 500 });
    }
  } else {
    console.log(
      `[Stripe Webhook] ⏭️ Evento ignorado (não é payment_intent.succeeded): ${event.type}`
    );
  }

  console.log('[Stripe Webhook] ✅ Webhook processado com sucesso');
  return Response.json({ received: true });
}
