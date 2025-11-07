import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPayPalOrder } from '@/lib/paypal';
import { db } from '@/lib/db';
import { products, productVariations, coupons } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';

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
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'), // Nova validação de moeda
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

    console.log('[PayPal Create Order] Produtos encontrados:', dbProducts.length);
    console.log('[PayPal Create Order] Variações encontradas:', dbVariations.length);

    // 3. Calcular total REAL (preços do banco)
    let total = 0;
    const calculationDetails: Array<{ name: string; price: number; quantity: number }> = [];

    for (const item of items) {
      let itemPrice = 0;
      let itemName = '';

      if (item.variationId) {
        const variation = dbVariations.find(v => v.id === item.variationId);
        if (!variation) {
          return Response.json(
            { error: `Variação ${item.variationId} não encontrada` },
            { status: 400 }
          );
        }
        itemPrice = Number(variation.price);
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

    console.log('[PayPal Create Order] Total calculado: R$', total.toFixed(2));

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

        console.log('═══════════════════════════════════════════════════════');
        console.log('[PayPal] 🔄 CONVERSÃO DE MOEDA (API)');
        console.log(`[PayPal] Total em BRL: R$ ${finalTotal.toFixed(2)}`);
        console.log(`[PayPal] Taxa de câmbio: ${rate} (1 BRL = ${rate} ${currency})`);
        console.log(`[PayPal] Total convertido: ${finalTotalConverted.toFixed(2)} ${currency}`);
        console.log('═══════════════════════════════════════════════════════');
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
    const paypalOrder = await createPayPalOrder(finalTotalConverted, currency);

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
        currency: currency, // Salvar moeda selecionada
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
      let preco = '0';

      if (item.variationId) {
        const product = dbProducts.find(p => p.id === item.productId);
        const variation = dbVariations.find(v => v.id === item.variationId);

        if (product && variation) {
          nomeProduto = product.name;
          preco = variation.price;
        }
      } else {
        // Produtos sem variação não são permitidos - isto não deveria acontecer
        throw new Error(`Produto ${item.productId} sem variação especificada`);
      }

      // ✅ CONVERTER preço do item para a moeda do pedido
      const precoNumerico = Number(preco);
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

    // Retornar PayPal Order ID para o frontend
    return Response.json({
      orderId: paypalOrder.id,
      dbOrderId: createdOrder.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 });
    }

    console.error('Erro ao criar PayPal Order:', error);
    return Response.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
