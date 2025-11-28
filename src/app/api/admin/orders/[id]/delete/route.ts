import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    // Verificar se é admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = await context.params;

    // Buscar o pedido
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // ⚠️ Verificar se o status permite deleção
    const allowedStatuses = ['pending', 'cancelled', 'processing'];
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          error: 'Não é possível deletar pedidos concluídos',
          message:
            'Apenas pedidos com status pendente, cancelado ou processando podem ser deletados.',
        },
        { status: 400 }
      );
    }

    // Deletar orderItems primeiro (foreign key)
    await db.delete(orderItems).where(eq(orderItems.orderId, id));

    // Deletar o pedido
    await db.delete(orders).where(eq(orders.id, id));

    console.log(`[Admin] ✅ Pedido ${id} deletado por ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Pedido deletado com sucesso',
    });
  } catch (error) {
    console.error('[Admin] ❌ Erro ao deletar pedido:', error);
    return NextResponse.json({ error: 'Erro ao deletar pedido' }, { status: 500 });
  }
}
