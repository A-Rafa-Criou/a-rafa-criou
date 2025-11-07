import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { products, productVariations, coupons } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';

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
      console.error('[Mercado Pago] ❌ Token não encontrado. Verifique .env.local');
      console.error('[Mercado Pago] Variáveis disponíveis:', {
        MERCADOPAGO_ACCESS_TOKEN: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
        MERCADOPAGO_ACCESS_TOKEN_PROD: !!process.env.MERCADOPAGO_ACCESS_TOKEN_PROD,
      });
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

    // 3. Calcular total real
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
        itemPrice = Number(variation.price);
        const product = dbProducts.find(p => p.id === item.productId);
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
          itemPrice = Number(defaultVariation.price);
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

    // 5. Criar preferência no Mercado Pago
    const preferenceData = {
      items: mpItems,
      ...(email && {
        payer: {
          email: email,
        },
      }),
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/obrigado`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/carrinho`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/carrinho`,
      },
      auto_return: 'approved' as const,
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
      metadata: {
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

      console.error('[Mercado Pago] Erro ao criar preferência:');
      console.error('[Mercado Pago] Status:', response.status);
      console.error('[Mercado Pago] Resposta:', errorData);
      console.error('[Mercado Pago] Token usado:', accessToken?.substring(0, 20) + '...');

      // Mensagens de erro mais específicas
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Token do Mercado Pago inválido. Verifique suas credenciais no .env.local' },
          { status: 401 }
        );
      }

      if (errorData.message?.includes('test')) {
        return NextResponse.json(
          {
            error:
              'Erro de ambiente: você está usando credenciais de teste mas tentando usar conta de produção (ou vice-versa). Use uma conta de teste do Mercado Pago.',
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

    console.log('[Mercado Pago Cartão] ✅ Preferência criada:', preference.id);
    console.log('[Mercado Pago Cartão] Total:', `R$ ${finalTotal.toFixed(2)}`);
    console.log('[Mercado Pago Cartão] URL:', preference.init_point);

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
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
