import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateLinks, affiliateCommissions, affiliateClicks } from '@/lib/db/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Timezone de Brasília
const BRAZIL_TZ = 'America/Sao_Paulo';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Usuário não é um afiliado' }, { status: 403 });
    }

    if (affiliate.status === 'pending') {
      return NextResponse.json({
        status: 'pending',
        message: 'Sua candidatura está em análise',
        affiliate: {
          name: affiliate.name,
          email: affiliate.email,
          createdAt: affiliate.createdAt,
        },
      });
    }

    if (affiliate.status === 'inactive' || affiliate.status === 'suspended') {
      return NextResponse.json({
        status: affiliate.status,
        message:
          affiliate.status === 'inactive'
            ? 'Sua conta de afiliado está inativa'
            : 'Sua conta de afiliado está suspensa',
        affiliate: {
          name: affiliate.name,
          email: affiliate.email,
        },
      });
    }

    // Buscar links do afiliado
    const links = await db.query.affiliateLinks.findMany({
      where: eq(affiliateLinks.affiliateId, affiliate.id),
      orderBy: desc(affiliateLinks.clicks),
      limit: 10,
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Buscar comissões do afiliado
    const commissions = await db.query.affiliateCommissions.findMany({
      where: eq(affiliateCommissions.affiliateId, affiliate.id),
      orderBy: desc(affiliateCommissions.createdAt),
      limit: 20,
      with: {
        order: {
          columns: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    // Buscar estatísticas dos últimos 30 dias no horário de Brasília
    const nowBrazil = toZonedTime(new Date(), BRAZIL_TZ);
    const localThirtyDaysAgo = new Date(nowBrazil);
    localThirtyDaysAgo.setDate(localThirtyDaysAgo.getDate() - 30);
    localThirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = fromZonedTime(localThirtyDaysAgo, BRAZIL_TZ);

    const recentClicks = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.affiliateId, affiliate.id),
          gte(affiliateClicks.clickedAt, thirtyDaysAgo)
        )
      );

    const recentConversions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.affiliateId, affiliate.id),
          eq(affiliateClicks.converted, true),
          gte(affiliateClicks.clickedAt, thirtyDaysAgo)
        )
      );

    const recentRevenue = await db
      .select({ total: sql<string>`COALESCE(SUM(commission_amount), 0)::text` })
      .from(affiliateCommissions)
      .where(
        and(
          eq(affiliateCommissions.affiliateId, affiliate.id),
          gte(affiliateCommissions.createdAt, thirtyDaysAgo)
        )
      );

    // Calcular taxa de conversão
    const conversionRate =
      affiliate.totalClicks && affiliate.totalClicks > 0
        ? (((affiliate.totalOrders || 0) / affiliate.totalClicks) * 100).toFixed(2)
        : '0.00';

    return NextResponse.json({
      status: 'active',
      affiliate: {
        id: affiliate.id,
        code: affiliate.code,
        customSlug: affiliate.customSlug,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        commissionValue: affiliate.commissionValue,
        commissionType: affiliate.commissionType,
        pixKey: affiliate.pixKey,
        bankName: affiliate.bankName,
        bankAccount: affiliate.bankAccount,
        approvedAt: affiliate.approvedAt,
      },
      stats: {
        totalClicks: affiliate.totalClicks || 0,
        totalConversions: affiliate.totalOrders || 0,
        totalRevenue: affiliate.totalRevenue || '0',
        pendingCommission: affiliate.pendingCommission || '0',
        paidCommission: affiliate.paidCommission || '0',
        conversionRate,
        last30Days: {
          clicks: recentClicks[0]?.count || 0,
          conversions: recentConversions[0]?.count || 0,
          revenue: recentRevenue[0]?.total || '0',
        },
      },
      links: links.map(link => ({
        id: link.id,
        url: link.url,
        shortCode: link.shortCode,
        customName: link.customName,
        clicks: link.clicks,
        conversions: link.conversions,
        revenue: link.revenue,
        product: link.product,
        isActive: link.isActive,
      })),
      commissions: commissions.map(commission => ({
        id: commission.id,
        orderTotal: commission.orderTotal,
        commissionRate: commission.commissionRate,
        commissionAmount: commission.commissionAmount,
        currency: commission.currency || 'BRL', // 🔄 Adicionar moeda
        status: commission.status,
        createdAt: commission.createdAt,
        approvedAt: commission.approvedAt,
        paidAt: commission.paidAt,
        paymentProof: commission.paymentProof, // 🔄 Comprovante
        order: commission.order,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard do afiliado:', error);
    return NextResponse.json({ message: 'Erro ao buscar dashboard' }, { status: 500 });
  }
}
