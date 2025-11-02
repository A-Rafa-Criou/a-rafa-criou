import { NextRequest } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { products, productVariations, coupons } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';

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
  currency: z.enum(['USD', 'EUR']).default('USD'), // Stripe não aceita BRL diretamente
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Stripe Payment Intent] Request recebido:', JSON.stringify(body, null, 2));

    const { items, userId, email, couponCode, discount, currency } =
      createPaymentIntentSchema.parse(body);

    console.log(`[Stripe] Criando payment intent em ${currency} para:`, email);

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

    console.log('[Stripe Payment Intent] Produtos encontrados:', dbProducts.length);
    console.log('[Stripe Payment Intent] Variações solicitadas:', variationIds.length);
    console.log('[Stripe Payment Intent] Variações encontradas:', dbVariations.length);

    // 3. Calcular total REAL (preços do banco)
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
        itemPrice = Number(variation.price);

        const product = dbProducts.find(p => p.id === item.productId);
        itemName = `${product?.name || 'Produto'} - ${variation.name}`;

        console.log(`[Stripe] Item com variação: ${itemName} - R$ ${itemPrice} x ${item.quantity}`);
      } else {
        // Se não tem variação, usar preço do produto
        const product = dbProducts.find(p => p.id === item.productId);
        if (!product) {
          console.error('[Stripe] Produto não encontrado:', item.productId);
          return Response.json(
            { error: `Produto ${item.productId} não encontrado` },
            { status: 400 }
          );
        }
        itemPrice = Number(product.price);
        itemName = product.name;

        console.log(`[Stripe] Item sem variação: ${itemName} - R$ ${itemPrice} x ${item.quantity}`);
      }

      const itemTotal = itemPrice * item.quantity;
      total += itemTotal;

      calculationDetails.push({
        name: itemName,
        price: itemPrice,
        quantity: item.quantity,
      });
    }

    console.log('[Stripe Payment Intent] Total calculado: R$', total.toFixed(2));
    console.log('[Stripe Payment Intent] Detalhes:', calculationDetails);

    // 3.5. Aplicar desconto de cupom se fornecido
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

      // Aplicar desconto
      appliedDiscount = Math.min(discount, total); // Garantir que desconto não seja maior que total
      finalTotal = total - appliedDiscount;

      console.log('[Stripe Payment Intent] Cupom aplicado:', couponCode);
      console.log('[Stripe Payment Intent] Desconto:', appliedDiscount);
      console.log('[Stripe Payment Intent] Total final:', finalTotal);
    }

    if (finalTotal <= 0) {
      return Response.json({ error: 'Total inválido após desconto' }, { status: 400 });
    }

    // Mínimos do Stripe por moeda
    const minimums: Record<string, number> = {
      USD: 0.5, // $0.50
      EUR: 0.5, // €0.50
    };

    const minimum = minimums[currency] || 0.5;

    if (finalTotal < minimum) {
      const symbols: Record<string, string> = { USD: '$', EUR: '€' };
      console.error('[Stripe] Total abaixo do mínimo permitido:', finalTotal);
      return Response.json(
        {
          error: `Total de ${symbols[currency]}${finalTotal.toFixed(2)} está abaixo do mínimo permitido pelo Stripe (${symbols[currency]}${minimum})`,
          details: calculationDetails,
        },
        { status: 400 }
      );
    }

    // 4. Criar Payment Intent no Stripe na moeda selecionada
    const amountInCents = Math.round(finalTotal * 100); // Converter para centavos
    console.log('[Stripe Payment Intent] Valor em centavos:', amountInCents);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(), // Stripe aceita USD, EUR, etc
      ...(email && { receipt_email: email }), // Adiciona email apenas se fornecido
      metadata: {
        userId: userId || '',
        items: JSON.stringify(items),
        ...(couponCode && { couponCode }),
        ...(appliedDiscount > 0 && { discount: appliedDiscount.toString() }),
        originalTotal: total.toString(),
        finalTotal: finalTotal.toString(),
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
