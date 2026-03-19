import { db } from '@/lib/db';
import { affiliates, affiliateCommissions, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { processInstantAffiliatePayout } from './instant-payout';
import { processMercadoPagoAffiliatePayout } from './mercadopago-payout';

export interface AutomaticPayoutResult {
  success: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
  requiresManualReview?: boolean;
  needsStripeOnboarding?: boolean;
  needsMercadoPagoOnboarding?: boolean;
}

export async function processAutomaticAffiliatePayout(
  commissionId: string,
  orderId: string
): Promise<AutomaticPayoutResult> {
  const [record] = await db
    .select({
      affiliateId: affiliateCommissions.affiliateId,
      preferredPaymentMethod: affiliates.preferredPaymentMethod,
      stripeAccountId: affiliates.stripeAccountId,
      stripePayoutsEnabled: affiliates.stripePayoutsEnabled,
      mercadopagoAccountId: affiliates.mercadopagoAccountId,
      mercadopagoPayoutsEnabled: affiliates.mercadopagoPayoutsEnabled,
      mercadopagoSplitStatus: affiliates.mercadopagoSplitStatus,
      paymentProvider: orders.paymentProvider,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliateCommissions.affiliateId, affiliates.id))
    .leftJoin(orders, eq(affiliateCommissions.orderId, orders.id))
    .where(eq(affiliateCommissions.id, commissionId))
    .limit(1);

  if (!record) {
    return { success: false, error: 'Comissao ou afiliado nao encontrado' };
  }

  const canUseMercadoPago =
    !!record.mercadopagoAccountId &&
    (!!record.mercadopagoPayoutsEnabled || record.mercadopagoSplitStatus === 'completed');

  const canUseStripe = !!record.stripeAccountId && !!record.stripePayoutsEnabled;

  const isMercadoPagoOrder =
    record.paymentProvider === 'mercadopago' || record.paymentProvider === 'pix';

  if (isMercadoPagoOrder && canUseMercadoPago) {
    return processMercadoPagoAffiliatePayout(commissionId, orderId);
  }

  if (record.preferredPaymentMethod === 'mercadopago_split' && canUseMercadoPago) {
    const mercadoPagoResult = await processMercadoPagoAffiliatePayout(commissionId, orderId);
    if (mercadoPagoResult.success || !canUseStripe) {
      return mercadoPagoResult;
    }

    const stripeFallback = await processInstantAffiliatePayout(commissionId, orderId);
    if (stripeFallback.success) {
      return stripeFallback;
    }

    return {
      ...mercadoPagoResult,
      error: `${mercadoPagoResult.error || 'Falha Mercado Pago'} | Fallback Stripe: ${stripeFallback.error || 'falhou'}`,
    };
  }

  if (canUseStripe) {
    return processInstantAffiliatePayout(commissionId, orderId);
  }

  if (canUseMercadoPago) {
    return processMercadoPagoAffiliatePayout(commissionId, orderId);
  }

  return {
    success: false,
    error: 'Afiliado sem metodo de payout ativo (Stripe ou Mercado Pago)',
    needsStripeOnboarding: !canUseStripe,
    needsMercadoPagoOnboarding: !canUseMercadoPago,
  };
}
