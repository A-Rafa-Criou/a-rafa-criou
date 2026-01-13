import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { products, productVariations, coupons, orders, orderItems } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { getActivePromotions, calculatePromotionalPrice } from '@/lib/db/products';
import { cookies } from 'next/headers';
import { associateOrderToAffiliate } from '@/lib/affiliates/webhook-processor';

const CreatePreferenceSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variationId: z.string().uuid().optional().nullable(),
      quantity: z.number().int().min(1),
    })
  ),
  userId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(), // ✅ Tornar email opcional
  couponCode: z.string().optional().nullable(),
  discount: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, userId, email, couponCode, discount } = CreatePreferenceSchema.parse(body);

    // ✅ Suporta tanto MERCADOPAGO_ACCESS_TOKEN quanto MERCADOPAGO_ACCESS_TOKEN_PROD
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN_PROD;

    if (!accessToken) {
      console.error('[Mercado Pago] Token não configurado');
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

    // 3. Buscar promoções ativas UMA VEZ (cache)
    const promotionsMap = await getActivePromotions();
    const { variationPromotions, productPromotions, globalPromotion } = promotionsMap;

    // 4. Calcular total real COM PREÇOS PROMOCIONAIS
    let total = 0;
    const mpItems = [];

    for (const item of items) {
      let itemPrice = 0;
      let itemTitle = '';

      if (item.variationId) {
        const variation = dbVariations.find(v => v.id === item.variationId);
        if (!variation) {
          return NextResponse.json({ error: `Variação não encontrada` }, { status: 400 });
        }

        // ✅ CALCULAR PREÇO PROMOCIONAL COM CACHE
        const basePrice = Number(variation.price);
        const product = dbProducts.find(p => p.id === item.productId);
        // Aplicar prioridade: variação > produto > global
        const promotion =
          variationPromotions.get(item.variationId) ||
          (product?.id ? productPromotions.get(product.id) : undefined) ||
          globalPromotion ||
          undefined;
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice; // Usar preço com promoção

        itemTitle = `${product?.name || 'Produto'} - ${variation.name}`;
      } else {
        // Product without variation - this shouldn't happen but handle gracefully
        const product = dbProducts.find(p => p.id === item.productId);
        if (!product) {
          return NextResponse.json({ error: `Produto não encontrado` }, { status: 400 });
        }
        // Try to get default variation
        const defaultVariation = dbVariations.find(v => v.productId === item.productId);
        if (defaultVariation) {
          // ✅ CALCULAR PREÇO PROMOCIONAL PARA VARIAÇÃO PADRÃO COM CACHE
          const basePrice = Number(defaultVariation.price);
          // Aplicar prioridade: variação > produto > global
          const promotion =
            variationPromotions.get(defaultVariation.id) ||
            productPromotions.get(item.productId) ||
            globalPromotion ||
            undefined;
          const priceInfo = calculatePromotionalPrice(basePrice, promotion);
          itemPrice = priceInfo.finalPrice; // Usar preço com promoção

          itemTitle = `${product.name} - ${defaultVariation.name}`;
        } else {
          return NextResponse.json({ error: `Produto sem variação válida` }, { status: 400 });
        }
      }

      total += itemPrice * item.quantity;

      mpItems.push({
        title: itemTitle,
        quantity: item.quantity,
        unit_price: itemPrice,
        currency_id: 'BRL',
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

    // ✅ 5. CRIAR PEDIDO NO BANCO DE DADOS ANTES DE CRIAR A PREFERÊNCIA
    const [order] = await db
      .insert(orders)
      .values({
        userId: userId || null,
        email: email || 'guest@example.com', // fallback se não tiver email
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

    // ✅ 5.1. CRIAR ITEMS DO PEDIDO
    for (const item of items) {
      let itemPrice = 0;
      let itemName = '';

      if (item.variationId) {
        const dbVariation = dbVariations.find(v => v.id === item.variationId);
        if (!dbVariation) continue;

        // ✅ CALCULAR PREÇO PROMOCIONAL COM CACHE
        const basePrice = Number(dbVariation.price);
        const product = dbProducts.find(p => p.id === item.productId);
        // Aplicar prioridade: variação > produto > global
        const promotion =
          variationPromotions.get(item.variationId) ||
          (product?.id ? productPromotions.get(product.id) : undefined) ||
          globalPromotion ||
          undefined;
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice; // Usar preço com promoção

        itemName = `${product?.name || 'Produto'} - ${dbVariation.name}`;
      } else {
        const product = dbProducts.find(p => p.id === item.productId);
        const defaultVariation = dbVariations.find(v => v.productId === item.productId);
        if (!product || !defaultVariation) continue;

        // ✅ CALCULAR PREÇO PROMOCIONAL PARA VARIAÇÃO PADRÃO COM CACHE
        const basePrice = Number(defaultVariation.price);
        // Aplicar prioridade: variação > produto > global
        const promotion =
          variationPromotions.get(defaultVariation.id) ||
          productPromotions.get(item.productId) ||
          globalPromotion ||
          undefined;
        const priceInfo = calculatePromotionalPrice(basePrice, promotion);
        itemPrice = priceInfo.finalPrice; // Usar preço com promoção

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
        console.log('[Mercado Pago] ✅ Pedido associado ao afiliado:', affiliateCode);
      }
    } catch (affiliateError) {
      // Não bloquear criação do pedido se falhar tracking de afiliado
      console.error('[Mercado Pago] ⚠️ Erro ao associar afiliado:', affiliateError);
    }

    // 6. Criar preferência no Mercado Pago
    const preferenceData = {
      items: mpItems,
      ...(email && {
        payer: {
          email: email,
        },
      }),
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/mercado-pago-return`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/mercado-pago-return`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/mercado-pago-return`,
      },
      auto_return: 'all' as const,
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' }, // Boleto
        ],
        excluded_payment_methods: [],
        installments: 12, // Até 12x
        default_installments: 1,
      },
      statement_descriptor: 'A RAFA CRIOU', // Nome na fatura do cartão
      binary_mode: false, // Aceita pagamentos pendentes
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mercado-pago/webhook`,
      external_reference: order.id, // ✅ Referenciar o order ID
      metadata: {
        orderId: order.id, // ✅ ID do pedido no nosso banco
        userId: userId || '',
        ...(email && { email }),
        ...(couponCode && { couponCode }),
        ...(appliedDiscount > 0 && { discount: appliedDiscount.toString() }),
      },
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('[Mercado Pago] Erro ao criar preferência:', response.status);

      // Mensagens de erro mais específicas
      if (response.status === 401) {
        return NextResponse.json({ error: 'Token do Mercado Pago inválido' }, { status: 401 });
      }

      if (errorData.message?.includes('test')) {
        return NextResponse.json(
          {
            error: 'Erro de ambiente: credenciais incompatíveis',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: errorData.message || 'Erro ao criar preferência de pagamento',
          details: errorData,
        },
        { status: response.status }
      );
    }

    const preference = await response.json();

    // ✅ 7. ATUALIZAR O PEDIDO COM O PREFERENCE ID
    // Obs: O payment_id real só virá depois do webhook, mas salvamos o preference_id
    await db
      .update(orders)
      .set({
        // Salvamos o preference_id temporariamente como referência
        // O payment_id real virá do webhook
        paymentId: `PREF_${preference.id}`, // Marcamos como preference temporário
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      orderId: order.id, // ✅ Retornar order ID para referência futura
    });
  } catch (error) {
    console.error('[Mercado Pago] Erro:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
