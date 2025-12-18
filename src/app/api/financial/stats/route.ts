import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, affiliateCommissions, affiliates } from '@/lib/db/schema';
import { sql, eq, and, gte, lt } from 'drizzle-orm';
import { requireFinancialAccess } from '@/lib/auth/financial-guard';

export async function GET() {
  try {
    // Validar acesso
    await requireFinancialAccess();

    // Calcular início e fim do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Buscar vendas do mês (orders com status 'completed')
    const monthSales = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          gte(orders.createdAt, startOfMonth),
          lt(orders.createdAt, startOfNextMonth)
        )
      );

    const monthRevenue = monthSales[0]?.total || 0;
    const totalSales = monthSales[0]?.count || 0;

    // Buscar comissões pendentes (status 'pending')
    const pendingComms = await db
      .select({
        total: sql<number>`COALESCE(SUM(${affiliateCommissions.commissionAmount}), 0)`,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.status, 'pending'));

    const pendingCommissions = pendingComms[0]?.total || 0;

    // Buscar afiliados ativos
    const activeAffs = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(affiliates)
      .where(eq(affiliates.status, 'active'));

    const activeAffiliates = activeAffs[0]?.count || 0;

    // TODO: Implementar despesas quando tabela for criada
    const monthExpenses = 0;
    const monthBalance = monthRevenue - monthExpenses;

    return NextResponse.json({
      monthRevenue,
      monthExpenses,
      monthBalance,
      activeAffiliates,
      pendingCommissions,
      totalSales,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas financeiras:', error);

    if (error instanceof Error && error.message.includes('acesso não autorizado')) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
