import { db } from '@/lib/db';
import { orders, affiliates, affiliateClicks, affiliateCommissions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createAffiliateCommission, commissionExistsForOrder } from './fraud-detection';
import {
  sendAffiliateSaleNotificationEmail,
  sendAdminAffiliateSaleNotification,
} from '@/lib/email/affiliates';
import { sendWebPushToAdmins } from '@/lib/notifications/channels/web-push';

/**
 * Associa pedido ao afiliado e cria comissão
 * Deve ser chamado quando o pedido é CRIADO (antes do pagamento)
 * @returns true se associou com sucesso, false caso contrário
 */
export async function associateOrderToAffiliate(
  orderId: string,
  affiliateCode: string | null,
  affiliateClickId: string | null
): Promise<boolean> {
  try {
    if (!affiliateCode && !affiliateClickId) {
      console.log('[Affiliate] ℹ️ Nenhum código ou click ID fornecido - pedido sem afiliado');
      return false;
    }

    let affiliateId: string | null = null;
    let linkId: string | null = null;

    // 1. Se temos clickId, buscar o click
    if (affiliateClickId) {
      console.log('[Affiliate] 🔍 Buscando afiliado por clickId:', affiliateClickId);
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
        console.log('[Affiliate] ✅ Afiliado encontrado por clickId:', affiliateId);
      } else {
        console.warn('[Affiliate] ⚠️ Click ID não encontrado:', affiliateClickId);
      }
    }

    // 2. Se não encontrou por clickId, buscar por código ou customSlug
    if (!affiliateId && affiliateCode) {
      console.log('[Affiliate] 🔍 Buscando afiliado por código:', affiliateCode);
      const [affiliate] = await db
        .select({ id: affiliates.id, status: affiliates.status })
        .from(affiliates)
        .where(
          and(
            sql`(${affiliates.code} = ${affiliateCode} OR ${affiliates.customSlug} = ${affiliateCode})`,
            eq(affiliates.status, 'active')
          )
        )
        .limit(1);

      if (affiliate) {
        affiliateId = affiliate.id;
        console.log('[Affiliate] ✅ Afiliado encontrado por código:', affiliateId);
      } else {
        console.warn(
          '[Affiliate] ⚠️ Afiliado não encontrado ou inativo para código:',
          affiliateCode
        );
        // Buscar para diagnosticar
        const [allAffiliates] = await db
          .select({ id: affiliates.id, status: affiliates.status })
          .from(affiliates)
          .where(
            sql`(${affiliates.code} = ${affiliateCode} OR ${affiliates.customSlug} = ${affiliateCode})`
          )
          .limit(1);

        if (allAffiliates) {
          console.warn('[Affiliate] ⚠️ Afiliado encontrado pero com status:', allAffiliates.status);
        }
      }
    }

    if (!affiliateId) {
      console.log(
        '[Affiliate] ❌ Afiliado não encontrado para código:',
        affiliateCode,
        'clickId:',
        affiliateClickId
      );
      return false;
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

    return true;
  } catch (error) {
    console.error(
      '[Affiliate] ❌ Erro ao associar pedido ao afiliado:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Cria comissão de afiliado após pagamento confirmado
 * IMPORTANTE: Apenas para afiliados COMUNS (common) - afiliados comerciais NÃO recebem comissão
 * Deve ser chamado nos webhooks quando status = completed e paymentStatus = paid
 */
export async function createCommissionForPaidOrder(
  orderId: string,
  isDestinationCharge: boolean = false,
  destinationTransferId?: string
): Promise<void> {
  try {
    // Buscar pedido
    const [order] = await db
      .select({
        id: orders.id,
        affiliateId: orders.affiliateId,
        email: orders.email,
        total: orders.total,
        currency: orders.currency,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      console.log('[Affiliate] 💰 Pedido não encontrado:', orderId);
      return;
    }

    // ✅ IDEMPOTÊNCIA: Verificar se já existe comissão para este pedido
    const existingCheck = await commissionExistsForOrder(orderId);
    if (existingCheck.exists) {
      console.log(
        `[Affiliate] 💰 Comissão já existe para pedido ${orderId}: ${existingCheck.commissionId} - ignorando`
      );
      return;
    }

    if (!order.affiliateId) {
      console.warn(
        '[Affiliate] 🚨 ALERTA: Pedido SEM afiliado associado - NENHUMA comissão será criada!'
      );
      console.warn('[Affiliate] 📊 Pedido:', {
        id: orderId,
        email: order.email,
        total: order.total,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        status: order.status,
      });
      console.warn('[Affiliate] 💡 Possíveis causas:');
      console.warn('   1. Cookie "affiliate_code" não foi enviado na criação do pedido');
      console.warn('   2. Código de afiliado no cookie não corresponde a um afiliado ATIVO');
      console.warn('   3. Função associateOrderToAffiliate() falhou silenciosamente');
      console.warn('   4. Afiliado foi desativado após o pedido ser criado');
      console.warn(
        '[Affiliate] 🔗 Para diagnosticar, use: GET /api/debug/affiliate-diagnosis?orderId=' +
          orderId
      );
      return;
    }

    // Buscar tipo de afiliado
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        affiliateType: affiliates.affiliateType,
        code: affiliates.code,
        name: affiliates.name,
        email: affiliates.email,
        status: affiliates.status,
        commissionValue: affiliates.commissionValue,
      })
      .from(affiliates)
      .where(eq(affiliates.id, order.affiliateId))
      .limit(1);

    if (!affiliate) {
      console.log('[Affiliate] 💰 Afiliado não encontrado:', order.affiliateId);
      return;
    }

    // ⚠️ REGRA CRÍTICA: Licença comercial NÃO recebe comissão (apenas acesso a arquivos)
    if (affiliate.affiliateType === 'commercial_license') {
      console.log(
        `[Affiliate] 💰 Afiliado "${affiliate.name}" tem licença COMERCIAL - NÃO recebe comissão`
      );
      console.log('[Affiliate] 💰 Licença comercial só recebe acesso aos arquivos, não comissão');
      return;
    }

    // Verificar se pagamento está confirmado
    if (order.status !== 'completed' || order.paymentStatus !== 'paid') {
      console.log('[Affiliate] 💰 Pedido ainda não pago:', orderId);
      return;
    }

    // Verificar se total é maior que zero (produtos pagos)
    const orderTotal = parseFloat(order.total);
    if (orderTotal <= 0) {
      console.log('[Affiliate] 💰 Pedido gratuito - sem comissão');
      return;
    }

    console.log(`[Affiliate] 💰 Criando comissão para afiliado COMUM: ${affiliate.name}`);

    // Criar comissão
    const result = await createAffiliateCommission(
      orderId,
      order.affiliateId,
      orderTotal,
      order.currency
    );

    if (result.success) {
      console.log('[Affiliate] ✅ Comissão criada:', result.commissionId);
      if (result.fraudCheck?.isSuspicious) {
        console.warn('[Affiliate] ⚠️ SUSPEITA DE FRAUDE:', result.fraudCheck.reasons.join('; '));
      }

      // 💸 PAGAMENTO VIA STRIPE CONNECT
      if (result.fraudCheck?.isSuspicious) {
        console.warn(
          `[Affiliate] ⚠️ Comissão suspeita - pagamento automático BLOQUEADO. Requer revisão manual.`
        );
      } else if (isDestinationCharge && destinationTransferId) {
        // ✅ DESTINATION CHARGE: Stripe já fez a transferência automaticamente!
        console.log(
          `[Affiliate] ✅ Destination Charge: transferência já realizada pelo Stripe: ${destinationTransferId}`
        );

        // Marcar comissão como paga
        await db
          .update(affiliateCommissions)
          .set({
            status: 'paid',
            paidAt: new Date(),
            transferId: destinationTransferId,
            transferStatus: 'completed',
            paymentMethod: 'stripe_connect',
            lastTransferAttempt: new Date(),
            transferAttemptCount: 1,
            updatedAt: new Date(),
          })
          .where(eq(affiliateCommissions.id, result.commissionId!));

        // Atualizar saldos do afiliado
        const commissionRate = parseFloat(affiliate.commissionValue || '20');
        const commissionAmount = (orderTotal * commissionRate) / 100;
        await db
          .update(affiliates)
          .set({
            paidCommission: sql`COALESCE(${affiliates.paidCommission}, 0) + ${commissionAmount}`,
            pendingCommission: sql`GREATEST(COALESCE(${affiliates.pendingCommission}, 0) - ${commissionAmount}, 0)`,
            lastPayoutAt: new Date(),
            totalPaidOut: sql`COALESCE(${affiliates.totalPaidOut}, 0) + ${commissionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, affiliate.id));

        console.log(
          `[Affiliate] ✅ Pagamento automático (destination charge) concluído: R$ ${commissionAmount.toFixed(2)} (${destinationTransferId})`
        );
      } else {
        // Fluxo unificado: escolhe automaticamente Stripe ou Mercado Pago conforme contexto
        console.log('[Affiliate] 💸 Iniciando pagamento automático de comissão (auto-dispatch)...');
        const { processAutomaticAffiliatePayout } = await import('./payout-dispatcher');

        const payoutResult = await processAutomaticAffiliatePayout(result.commissionId!, orderId);

        if (payoutResult.success) {
          console.log(
            `[Affiliate] ✅ Pagamento automático concluído: R$ ${payoutResult.amount} (${payoutResult.transferId})`
          );
        } else if (payoutResult.requiresManualReview) {
          console.warn(`[Affiliate] ⚠️ Pagamento retido para revisão: ${payoutResult.error}`);
        } else if (payoutResult.needsMercadoPagoOnboarding) {
          console.log(
            `[Affiliate] ℹ️ Afiliado sem Mercado Pago ativo - comissão ficará pendente: ${payoutResult.error}`
          );
        } else if (payoutResult.needsStripeOnboarding) {
          console.log(
            `[Affiliate] ℹ️ Afiliado sem Stripe Connect - comissão ficará pendente: ${payoutResult.error}`
          );
        } else {
          console.log(`[Affiliate] ℹ️ Pagamento automático não realizado: ${payoutResult.error}`);
        }
      }

      // Enviar email de notificação de VENDA para afiliado comum
      console.log('[Affiliate] 📧 Enviando notificação de venda para afiliado comum...');

      // Buscar itens do pedido para mostrar no email
      const orderData = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          items: {
            with: {
              product: true,
            },
          },
        },
      });

      if (orderData && orderData.items) {
        const productNames = orderData.items.map(item => item.product?.name || item.name);
        const commissionRate = parseFloat(affiliate.commissionValue || '20');
        const commission = (orderTotal * commissionRate) / 100;

        // Notificar afiliado por email
        sendAffiliateSaleNotificationEmail({
          to: affiliate.email,
          name: affiliate.name,
          affiliateType: 'common',
          productNames,
          orderTotal,
          currency: order.currency,
          commission,
          buyerEmail: orderData.email,
        }).catch(err => {
          console.error('[Affiliate] ❌ Erro ao enviar email de notificação ao afiliado:', err);
        });

        // Notificar admin por email sobre venda via afiliado
        sendAdminAffiliateSaleNotification({
          affiliateName: affiliate.name,
          affiliateCode: affiliate.code || '',
          affiliateType: (affiliate.affiliateType as 'common' | 'commercial_license') || 'common',
          customerName: orderData.email,
          customerEmail: orderData.email,
          orderId,
          productNames,
          orderTotal: orderTotal.toFixed(2),
          currency: order.currency,
          commission: commission.toFixed(2),
        }).catch(err => {
          console.error('[Affiliate] ❌ Erro ao enviar email de notificação ao admin:', err);
        });

        // Web Push para admin sobre venda via afiliado
        sendWebPushToAdmins({
          title: '💰 Venda via Afiliado',
          body: `${affiliate.name} gerou venda de ${order.currency} ${orderTotal.toFixed(2)}\nComissão: ${order.currency} ${commission.toFixed(2)}`,
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br'}/admin/afiliados`,
          data: {
            type: 'affiliate_sale',
            affiliateName: affiliate.name,
            orderId,
          },
        }).catch(err => {
          console.error('[Affiliate] ❌ Erro ao enviar web push:', err);
        });
      }
    } else {
      console.log('[Affiliate] ❌ Falha ao criar comissão');
    }
  } catch (error) {
    console.error('[Affiliate] Erro ao criar comissão:', error);
  }
}
