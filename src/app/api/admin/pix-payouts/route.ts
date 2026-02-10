import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateCommissions, affiliates, orders } from '@/lib/db/schema';
import { eq, desc, and, sql, isNotNull, or } from 'drizzle-orm';

/**
 * API de Monitoramento de Pagamentos de Comissões (Stripe Connect + PIX)
 * 
 * GET /api/admin/pix-payouts
 * 
 * Query params:
 * - status: all | paid | pending | failed
 * - dateFrom: ISO date
 * - dateTo: ISO date
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir filtros
    const conditions = [];

    // Filtro de status
    if (status === 'paid') {
      conditions.push(eq(affiliateCommissions.status, 'paid'));
      conditions.push(
        or(
          isNotNull(affiliateCommissions.transferId),
          isNotNull(affiliateCommissions.pixTransferId)
        )
      );
    } else if (status === 'pending') {
      conditions.push(eq(affiliateCommissions.status, 'approved'));
    } else if (status === 'failed') {
      conditions.push(
        and(
          eq(affiliateCommissions.status, 'approved'),
          isNotNull(affiliateCommissions.transferError)
        )
      );
    }

    // Filtro de data
    if (dateFrom) {
      conditions.push(sql`${affiliateCommissions.createdAt} >= ${new Date(dateFrom)}`);
    }
    if (dateTo) {
      conditions.push(sql`${affiliateCommissions.createdAt} <= ${new Date(dateTo)}`);
    }

    // Buscar comissões com dados do afiliado
    const commissions = await db
      .select({
        id: affiliateCommissions.id,
        commissionAmount: affiliateCommissions.commissionAmount,
        status: affiliateCommissions.status,
        createdAt: affiliateCommissions.createdAt,
        paidAt: affiliateCommissions.paidAt,
        transferId: affiliateCommissions.transferId,
        pixTransferId: affiliateCommissions.pixTransferId,
        paymentMethod: affiliateCommissions.paymentMethod,
        transferStatus: affiliateCommissions.transferStatus,
        transferError: affiliateCommissions.transferError,
        transferAttemptCount: affiliateCommissions.transferAttemptCount,
        orderId: affiliateCommissions.orderId,
        affiliate: {
          id: affiliates.id,
          name: affiliates.name,
          email: affiliates.email,
          pixKey: affiliates.pixKey,
          pixAutoTransferEnabled: affiliates.pixAutoTransferEnabled,
        },
        order: {
          id: orders.id,
          total: orders.total,
        },
      })
      .from(affiliateCommissions)
      .leftJoin(affiliates, eq(affiliateCommissions.affiliateId, affiliates.id))
      .leftJoin(orders, eq(affiliateCommissions.orderId, orders.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(affiliateCommissions.createdAt))
      .limit(limit)
      .offset(offset);

    // Estatísticas gerais
    const stats = await db
      .select({
        totalPaid: sql<string>`SUM(CASE WHEN ${affiliateCommissions.status} = 'paid' AND (${affiliateCommissions.transferId} IS NOT NULL OR ${affiliateCommissions.pixTransferId} IS NOT NULL) THEN ${affiliateCommissions.commissionAmount} ELSE 0 END)`,
        totalPending: sql<string>`SUM(CASE WHEN ${affiliateCommissions.status} = 'approved' AND ${affiliateCommissions.transferError} IS NULL THEN ${affiliateCommissions.commissionAmount} ELSE 0 END)`,
        totalFailed: sql<string>`SUM(CASE WHEN ${affiliateCommissions.transferError} IS NOT NULL THEN ${affiliateCommissions.commissionAmount} ELSE 0 END)`,
        countPaid: sql<number>`COUNT(CASE WHEN ${affiliateCommissions.status} = 'paid' AND (${affiliateCommissions.transferId} IS NOT NULL OR ${affiliateCommissions.pixTransferId} IS NOT NULL) THEN 1 END)`,
        countPending: sql<number>`COUNT(CASE WHEN ${affiliateCommissions.status} = 'approved' AND ${affiliateCommissions.transferError} IS NULL THEN 1 END)`,
        countFailed: sql<number>`COUNT(CASE WHEN ${affiliateCommissions.transferError} IS NOT NULL THEN 1 END)`,
      })
      .from(affiliateCommissions);

    // Pagamentos recentes (últimas 24h)
    const recent24h = await db
      .select({
        count: sql<number>`COUNT(*)`,
        total: sql<string>`SUM(${affiliateCommissions.commissionAmount})`,
      })
      .from(affiliateCommissions)
      .where(
        and(
          eq(affiliateCommissions.status, 'paid'),
          or(
            isNotNull(affiliateCommissions.transferId),
            isNotNull(affiliateCommissions.pixTransferId)
          ),
          sql`${affiliateCommissions.paidAt} > NOW() - INTERVAL '24 hours'`
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        commissions,
        stats: stats[0] || {
          totalPaid: '0',
          totalPending: '0',
          totalFailed: '0',
          countPaid: 0,
          countPending: 0,
          countFailed: 0,
        },
        recent24h: recent24h[0] || { count: 0, total: '0' },
        pagination: {
          limit,
          offset,
          total: commissions.length,
        },
      },
    });
  } catch (error) {
    console.error('[Admin PIX Payouts] Erro:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar pagamentos',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pix-payouts - Retentar pagamento falhado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { commissionId } = body;

    if (!commissionId) {
      return NextResponse.json({ error: 'commissionId é obrigatório' }, { status: 400 });
    }

    // Buscar comissão
    const [commission] = await db
      .select()
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.id, commissionId))
      .limit(1);

    if (!commission) {
      return NextResponse.json({ error: 'Comissão não encontrada' }, { status: 404 });
    }

    if (commission.status === 'paid') {
      return NextResponse.json({ error: 'Comissão já foi paga' }, { status: 400 });
    }

    // Limpar erro e retentar
    await db
      .update(affiliateCommissions)
      .set({
        transferError: null,
        transferAttemptCount: 0,
      })
      .where(eq(affiliateCommissions.id, commissionId));

    // Processar pagamento
    const { processInstantAffiliatePayout } = await import('@/lib/affiliates/instant-payout');
    const result = await processInstantAffiliatePayout(commissionId, commission.orderId);

    return NextResponse.json({
      success: result.success,
      transferId: result.transferId,
      error: result.error,
      requiresManualReview: result.requiresManualReview,
    });
  } catch (error) {
    console.error('[Admin PIX Payouts] Erro ao retentar:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao retentar pagamento',
      },
      { status: 500 }
    );
  }
}
