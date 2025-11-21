import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateCommissions, affiliates, orders } from '@/lib/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const affiliateId = searchParams.get('affiliateId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Query base
    let query = db
      .select({
        commission: affiliateCommissions,
        affiliate: {
          id: affiliates.id,
          code: affiliates.code,
          name: affiliates.name,
          email: affiliates.email,
          pixKey: affiliates.pixKey,
          bankName: affiliates.bankName,
          bankAccount: affiliates.bankAccount,
        },
        order: {
          id: orders.id,
          email: orders.email,
          total: orders.total,
          createdAt: orders.createdAt,
        },
      })
      .from(affiliateCommissions)
      .leftJoin(affiliates, eq(affiliateCommissions.affiliateId, affiliates.id))
      .leftJoin(orders, eq(affiliateCommissions.orderId, orders.id))
      .orderBy(desc(affiliateCommissions.createdAt));

    // Filtros
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(affiliateCommissions.status, status));
    }

    if (affiliateId) {
      conditions.push(eq(affiliateCommissions.affiliateId, affiliateId));
    }

    if (startDate) {
      conditions.push(gte(affiliateCommissions.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(affiliateCommissions.createdAt, new Date(endDate)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;

    // Formatar resposta
    const commissionsList = results.map(({ commission, affiliate, order }) => ({
      id: commission.id,
      affiliateId: commission.affiliateId,
      orderId: commission.orderId,
      orderTotal: commission.orderTotal.toString(),
      commissionRate: commission.commissionRate.toString(),
      commissionAmount: commission.commissionAmount.toString(),
      currency: commission.currency,
      status: commission.status,
      paymentMethod: commission.paymentMethod,
      paymentProof: commission.paymentProof,
      notes: commission.notes,
      createdAt: commission.createdAt.toISOString(),
      approvedAt: commission.approvedAt?.toISOString() || null,
      paidAt: commission.paidAt?.toISOString() || null,
      affiliate,
      order,
    }));

    // Estatísticas
    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`sum(case when ${affiliateCommissions.status} = 'pending' then 1 else 0 end)::int`,
        approved: sql<number>`sum(case when ${affiliateCommissions.status} = 'approved' then 1 else 0 end)::int`,
        paid: sql<number>`sum(case when ${affiliateCommissions.status} = 'paid' then 1 else 0 end)::int`,
        cancelled: sql<number>`sum(case when ${affiliateCommissions.status} = 'cancelled' then 1 else 0 end)::int`,
        totalPending: sql<number>`sum(case when ${affiliateCommissions.status} = 'pending' then ${affiliateCommissions.commissionAmount} else 0 end)::decimal`,
        totalApproved: sql<number>`sum(case when ${affiliateCommissions.status} = 'approved' then ${affiliateCommissions.commissionAmount} else 0 end)::decimal`,
        totalPaid: sql<number>`sum(case when ${affiliateCommissions.status} = 'paid' then ${affiliateCommissions.commissionAmount} else 0 end)::decimal`,
      })
      .from(affiliateCommissions);

    return NextResponse.json({
      commissions: commissionsList,
      stats: stats[0],
    });
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
