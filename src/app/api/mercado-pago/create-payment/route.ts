import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { products, productVariations, coupons, orders, orderItems } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { getActivePromotionForVariation, calculatePromotionalPrice } from '@/lib/promotions';
import { cookies } from 'next/headers';
import { associateOrderToAffiliate } from '@/lib/affiliates/webhook-processor';

const CreatePaymentSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variationId: z.string().uuid().optional().nullable(),
      quantity: z.number().int().min(1),
    })
  ),
  userId: z.string().optional().nullable(),
  email: z.string().email(),
  couponCode: z.string().optional().nullable(),
  discount: z.number().optional(),
  token: z.string(), // Token do cartão gerado pelo Mercado Pago Checkout Bricks
  paymentMethodId: z.string(), // ID do método de pagamento (ex: visa, master)
  installments: z.number().int().min(1).max(12).default(1),
  issuer: z.string().optional(),
  payer: z.object({
    email: z.string().email(),
    identification: z
      .object({
        type: z.string(),
        number: z.string(),
      })
      .optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items,
      userId,
      email,
      couponCode,
      discount,
      token,
      paymentMethodId,
      installments,
      issuer,
      payer,
    } = CreatePaymentSchema.parse(body);

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN_PROD;

    if (!accessToken) {
      console.error('[Mercado Pago Payment] Token não configurado');
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 });
    }

    // 1. Buscar produtos do banco
    const productIds = [...new Set(items.map(item => item.productId))];
    const dbProducts = await db.select().from(products).where(inArray(products.id, productIds));

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json({ error: 'Produtos não encontrados' }, { status: 400 });
    }

    // 2. Buscar variações
    const variationIds = items
      .map(item => item.variationId)
      .filter((id): id is string => id !== null && id !== undefined);

    const dbVariations =
      variationIds.length > 0
        ? await db
            .select()
            .from(productVariations)
            .where(inArray(productVariations.id, variationIds))
        : [];

    // 3. Calcular total real COM PREÇOS PROMOCIONAIS
    let total = 0;
    const calculationDetails: Array<{ name: string; price: number; quantity: number }> = [];

    for (const item of items) {
      let itemPrice = 0;
      let itemTitle = '';

      if (item.variationId) {
        const variation = dbVariations.find(v => v.id === item.variationId);
        if (!variation) {
          return NextResponse.json({ error: `Variação não encontrada` }, { status: 400 });
        }

        const basePrice = Number(variation.price);
        const promotion = await getActivePromotionForVariation(item.variationId);
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice;

        const product = dbProducts.find(p => p.id === item.productId);
        itemTitle = `${product?.name || 'Produto'} - ${variation.name}`;
      } else {
        const product = dbProducts.find(p => p.id === item.productId);
        if (!product) {
          return NextResponse.json({ error: `Produto não encontrado` }, { status: 400 });
        }
        const defaultVariation = dbVariations.find(v => v.productId === item.productId);
        if (!defaultVariation) {
          return NextResponse.json({ error: `Produto sem variação válida` }, { status: 400 });
        }

        const basePrice = Number(defaultVariation.price);
        const promotion = await getActivePromotionForVariation(defaultVariation.id);
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice;

        itemTitle = `${product.name} - ${defaultVariation.name}`;
      }

      total += itemPrice * item.quantity;
      calculationDetails.push({
        name: itemTitle,
        price: itemPrice,
        quantity: item.quantity,
      });
    }

    // 4. Aplicar cupom se houver
    let finalTotal = total;
    let appliedDiscount = 0;

    if (couponCode && discount && discount > 0) {
      const coupon = await db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1);

      if (coupon.length > 0) {
        appliedDiscount = Math.min(discount, total);
        finalTotal = total - appliedDiscount;
      }
    }

    if (finalTotal <= 0) {
      return NextResponse.json({ error: 'Total inválido' }, { status: 400 });
    }

    // 5. CRIAR PEDIDO NO BANCO DE DADOS
    const [order] = await db
      .insert(orders)
      .values({
        userId: userId || null,
        email: email,
        status: 'pending',
        paymentStatus: 'pending',
        paymentProvider: 'mercadopago',
        currency: 'BRL',
        subtotal: total.toString(),
        discountAmount: appliedDiscount > 0 ? appliedDiscount.toString() : null,
        total: finalTotal.toString(),
        couponCode: couponCode || null,
      })
      .returning();

    // 5.1. CRIAR ITEMS DO PEDIDO
    for (const item of items) {
      let itemPrice = 0;
      let itemName = '';

      if (item.variationId) {
        const dbVariation = dbVariations.find(v => v.id === item.variationId);
        if (!dbVariation) continue;

        const basePrice = Number(dbVariation.price);
        const promotion = await getActivePromotionForVariation(item.variationId);
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice;

        const product = dbProducts.find(p => p.id === item.productId);
        itemName = `${product?.name || 'Produto'} - ${dbVariation.name}`;
      } else {
        const product = dbProducts.find(p => p.id === item.productId);
        const defaultVariation = dbVariations.find(v => v.productId === item.productId);
        if (!product || !defaultVariation) continue;

        const basePrice = Number(defaultVariation.price);
        const promotion = await getActivePromotionForVariation(defaultVariation.id);
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice;

        itemName = `${product.name} - ${defaultVariation.name}`;
      }

      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        variationId: item.variationId || null,
        name: itemName,
        price: itemPrice.toString(),
        quantity: item.quantity,
        total: (itemPrice * item.quantity).toString(),
      });
    }

    // 🔗 ASSOCIAR PEDIDO AO AFILIADO (se existir cookie)
    try {
      const cookieStore = await cookies();
      const affiliateCode = cookieStore.get('affiliate_code')?.value || null;
      const affiliateClickId = cookieStore.get('affiliate_click_id')?.value || null;

      if (affiliateCode || affiliateClickId) {
        await associateOrderToAffiliate(order.id, affiliateCode, affiliateClickId);
        console.log('[Mercado Pago Payment] ✅ Pedido associado ao afiliado:', affiliateCode);
      }
    } catch (affiliateError) {
      console.error('[Mercado Pago Payment] ⚠️ Erro ao associar afiliado:', affiliateError);
    }

    // 6. Criar pagamento no Mercado Pago
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'http://localhost:3000';

    // Mercado Pago não aceita localhost como notification_url
    // Só incluir se for uma URL pública válida
    const notificationUrl = baseUrl.includes('localhost')
      ? undefined
      : `${baseUrl}/api/mercado-pago/webhook`;

    console.log(
      '[Mercado Pago Payment] Notification URL:',
      notificationUrl || 'omitida (localhost)'
    );

    const paymentData = {
      transaction_amount: finalTotal,
      token: token,
      description: `Pedido #${order.id.slice(0, 8)}`,
      installments: installments,
      payment_method_id: paymentMethodId,
      ...(issuer && { issuer_id: issuer }),
      payer: {
        email: payer.email,
        ...(payer.identification && {
          identification: {
            type: payer.identification.type,
            number: payer.identification.number,
          },
        }),
      },
      ...(notificationUrl && { notification_url: notificationUrl }),
      statement_descriptor: 'A RAFA CRIOU',
      external_reference: order.id,
      metadata: {
        orderId: order.id,
        userId: userId || '',
        email: email,
        ...(couponCode && { couponCode }),
        ...(appliedDiscount > 0 && { discount: appliedDiscount.toString() }),
      },
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': order.id, // Usar order ID como chave de idempotência
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('[Mercado Pago Payment] Erro ao criar pagamento:', response.status, errorData);

      // Deletar pedido se pagamento falhou
      await db.delete(orders).where(eq(orders.id, order.id));

      return NextResponse.json(
        {
          error: errorData.message || 'Erro ao processar pagamento',
          details: errorData,
        },
        { status: response.status }
      );
    }

    const payment = await response.json();

    console.log('[Mercado Pago Payment] ✅ Pagamento criado:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method_id: payment.payment_method_id,
    });

    // 7. ATUALIZAR O PEDIDO COM O PAYMENT ID
    // Definir status baseado no retorno do Mercado Pago
    let orderStatus = 'pending';
    let orderPaymentStatus = 'pending';
    let paidAt = null;

    if (['approved', 'authorized'].includes(payment.status)) {
      orderStatus = 'completed'; // ✅ Igual ao webhook
      orderPaymentStatus = 'paid';
      paidAt = new Date();
    } else if (['pending', 'in_process', 'in_mediation'].includes(payment.status)) {
      orderStatus = 'pending';
      orderPaymentStatus = 'pending';
    } else if (['cancelled', 'rejected', 'expired', 'charged_back'].includes(payment.status)) {
      orderStatus = 'cancelled';
      orderPaymentStatus = 'cancelled';
    } else if (payment.status === 'refunded') {
      orderStatus = 'refunded';
      orderPaymentStatus = 'refunded';
    }

    await db
      .update(orders)
      .set({
        paymentId: payment.id.toString(),
        paymentStatus: orderPaymentStatus,
        status: orderStatus,
        updatedAt: new Date(),
        ...(paidAt && { paidAt }),
      })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      orderId: order.id,
    });
  } catch (error) {
    console.error('[Mercado Pago Payment] Erro:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
