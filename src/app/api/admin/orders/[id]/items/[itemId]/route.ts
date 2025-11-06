import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orderItems, products, productVariations, orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const orderId = params.id;
    const itemId = params.itemId;
    const body = await req.json();
    const { productId, variationId } = body;

    if (!productId) {
      return NextResponse.json({ message: 'productId é obrigatório' }, { status: 400 });
    }

    // Buscar o produto
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);

    if (!product) {
      return NextResponse.json({ message: 'Produto não encontrado' }, { status: 404 });
    }

    let name = product.name;

    // Variação é OBRIGATÓRIA - produtos não têm preço próprio
    if (!variationId) {
      return NextResponse.json({ message: 'variationId é obrigatório - produtos devem ter variações' }, { status: 400 });
    }

    // Buscar preço e nome da variação
    const [variation] = await db
      .select()
      .from(productVariations)
      .where(
        and(eq(productVariations.id, variationId), eq(productVariations.productId, productId))
      )
      .limit(1);

    if (!variation) {
      return NextResponse.json({ message: 'Variação não encontrada' }, { status: 404 });
    }

    const price = variation.price;
    // Adicionar nome da variação ao nome do produto
    if (variation.name) {
      name = `${product.name} - ${variation.name}`;
    }

    // Buscar item do pedido
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);

    if (!item) {
      return NextResponse.json({ message: 'Item do pedido não encontrado' }, { status: 404 });
    }

    if (item.orderId !== orderId) {
      return NextResponse.json({ message: 'Item não pertence a este pedido' }, { status: 400 });
    }

    // Calcular novo total do item
    const quantity = item.quantity;
    const newItemTotal = parseFloat(price) * quantity;

    // Atualizar item do pedido
    await db
      .update(orderItems)
      .set({
        productId,
        variationId: variationId || null,
        name,
        price: price.toString(),
        total: newItemTotal.toString(),
      })
      .where(eq(orderItems.id, itemId));

    // Recalcular total do pedido
    const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    const newSubtotal = allItems.reduce((sum, item) => sum + parseFloat(item.total), 0);

    // Buscar desconto atual
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 });
    }

    const discountAmount = parseFloat(order.discountAmount || '0');
    const newTotal = newSubtotal - discountAmount;

    // Atualizar totais do pedido
    await db
      .update(orders)
      .set({
        subtotal: newSubtotal.toString(),
        total: newTotal.toString(),
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      message: 'Produto atualizado com sucesso',
      item: {
        id: itemId,
        productId,
        variationId,
        name,
        price: price.toString(),
        quantity,
        total: newItemTotal.toString(),
      },
      order: {
        subtotal: newSubtotal.toString(),
        total: newTotal.toString(),
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json(
      { message: 'Erro ao atualizar produto', error: String(error) },
      { status: 500 }
    );
  }
}
