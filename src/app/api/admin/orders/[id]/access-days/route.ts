import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/admin/orders/[id]/access-days
 *
 * Atualiza o número de dias de acesso de um pedido específico
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { accessDays } = await request.json();

    // Validar accessDays
    if (typeof accessDays !== 'number' || accessDays < 1 || accessDays > 3650) {
      return NextResponse.json(
        { error: 'Valor inválido. Use um número entre 1 e 3650 dias' },
        { status: 400 }
      );
    }

    // Atualizar pedido
    const [updatedOrder] = await db
      .update(orders)
      .set({
        accessDays: accessDays,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Dias de acesso alterados para ${accessDays} dias`,
      order: {
        id: updatedOrder.id,
        accessDays: updatedOrder.accessDays,
      },
    });
  } catch (error) {
    console.error('[Admin] Erro ao atualizar dias de acesso:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dias de acesso' }, { status: 500 });
  }
}
