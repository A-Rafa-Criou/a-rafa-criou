import { db } from '@/lib/db';
import { affiliateClicks, orders, affiliates, affiliateCommissions } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

interface FraudCheckResult {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number; // 0-100
}

/**
 * Detecta possíveis fraudes em comissões de afiliados
 */
export async function detectAffiliateFraud(
  affiliateId: string,
  orderId: string,
  orderEmail: string,
  orderIp?: string
): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let riskScore = 0;

  try {
    // 1. Verificar múltiplos pedidos do mesmo IP em curto período (últimas 24h)
    if (orderIp && orderIp !== 'unknown') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [sameIpOrders] = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(affiliateClicks)
        .where(
          and(
            eq(affiliateClicks.affiliateId, affiliateId),
            eq(affiliateClicks.ip, orderIp),
            eq(affiliateClicks.converted, true),
            gte(affiliateClicks.clickedAt, oneDayAgo)
          )
        );

      if (sameIpOrders.count > 3) {
        reasons.push(`Múltiplos pedidos (${sameIpOrders.count}) do mesmo IP nas últimas 24h`);
        riskScore += 30;
      } else if (sameIpOrders.count > 1) {
        reasons.push(`${sameIpOrders.count} pedidos do mesmo IP nas últimas 24h`);
        riskScore += 15;
      }
    }

    // 2. Verificar se o afiliado está comprando seus próprios produtos
    const [affiliate] = await db
      .select({
        email: affiliates.email,
        userId: affiliates.userId,
      })
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (affiliate) {
      // Verificar email
      if (affiliate.email.toLowerCase() === orderEmail.toLowerCase()) {
        reasons.push('Email do pedido é o mesmo do afiliado (auto-referral)');
        riskScore += 50;
      }

      // Verificar se userId do pedido é o mesmo do afiliado
      const [order] = await db
        .select({ userId: orders.userId })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (order?.userId && order.userId === affiliate.userId) {
        reasons.push('Usuário do pedido é o mesmo do afiliado (auto-referral)');
        riskScore += 50;
      }
    }

    // 3. Verificar alta taxa de conversão em curto período (suspeito)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const [recentActivity] = await db
      .select({
        totalClicks: sql<number>`count(*)::int`,
        conversions: sql<number>`sum(case when ${affiliateClicks.converted} = true then 1 else 0 end)::int`,
      })
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.affiliateId, affiliateId),
          gte(affiliateClicks.clickedAt, threeDaysAgo)
        )
      );

    if (recentActivity.totalClicks > 0) {
      const conversionRate = (recentActivity.conversions / recentActivity.totalClicks) * 100;

      // Taxa de conversão acima de 50% é suspeita (normal é 1-5%)
      if (conversionRate > 50) {
        reasons.push(
          `Taxa de conversão muito alta (${conversionRate.toFixed(1)}%) - esperado 1-5%`
        );
        riskScore += 25;
      } else if (conversionRate > 25) {
        reasons.push(`Taxa de conversão alta (${conversionRate.toFixed(1)}%)`);
        riskScore += 10;
      }
    }

    // 4. Verificar cliques sem delay (bot)
    const [recentClick] = await db
      .select({
        clickedAt: affiliateClicks.clickedAt,
      })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, affiliateId))
      .orderBy(sql`${affiliateClicks.clickedAt} DESC`)
      .limit(1);

    if (recentClick) {
      const timeSinceClick = Date.now() - recentClick.clickedAt.getTime();
      const secondsSinceClick = timeSinceClick / 1000;

      // Menos de 5 segundos entre clique e compra é suspeito
      if (secondsSinceClick < 5) {
        reasons.push(
          `Compra muito rápida após clique (${secondsSinceClick.toFixed(1)}s) - possível bot`
        );
        riskScore += 30;
      } else if (secondsSinceClick < 30) {
        reasons.push(`Compra rápida após clique (${secondsSinceClick.toFixed(1)}s)`);
        riskScore += 10;
      }
    }

    // 5. Limitar score máximo em 100
    riskScore = Math.min(riskScore, 100);

    return {
      isSuspicious: riskScore >= 50,
      reasons,
      riskScore,
    };
  } catch (error) {
    console.error('Erro ao verificar fraude de afiliado:', error);
    return {
      isSuspicious: false,
      reasons: ['Erro ao verificar fraude'],
      riskScore: 0,
    };
  }
}

/**
 * Cria comissão de afiliado para um pedido
 * Inclui validação de fraude automática
 */
export async function createAffiliateCommission(
  orderId: string,
  affiliateId: string,
  orderTotal: number,
  currency: string = 'BRL'
): Promise<{ success: boolean; commissionId?: string; fraudCheck?: FraudCheckResult }> {
  try {
    // Buscar afiliado
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        status: affiliates.status,
        commissionValue: affiliates.commissionValue,
      })
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate || affiliate.status !== 'active') {
      return { success: false };
    }

    // Buscar pedido
    const [order] = await db
      .select({
        email: orders.email,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false };
    }

    // Verificar fraude
    const fraudCheck = await detectAffiliateFraud(affiliateId, orderId, order.email);

    // Calcular comissão
    const commissionRate = parseFloat(affiliate.commissionValue.toString());
    const commissionAmount = (orderTotal * commissionRate) / 100;

    // Criar comissão (status automático baseado em risco)
    const [commission] = await db
      .insert(affiliateCommissions)
      .values({
        affiliateId,
        orderId,
        orderTotal: orderTotal.toString(),
        commissionRate: commissionRate.toString(),
        commissionAmount: commissionAmount.toString(),
        currency,
        status: fraudCheck.isSuspicious ? 'pending' : 'pending', // Sempre pending, admin aprova manualmente
        notes: fraudCheck.isSuspicious
          ? `⚠️ SUSPEITA DE FRAUDE (Score: ${fraudCheck.riskScore}): ${fraudCheck.reasons.join('; ')}`
          : null,
      })
      .returning();

    // Atualizar estatísticas do afiliado
    await db
      .update(affiliates)
      .set({
        totalOrders: sql`${affiliates.totalOrders} + 1`,
        totalRevenue: sql`${affiliates.totalRevenue} + ${orderTotal}`,
        totalCommission: sql`${affiliates.totalCommission} + ${commissionAmount}`,
        pendingCommission: sql`${affiliates.pendingCommission} + ${commissionAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliateId));

    return {
      success: true,
      commissionId: commission.id,
      fraudCheck,
    };
  } catch (error) {
    console.error('Erro ao criar comissão de afiliado:', error);
    return { success: false };
  }
}
