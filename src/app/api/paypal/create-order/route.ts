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
    console.log('[PayPal Create Order] Request recebido:', JSON.stringify(body, null, 2));

    const { items, userId, email, couponCode, discount, currency } = createPayPalOrderSchema.parse(body);
    
    console.log(`[PayPal] Criando pedido em ${currency} para:`, email);
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
        const product = dbProducts.find(p => p.id === item.productId);
        if (!product) {
          return Response.json(
            { error: `Produto ${item.productId} não encontrado` },
            { status: 400 }
          );
        }
        itemPrice = Number(product.price);
        itemName = product.name;
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

      appliedDiscount = Math.min(discount, total);
      finalTotal = total - appliedDiscount;

      console.log('[PayPal Create Order] Cupom aplicado:', couponCode);
      console.log('[PayPal Create Order] Desconto:', appliedDiscount);
      console.log('[PayPal Create Order] Total final:', finalTotal);
    }

    if (finalTotal <= 0) {
      return Response.json({ error: 'Total inválido após desconto' }, { status: 400 });
    }

    // Mínimos do PayPal por moeda
    const minimums: Record<string, number> = {
      BRL: 0.5, // R$ 0,50
      USD: 0.01, // $0.01
      EUR: 0.01, // €0.01
    };

    const minimum = minimums[currency] || 0.01;

    if (finalTotal < minimum) {
      const symbols: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' };
      return Response.json(
        {
          error: `Total muito baixo para PayPal (mínimo ${symbols[currency]}${minimum.toFixed(2)})`,
          details: calculationDetails,
        },
        { status: 400 }
      );
    }

    // 4. Criar Order no PayPal na moeda selecionada
    const paypalOrder = await createPayPalOrder(finalTotal, currency);

    console.log('[PayPal Create Order] PayPal Order ID:', paypalOrder.id);

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

    console.log('═══════════════════════════════════════════════════════');
    console.log('[PayPal] ✅ ORDEM CRIADA NO BANCO COM SUCESSO!');
    console.log('[PayPal] Order ID (DB):', createdOrder.id);
    console.log('[PayPal] PayPal Order ID:', paypalOrder.id);
    console.log('[PayPal] Status inicial:', createdOrder.status);
    console.log('[PayPal] Total:', `${finalTotal.toFixed(2)} ${currency}`);
    console.log('═══════════════════════════════════════════════════════');

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
        const product = dbProducts.find(p => p.id === item.productId);
        if (product) {
          nomeProduto = product.name;
          preco = product.price;
        }
      }

      const itemSubtotal = Number(preco) * item.quantity;
      let itemTotal = itemSubtotal;

      if (appliedDiscount > 0 && total > 0) {
        const proportionalDiscount = (itemSubtotal / total) * appliedDiscount;
        itemTotal = itemSubtotal - proportionalDiscount;
      }

      await db.insert(orderItems).values({
        orderId: createdOrder.id,
        productId: item.productId,
        variationId: item.variationId,
        name: nomeProduto,
        price: preco.toString(),
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
