import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPayPalOrder } from '@/lib/paypal';
import { db } from '@/lib/db';
import { products, productVariations, coupons } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { getActivePromotionForVariation, calculatePromotionalPrice } from '@/lib/promotions';
import { cookies } from 'next/headers';
import { associateOrderToAffiliate } from '@/lib/affiliates/webhook-processor';

const createPayPalOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variationId: z.string().uuid().optional(),
      quantity: z.number().int().min(1),
    })
  ),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  couponCode: z.string().optional().nullable(),
  discount: z.number().optional(),
  currency: z.enum(['BRL', 'USD', 'EUR', 'MXN']).default('BRL'), // Nova validação de moeda (inclui MXN)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { items, userId, email, couponCode, discount, currency } =
      createPayPalOrderSchema.parse(body);

    const productIds = [...new Set(items.map(item => item.productId))];
    const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));

    if (dbProducts.length !== productIds.length) {
      return Response.json({ error: 'Um ou mais produtos não encontrados' }, { status: 400 });
    }

    // 2. Buscar variações (se houver)
    const variationIds = items
      .map(item => item.variationId)
      .filter((id): id is string => id !== undefined);

    const dbVariations =
      variationIds.length > 0
        ? await db
            .select()
            .from(productVariations)
            .where(inArray(productVariations.id, variationIds))
        : [];

    // 3. Calcular total REAL (preços do banco COM PROMOÇÃO)
    let total = 0;
    const calculationDetails: Array<{
      name: string;
      price: number;
      promotionalPrice: number;
      quantity: number;
      promotion?: string;
    }> = [];

    for (const item of items) {
      let itemPrice = 0;
      let itemPriceWithPromo = 0;
      let itemName = '';
      let promotionName: string | undefined;

      if (item.variationId) {
        const variation = dbVariations.find(v => v.id === item.variationId);
        if (!variation) {
          return Response.json(
            { error: `Variação ${item.variationId} não encontrada` },
            { status: 400 }
          );
        }

        // Calcular preço com promoção
        const basePrice = Number(variation.price);
        const promotion = await getActivePromotionForVariation(item.variationId);
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);

        itemPrice = basePrice; // Preço original
        itemPriceWithPromo = priceInfo.finalPrice; // PREÇO COM PROMOÇÃO
        promotionName = priceInfo.promotion?.name;

        const product = dbProducts.find(p => p.id === item.productId);
        itemName = `${product?.name || 'Produto'} - ${variation.name}`;
      } else {
        // Produtos sem variação não são permitidos
        return Response.json(
          { error: `Variação é obrigatória para o produto ${item.productId}` },
          { status: 400 }
        );
      }

      const itemTotal = itemPriceWithPromo * item.quantity;
      total += itemTotal;

      calculationDetails.push({
        name: itemName,
        price: itemPrice,
        promotionalPrice: itemPriceWithPromo,
        quantity: item.quantity,
        promotion: promotionName,
      });
    }

    // 3.5. Aplicar desconto de cupom se fornecido
    let finalTotal = total;
    let appliedDiscount = 0;

    if (couponCode && discount && discount > 0) {
      const [coupon] = await db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1);

      if (!coupon) {
        return Response.json({ error: 'Cupom inválido' }, { status: 400 });
      }

      if (!coupon.isActive) {
        return Response.json({ error: 'Cupom não está ativo' }, { status: 400 });
      }

      const now = new Date();
      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return Response.json({ error: 'Cupom ainda não está válido' }, { status: 400 });
      }
      if (coupon.endsAt && new Date(coupon.endsAt) < now) {
        return Response.json({ error: 'Cupom expirado' }, { status: 400 });
      }

      if (coupon.minSubtotal && total < Number(coupon.minSubtotal)) {
        return Response.json(
          {
            error: `Valor mínimo de R$ ${Number(coupon.minSubtotal).toFixed(2)} não atingido`,
          },
          { status: 400 }
        );
      }

      appliedDiscount = discount; // JÁ vem convertido do frontend
      finalTotal = total - appliedDiscount;
    }

    if (finalTotal <= 0) {
      return Response.json({ error: 'Total inválido após desconto' }, { status: 400 });
    }

    // 🔄 CONVERTER PARA MOEDA DESTINO (se não for BRL)
    let finalTotalConverted = finalTotal;

    if (currency !== 'BRL') {
      // Buscar taxa de câmbio atual (mesma API que frontend)
      try {
        const ratesResponse = await fetch('https://api.exchangerate-api.com/v4/latest/BRL');
        const ratesData = await ratesResponse.json();
        const rate = ratesData.rates[currency] || (currency === 'USD' ? 0.2 : 0.18);

        finalTotalConverted = finalTotal * rate;
      } catch (error) {
        console.error('[PayPal] ⚠️ Erro ao buscar taxa de câmbio, usando fallback', error);
        const fallbackRate = currency === 'USD' ? 0.2 : 0.18;
        finalTotalConverted = finalTotal * fallbackRate;
      }
    }

    // Mínimos do PayPal por moeda
    const minimums: Record<string, number> = {
      BRL: 0.5, // R$ 0,50
      USD: 0.01, // $0.01
      EUR: 0.01, // €0.01
      MXN: 1.0, // MEX$ 1.00 minimum
    };

    const minimum = minimums[currency] || 0.01;

    if (finalTotalConverted < minimum) {
      const symbols: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' };
      return Response.json(
        {
          error: `Total muito baixo para PayPal (mínimo ${symbols[currency]}${minimum.toFixed(2)})`,
          details: calculationDetails,
        },
        { status: 400 }
      );
    }

    // 4. Criar Order no PayPal na moeda selecionada COM VALOR CONVERTIDO
    const requestOrigin = new URL(req.url).origin;
    const APP_URL =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      requestOrigin ||
      'https://arafacriou.com.br';
    let paypalOrder;
    let currencyUsed = currency;
    try {
      paypalOrder = await createPayPalOrder(finalTotalConverted, currency, APP_URL);
      // verify created currency as sanity check
      try {
        const { getPayPalOrderDetails } = await import('@/lib/paypal');
        const orderDetails = await getPayPalOrderDetails(paypalOrder.id);
        const createdCurrency = orderDetails?.purchase_units?.[0]?.amount?.currency_code;
        if (createdCurrency && createdCurrency !== currency) {
          currencyUsed = createdCurrency;
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // If PayPal returned an error, check if it indicates that the merchant does not accept the currency
      const err = e as Error & { payload?: unknown };
      let errDetails: unknown | undefined = undefined;
      try {
        if (err.payload) {
          errDetails = err.payload;
        }
      } catch (_) {
        // ignore
      }

      const payloadStr =
        typeof errDetails === 'object'
          ? JSON.stringify(errDetails)
          : String(errDetails || err.message);
      const currencyIssueDetected =
        payloadStr.toLowerCase().includes('currency') ||
        payloadStr.toLowerCase().includes('not accept') ||
        payloadStr.toLowerCase().includes('moeda') ||
        payloadStr.toLowerCase().includes('currency_not_supported') ||
        payloadStr.toLowerCase().includes('invalid_currency');
      const fallbackEnabled = process.env.PAYPAL_FALLBACK_TO_BRL?.toLowerCase() === 'true';
      if (currencyIssueDetected && currency !== 'BRL') {
        if (fallbackEnabled) {
          // try creating in BRL
          try {
            console.warn(
              '[PayPal] currency not accepted by merchant, fallback to BRL enabled, creating order in BRL'
            );
            currencyUsed = 'BRL';
            finalTotalConverted = finalTotal; // in BRL
            paypalOrder = await createPayPalOrder(finalTotalConverted, 'BRL', APP_URL);
          } catch (e2) {
            console.error('[PayPal] fallback to BRL failed', e2);
            return Response.json(
              {
                error: 'CURRENCY_NOT_ACCEPTED',
                message: 'Vendedor não aceita a moeda selecionada',
                details: payloadStr,
              },
              { status: 400 }
            );
          }
        } else {
          return Response.json(
            {
              error: 'CURRENCY_NOT_ACCEPTED',
              message: 'Vendedor não aceita a moeda selecionada',
              details: payloadStr,
            },
            { status: 400 }
          );
        }
      } else {
        // Non-currency issue — bubble the original error message
        console.error('[PayPal] create order error:', e);
        return Response.json(
          {
            error: 'PAYPAL_CREATE_ORDER_FAILED',
            message: String(err.message),
            details: payloadStr,
          },
          { status: 500 }
        );
      }
    }

    // 5. Criar pedido "pending" no banco (será completado no webhook)
    const { orders: ordersTable, orderItems } = await import('@/lib/db/schema');

    const createdOrders = await db
      .insert(ordersTable)
      .values({
        userId: userId || null,
        email: email || '',
        status: 'pending',
        subtotal: total.toString(),
        discountAmount: appliedDiscount.toString(),
        total: finalTotal.toString(),
        currency: currencyUsed, // Salvar a moeda efetivamente usada no pedido
        paymentProvider: 'paypal',
        paymentId: paypalOrder.id,
        paypalOrderId: paypalOrder.id, // Para idempotência
        paymentStatus: 'pending',
        ...(couponCode && { couponCode }),
      })
      .returning();

    const createdOrder = createdOrders[0];

    // 6. Criar itens do pedido
    for (const item of items) {
      let nomeProduto = 'Produto';
      let precoComPromocao = 0;

      if (item.variationId) {
        const product = dbProducts.find(p => p.id === item.productId);
        const variation = dbVariations.find(v => v.id === item.variationId);

        if (product && variation) {
          nomeProduto = product.name;

          // ✅ CALCULAR PREÇO PROMOCIONAL NOVAMENTE
          const basePrice = Number(variation.price);
          const promotion = await getActivePromotionForVariation(item.variationId);
          const priceInfo = calculatePromotionalPrice(basePrice, promotion);
          precoComPromocao = priceInfo.finalPrice; // USAR PREÇO COM PROMOÇÃO
        }
      } else {
        // Produtos sem variação não são permitidos - isto não deveria acontecer
        throw new Error(`Produto ${item.productId} sem variação especificada`);
      }

      // ✅ USAR PREÇO PROMOCIONAL ao invés do preço base
      const precoNumerico = precoComPromocao;
      let precoConvertido = precoNumerico;

      if (currency !== 'BRL' && finalTotal > 0) {
        // Calcular taxa de conversão a partir do total
        const conversionRate = finalTotalConverted / finalTotal;
        precoConvertido = precoNumerico * conversionRate;
      }

      const itemSubtotal = precoConvertido * item.quantity;
      let itemTotal = itemSubtotal;

      if (appliedDiscount > 0 && total > 0) {
        // Desconto proporcional já em moeda convertida
        const convertedSubtotal =
          total * (currency !== 'BRL' ? finalTotalConverted / finalTotal : 1);
        const convertedDiscount =
          appliedDiscount * (currency !== 'BRL' ? finalTotalConverted / finalTotal : 1);
        const proportionalDiscount = (itemSubtotal / convertedSubtotal) * convertedDiscount;
        itemTotal = itemSubtotal - proportionalDiscount;
      }

      await db.insert(orderItems).values({
        orderId: createdOrder.id,
        productId: item.productId,
        variationId: item.variationId,
        name: nomeProduto,
        price: precoConvertido.toFixed(2), // ✅ Preço convertido
        quantity: item.quantity,
        total: itemTotal.toFixed(2),
      });
    }

    // 🔗 ASSOCIAR PEDIDO AO AFILIADO (se existir cookie)
    try {
      const cookieStore = await cookies();
      const affiliateCode = cookieStore.get('affiliate_code')?.value || null;
      const affiliateClickId = cookieStore.get('affiliate_click_id')?.value || null;

      if (affiliateCode || affiliateClickId) {
        await associateOrderToAffiliate(createdOrder.id, affiliateCode, affiliateClickId);
        console.log('[PayPal] ✅ Pedido associado ao afiliado:', affiliateCode);
      }
    } catch (affiliateError) {
      // Não bloquear criação do pedido se falhar tracking de afiliado
      console.error('[PayPal] ⚠️ Erro ao associar afiliado:', affiliateError);
    }

    // Retornar PayPal Order ID para o frontend
    return Response.json({
      orderId: paypalOrder.id,
      dbOrderId: createdOrder.id,
      currencyUsed,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 });
    }

    console.error('Erro ao criar PayPal Order:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
