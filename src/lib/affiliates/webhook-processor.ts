import { db } from '@/lib/db';
import { orders, affiliates, affiliateClicks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAffiliateCommission } from './fraud-detection';

/**
 * Processa comissão de afiliado após pagamento confirmado
 * Chamado pelos webhooks Stripe e PayPal
 */
export async function processAffiliateCommission(orderId: string): Promise<void> {
  try {
    // Buscar pedido
    const [order] = await db
      .select({
        id: orders.id,
        affiliateId: orders.affiliateId,
        affiliateLinkId: orders.affiliateLinkId,
        total: orders.total,
        currency: orders.currency,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      console.log('[Affiliate] Pedido não encontrado:', orderId);
      return;
    }

    // Se já tem afiliado associado, significa que já foi processado
    if (order.affiliateId) {
      console.log('[Affiliate] Comissão já processada para pedido:', orderId);
      return;
    }

    // Buscar cookies de afiliado (simulando leitura de cookies - na prática viria do request)
    // NOTA: Em webhooks, não temos acesso aos cookies do cliente
    // A solução é: no momento da criação do pedido (create-payment), já salvar affiliateId e affiliateLinkId
    // Por ora, vamos apenas logar e não processar
    console.log(
      '[Affiliate] ⚠️ Pedido sem afiliado associado. Certifique-se de salvar affiliateId na criação do pedido.'
    );
  } catch (error) {
    console.error('[Affiliate] Erro ao processar comissão:', error);
    // Não lançar erro para não bloquear webhook
  }
}

/**
 * Associa pedido ao afiliado e cria comissão
 * Deve ser chamado quando o pedido é CRIADO (antes do pagamento)
 */
export async function associateOrderToAffiliate(
  orderId: string,
  affiliateCode: string | null,
  affiliateClickId: string | null
): Promise<void> {
  try {
    if (!affiliateCode && !affiliateClickId) {
      return; // Sem afiliado
    }

    let affiliateId: string | null = null;
    let linkId: string | null = null;

    // 1. Se temos clickId, buscar o click
    if (affiliateClickId) {
      const [click] = await db
        .select({
          affiliateId: affiliateClicks.affiliateId,
          linkId: affiliateClicks.linkId,
        })
        .from(affiliateClicks)
        .where(eq(affiliateClicks.id, affiliateClickId))
        .limit(1);

      if (click) {
        affiliateId = click.affiliateId;
        linkId = click.linkId;
      }
    }

    // 2. Se não encontrou por clickId, buscar por código
    if (!affiliateId && affiliateCode) {
      const [affiliate] = await db
        .select({ id: affiliates.id })
        .from(affiliates)
        .where(and(eq(affiliates.code, affiliateCode), eq(affiliates.status, 'active')))
        .limit(1);

      if (affiliate) {
        affiliateId = affiliate.id;
      }
    }

    if (!affiliateId) {
      console.log('[Affiliate] Afiliado não encontrado para código:', affiliateCode);
      return;
    }

    // 3. Associar pedido ao afiliado
    await db
      .update(orders)
      .set({
        affiliateId,
        affiliateLinkId: linkId,
      })
      .where(eq(orders.id, orderId));

    console.log('[Affiliate] ✅ Pedido associado ao afiliado:', affiliateId);

    // 4. Marcar click como convertido (se temos clickId)
    if (affiliateClickId) {
      await db
        .update(affiliateClicks)
        .set({
          converted: true,
        })
        .where(eq(affiliateClicks.id, affiliateClickId));

      console.log('[Affiliate] ✅ Click marcado como convertido');
    }
  } catch (error) {
    console.error('[Affiliate] Erro ao associar pedido ao afiliado:', error);
  }
}

/**
 * Cria comissão de afiliado após pagamento confirmado
 * Deve ser chamado nos webhooks quando status = completed e paymentStatus = paid
 */
export async function createCommissionForPaidOrder(orderId: string): Promise<void> {
  try {
    // Buscar pedido
    const [order] = await db
      .select({
        id: orders.id,
        affiliateId: orders.affiliateId,
        total: orders.total,
        currency: orders.currency,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      console.log('[Affiliate] Pedido não encontrado:', orderId);
      return;
    }

    // Verificar se tem afiliado associado
    if (!order.affiliateId) {
      console.log('[Affiliate] Pedido sem afiliado associado:', orderId);
      return;
    }

    // Verificar se pagamento está confirmado
    if (order.status !== 'completed' || order.paymentStatus !== 'paid') {
      console.log('[Affiliate] Pedido ainda não pago:', orderId);
      return;
    }

    // Criar comissão
    const result = await createAffiliateCommission(
      orderId,
      order.affiliateId,
      parseFloat(order.total),
      order.currency
    );

    if (result.success) {
      console.log('[Affiliate] ✅ Comissão criada:', result.commissionId);
      if (result.fraudCheck?.isSuspicious) {
        console.warn('[Affiliate] ⚠️ SUSPEITA DE FRAUDE:', result.fraudCheck.reasons.join('; '));
      }
    } else {
      console.log('[Affiliate] ❌ Falha ao criar comissão');
    }
  } catch (error) {
    console.error('[Affiliate] Erro ao criar comissão:', error);
  }
}
