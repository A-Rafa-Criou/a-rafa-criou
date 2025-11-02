import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API para corrigir valores de pedidos em moeda estrangeira
 * 
 * GET /api/admin/fix-order?orderId=xxx
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json(
      { error: 'orderId é obrigatório' },
      { status: 400 }
    );
  }

  console.log(`🔧 Corrigindo pedido ${orderId}...`);

  // 1. Buscar pedido
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json(
      { error: 'Pedido não encontrado' },
      { status: 404 }
    );
  }

  console.log('📦 Pedido encontrado:', {
    subtotal: order.subtotal,
    discount: order.discountAmount || '0',
    total: order.total,
    currency: order.currency,
  });

  // 2. Se for BRL, não precisa corrigir
  if (order.currency === 'BRL') {
    return NextResponse.json({
      message: 'Pedido já está em BRL, não precisa corrigir',
      order,
    });
  }

  // 3. Buscar itens do pedido
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  console.log(`📋 ${items.length} itens encontrados`);

  // 4. Calcular total em BRL (assumindo que os preços salvos estão em BRL)
  let totalCalculadoBRL = 0;
  const itemsInfo = [];

  for (const item of items) {
    const precoItem = parseFloat(item.price);
    const subtotalItem = precoItem * item.quantity;
    totalCalculadoBRL += subtotalItem;

    itemsInfo.push({
      name: item.name,
      priceBRL: precoItem,
      quantity: item.quantity,
      subtotalBRL: subtotalItem,
    });
  }

  console.log(`💰 Total calculado em BRL: R$ ${totalCalculadoBRL.toFixed(2)}`);

  // 5. Calcular taxa de conversão a partir do total pago
  const totalPago = parseFloat(order.total);
  const conversionRate = totalPago / totalCalculadoBRL;

  console.log(
    `📊 Taxa de conversão: ${conversionRate.toFixed(6)} (1 BRL = ${conversionRate.toFixed(6)} ${order.currency})`
  );

  // 6. Atualizar cada item
  const updatedItems = [];

  for (const item of items) {
    const precoBRL = parseFloat(item.price);
    const precoConvertido = precoBRL * conversionRate;
    const totalConvertido = precoConvertido * item.quantity;

    console.log(`🔄 Atualizando item ${item.name}:`, {
      priceBRL: precoBRL,
      priceConverted: precoConvertido.toFixed(2),
      totalConverted: totalConvertido.toFixed(2),
    });

    await db
      .update(orderItems)
      .set({
        price: precoConvertido.toFixed(2),
        total: totalConvertido.toFixed(2),
      })
      .where(eq(orderItems.id, item.id));

    updatedItems.push({
      id: item.id,
      name: item.name,
      oldPrice: precoBRL.toFixed(2),
      newPrice: precoConvertido.toFixed(2),
      oldTotal: item.total,
      newTotal: totalConvertido.toFixed(2),
    });
  }

  return NextResponse.json({
    message: 'Pedido corrigido com sucesso!',
    order: {
      id: order.id,
      currency: order.currency,
      total: order.total,
    },
    conversionRate,
    itemsBefore: itemsInfo,
    itemsAfter: updatedItems,
    links: {
      obrigado: `/obrigado?payment_intent=${order.stripePaymentIntentId || order.paymentId}`,
      detalhes: `/conta/pedidos/${orderId}`,
    },
  });
}
