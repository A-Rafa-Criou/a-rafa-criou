import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, users, affiliateLinks, affiliateCommissions, orders } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Buscar afiliado com detalhes
    const [affiliate] = await db
      .select({
        affiliate: affiliates,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(affiliates)
      .leftJoin(users, eq(affiliates.userId, users.id))
      .where(eq(affiliates.id, id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Buscar links do afiliado
    const links = await db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.affiliateId, id))
      .orderBy(desc(affiliateLinks.createdAt));

    // Buscar comissões recentes
    const commissions = await db
      .select({
        commission: affiliateCommissions,
        order: {
          id: orders.id,
          email: orders.email,
          createdAt: orders.createdAt,
        },
      })
      .from(affiliateCommissions)
      .leftJoin(orders, eq(affiliateCommissions.orderId, orders.id))
      .where(eq(affiliateCommissions.affiliateId, id))
      .orderBy(desc(affiliateCommissions.createdAt))
      .limit(50);

    return NextResponse.json({
      ...affiliate.affiliate,
      user: affiliate.user,
      links: links.map(link => ({
        ...link,
        revenue: (link.revenue || '0').toString(),
        createdAt: link.createdAt.toISOString(),
      })),
      commissions: commissions.map(({ commission, order }) => ({
        ...commission,
        orderTotal: commission.orderTotal.toString(),
        commissionRate: commission.commissionRate.toString(),
        commissionAmount: commission.commissionAmount.toString(),
        createdAt: commission.createdAt.toISOString(),
        approvedAt: commission.approvedAt?.toISOString() || null,
        paidAt: commission.paidAt?.toISOString() || null,
        order,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      name,
      email,
      phone,
      commissionType,
      commissionValue,
      pixKey,
      bankName,
      bankAccount,
    } = body;

    // Verificar se afiliado existe
    const [existing] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Preparar dados para atualização
    const updateData: Record<string, string | number | null | Date> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (commissionType !== undefined) updateData.commissionType = commissionType;
    if (commissionValue !== undefined) updateData.commissionValue = commissionValue.toString();
    if (pixKey !== undefined) updateData.pixKey = pixKey;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;

    if (status !== undefined) {
      updateData.status = status;

      // Se aprovar, registrar quem aprovou e quando
      if (status === 'active') {
        updateData.approvedBy = session.user.id;
        updateData.approvedAt = new Date();
      }
    }

    updateData.updatedAt = new Date();

    // Atualizar afiliado
    const [updated] = await db
      .update(affiliates)
      .set(updateData)
      .where(eq(affiliates.id, id))
      .returning();

    return NextResponse.json({ success: true, affiliate: updated });
  } catch (error) {
    console.error('Erro ao atualizar afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se tem comissões pendentes
    const [pendingCommissions] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`sum(${affiliateCommissions.commissionAmount})::decimal`,
      })
      .from(affiliateCommissions)
      .where(
        and(eq(affiliateCommissions.affiliateId, id), eq(affiliateCommissions.status, 'pending'))
      );

    if (pendingCommissions.count > 0) {
      return NextResponse.json(
        {
          error: `Não é possível deletar afiliado com ${pendingCommissions.count} comissões pendentes no valor de R$ ${pendingCommissions.total}`,
        },
        { status: 400 }
      );
    }

    // Deletar afiliado (cascade vai deletar links e comissões)
    await db.delete(affiliates).where(eq(affiliates.id, id));

    return NextResponse.json({ success: true, message: 'Afiliado deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
