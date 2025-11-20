import { NextRequest } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { products, productVariations, coupons } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { getActivePromotionForVariation, calculatePromotionalPrice } from '@/lib/promotions';

const createPaymentIntentSchema = z.object({
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
  currency: z.enum(['USD', 'EUR', 'MXN']).default('USD'), // Stripe aceita USD, EUR e MXN
  locale: z.enum(['pt', 'en', 'es']).optional().default('pt'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { items, userId, email, couponCode, discount, currency, locale } =
      createPaymentIntentSchema.parse(body);

    // 1. Buscar produtos reais do banco (NUNCA confiar no frontend)
    // Usar Set para remover duplicatas quando há várias variações do mesmo produto
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

    // 3. Calcular total REAL COM PREÇOS PROMOCIONAIS (preços do banco)
    let total = 0;
    const calculationDetails: Array<{ name: string; price: number; quantity: number }> = [];

    for (const item of items) {
      let itemPrice = 0;
      let itemName = '';

      if (item.variationId) {
        // Se tem variação, usar preço da variação
        const variation = dbVariations.find(v => v.id === item.variationId);
        if (!variation) {
          console.error('[Stripe] Variação não encontrada:', item.variationId);
          console.error(
            '[Stripe] Variações disponíveis:',
            dbVariations.map(v => v.id)
          );
          return Response.json(
            { error: `Variação ${item.variationId} não encontrada` },
            { status: 400 }
          );
        }

        // ✅ CALCULAR PREÇO PROMOCIONAL
        const basePrice = Number(variation.price);
        const promotion = await getActivePromotionForVariation(item.variationId);
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice; // Usar preço com promoção

        const product = dbProducts.find(p => p.id === item.productId);
        itemName = `${product?.name || 'Produto'} - ${variation.name}`;
      } else {
        // Produtos sem variação não são permitidos
        return Response.json(
          { error: `Variação é obrigatória para o produto ${item.productId}` },
          { status: 400 }
        );
      }

      const itemTotal = itemPrice * item.quantity;
      total += itemTotal;

      calculationDetails.push({
        name: itemName,
        price: itemPrice,
        quantity: item.quantity,
      });
    }

    // 4. Aplicar desconto de cupom se fornecido
    let finalTotal = total;
    let appliedDiscount = 0;

    if (couponCode && discount && discount > 0) {
      // Validar cupom no banco
      const [coupon] = await db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1);

      if (!coupon) {
        return Response.json({ error: 'Cupom inválido' }, { status: 400 });
      }

      // Validar se cupom está ativo
      if (!coupon.isActive) {
        return Response.json({ error: 'Cupom não está ativo' }, { status: 400 });
      }

      // Validar datas
      const now = new Date();
      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return Response.json({ error: 'Cupom ainda não está válido' }, { status: 400 });
      }
      if (coupon.endsAt && new Date(coupon.endsAt) < now) {
        return Response.json({ error: 'Cupom expirado' }, { status: 400 });
      }

      // Validar total mínimo
      if (coupon.minSubtotal && total < Number(coupon.minSubtotal)) {
        return Response.json(
          {
            error: `Valor mínimo de R$ ${Number(coupon.minSubtotal).toFixed(2)} não atingido`,
          },
          { status: 400 }
        );
      }

      // Aplicar desconto (JÁ vem convertido do frontend)
      appliedDiscount = Math.min(discount, total);
      finalTotal = total - appliedDiscount;
    }

    if (finalTotal <= 0) {
      return Response.json({ error: 'Total inválido após desconto' }, { status: 400 });
    }

    // 🔄 CONVERTER PARA MOEDA DESTINO
    let finalTotalConverted = finalTotal;

    // Stripe sempre precisa de conversão pois não aceita BRL
    // Buscar taxa de câmbio atual (mesma API que frontend)
    try {
      const ratesResponse = await fetch('https://api.exchangerate-api.com/v4/latest/BRL');
      const ratesData = await ratesResponse.json();

      // Fallbacks por moeda
      const fallbackRates: Record<string, number> = {
        USD: 0.2,
        EUR: 0.18,
        MXN: 3.4,
      };

      const rate = ratesData.rates[currency] || fallbackRates[currency] || 0.2;
      finalTotalConverted = finalTotal * rate;
    } catch {
      const fallbackRates: Record<string, number> = {
        USD: 0.2,
        EUR: 0.18,
        MXN: 3.4,
      };
      finalTotalConverted = finalTotal * (fallbackRates[currency] || 0.2);
    }

    // Mínimos do Stripe por moeda
    const minimums: Record<string, number> = {
      USD: 0.5, // $0.50
      EUR: 0.5, // €0.50
      MXN: 10.0, // MEX$ 10.00 (mínimo do Stripe para MXN)
    };

    const minimum = minimums[currency] || 0.5;

    if (finalTotalConverted < minimum) {
      const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        MXN: 'MEX$',
      };
      console.error('[Stripe] Total abaixo do mínimo permitido:', finalTotalConverted);
      return Response.json(
        {
          error: `Total de ${symbols[currency]}${finalTotalConverted.toFixed(2)} está abaixo do mínimo permitido pelo Stripe (${symbols[currency]}${minimum})`,
          details: calculationDetails,
        },
        { status: 400 }
      );
    }

    // 4. Criar Payment Intent no Stripe COM VALOR CONVERTIDO
    const amountInCents = Math.round(finalTotalConverted * 100); // Converter para centavos

    // Compactar items para metadata (limite 500 chars) - apenas IDs essenciais
    const compactItems = items.map(i => `${i.variationId}:${i.quantity}`).join(',');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(), // Stripe aceita USD, EUR, etc
      ...(email && { receipt_email: email }), // Adiciona email apenas se fornecido
      metadata: {
        userId: userId || 'guest',
        items: compactItems, // Formato compacto: "varId1:qty1,varId2:qty2"
        itemCount: items.length.toString(),
        ...(couponCode && { couponCode }),
        ...(appliedDiscount > 0 && { discount: appliedDiscount.toFixed(2) }),
        totalBRL: finalTotal.toFixed(2), // Total final em BRL
        convertedTotal: finalTotalConverted.toFixed(2), // Total na moeda final
        currency: currency, // Moeda do pagamento
        locale: locale || 'pt', // Idioma para tradução
      },
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 });
    }

    console.error('Erro ao criar Payment Intent:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
