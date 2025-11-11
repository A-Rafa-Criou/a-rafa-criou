import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getActivePromotionForVariation, calculatePromotionalPrice } from '@/lib/promotions';

/**
 * POST /api/admin/fix-order-price
 *
 * Analisa pedido que pode ter sido cobrado sem promoção
 *
 * Body: {
 *   orderId: string,
 *   action: 'calculate' | 'refund'
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
      paymentProvider: order.paymentProvider,
      paymentId: order.paymentId,
      items: itemAnalysis,
    };

    // 4. Executar ação solicitada
    if (action === 'calculate') {
      return NextResponse.json({
        message: 'Cálculo concluído',
        ...result,
      });
    }

    if (action === 'refund' && totalDifference > 0.01) {
      // Instruções para reembolso manual via gateway usado
      const instructions: Record<string, string> = {
        paypal: `1. Acesse PayPal Dashboard\n2. Busque transação: ${order.paymentId}\n3. Clique em "Refund" e insira ${totalDifference.toFixed(2)} ${result.currency}`,
        stripe: `1. Acesse Stripe Dashboard > Payments\n2. Busque: ${order.paymentId}\n3. Clique "Refund" e insira ${totalDifference.toFixed(2)} ${result.currency}`,
        pix: `1. PIX não permite reembolso automático\n2. Contate cliente em ${order.email}\n3. Solicite chave PIX e faça transferência manual`,
        mercadopago: `1. Acesse Mercado Pago Dashboard\n2. Busque transação: ${order.paymentId}\n3. Processe reembolso parcial de ${totalDifference.toFixed(2)} ${result.currency}`,
      };

      return NextResponse.json({
        message: 'Instruções para reembolso',
        instructions:
          instructions[order.paymentProvider || ''] ||
          'Gateway de pagamento desconhecido. Reembolso manual necessário.',
        ...result,
      });
    }

    if (action === 'refund' && totalDifference <= 0.01) {
      return NextResponse.json({
        message: 'Nenhum reembolso necessário. Preço cobrado está correto.',
        ...result,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('❌ Erro ao analisar pedido:', error);
    return NextResponse.json(
      { error: 'Erro interno', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
