import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID obrigatório' }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentId: order.paymentId,
    });
  } catch (error) {
    console.error('[Order Status] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar pedido' }, { status: 500 });
  }
}
