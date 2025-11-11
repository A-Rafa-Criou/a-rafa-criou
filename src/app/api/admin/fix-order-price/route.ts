import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, productVariations, userCredits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getActivePromotionForVariation, calculatePromotionalPrice } from '@/lib/promotions';

/**
 * POST /api/admin/fix-order-price
 * 
 * Corrige preço de pedido específico que foi cobrado sem promoção
 * 
 * Body: {
 *   orderId: string,
 *   action: 'calculate' | 'credit' | 'refund'
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, action = 'calculate' } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId obrigatório' }, { status: 400 });
    }

    // 1. Buscar pedido
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // 2. Buscar itens do pedido
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    if (items.length === 0) {
      return NextResponse.json({ error: 'Pedido sem itens' }, { status: 400 });
    }

    // 3. Calcular preços corretos com promoção
    const itemAnalysis = [];
    let totalDifference = 0;

    for (const item of items) {
      if (!item.variationId) {
        itemAnalysis.push({
          name: item.name,
          issue: 'Sem variação vinculada',
          pricePaid: Number(item.price),
          priceCorrect: Number(item.price),
          difference: 0,
        });
        continue;
      }

      // Buscar variação
      const [variation] = await db
        .select()
        .from(productVariations)
        .where(eq(productVariations.id, item.variationId))
        .limit(1);

      if (!variation) {
        itemAnalysis.push({
          name: item.name,
          issue: 'Variação não encontrada',
          pricePaid: Number(item.price),
          priceCorrect: Number(item.price),
          difference: 0,
        });
        continue;
      }

      // Calcular preço com promoção ATUAL (pode ter mudado desde o pedido)
      const basePrice = Number(variation.price);
      const promotion = await getActivePromotionForVariation(item.variationId);
      const priceInfo = calculatePromotionalPrice(basePrice, promotion);

      const pricePaid = Number(item.price);
      const priceCorrect = priceInfo.finalPrice;
      const difference = (pricePaid - priceCorrect) * (item.quantity || 1);

      itemAnalysis.push({
        name: item.name || 'Produto',
        quantity: item.quantity || 1,
        pricePaid,
        priceCorrect,
        differencePerUnit: pricePaid - priceCorrect,
        totalDifference: difference,
        promotion: priceInfo.hasPromotion
          ? {
              name: priceInfo.promotion?.name,
              discount: `${priceInfo.discount.toFixed(2)}`,
            }
          : null,
      });

      totalDifference += difference;
    }

    const result = {
      orderId: order.id,
      email: order.email,
      orderDate: order.createdAt,
      totalPaid: Number(order.total),
      totalCorrect: Number(order.total) - totalDifference,
      refundAmount: totalDifference,
      currency: order.currency || 'BRL',
      items: itemAnalysis,
    };

    // 4. Executar ação solicitada
    if (action === 'calculate') {
      return NextResponse.json({
        message: 'Cálculo concluído',
        ...result,
      });
    }

    if (action === 'credit' && totalDifference > 0.01) {
      // Adicionar crédito para o usuário
      if (!order.userId) {
        return NextResponse.json(
          {
            error: 'Pedido sem usuário vinculado. Use reembolso manual via PayPal.',
            ...result,
          },
          { status: 400 }
        );
      }

      await db.insert(userCredits).values({
        userId: order.userId,
        amount: totalDifference.toFixed(2),
        description: `Reembolso pedido #${orderId.slice(0, 8)} - Erro de preço promocional`,
        type: 'refund',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      });

      return NextResponse.json({
        message: `✅ Crédito de ${result.currency} ${totalDifference.toFixed(2)} adicionado para ${order.email}`,
        ...result,
      });
    }

    if (action === 'refund') {
      // Para reembolso real via PayPal/Stripe, retornar instruções
      return NextResponse.json({
        message: 'Instruções para reembolso',
        instructions: {
          paypal: `Acesse https://www.paypal.com/myaccount/transactions e busque transaction ID: ${order.paymentId}`,
          stripe: `Use Stripe Dashboard ou API para reembolsar ${totalDifference.toFixed(2)} ${result.currency}`,
        },
        ...result,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('❌ Erro ao corrigir pedido:', error);
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
