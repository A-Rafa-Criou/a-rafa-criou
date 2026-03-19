import { db } from '@/lib/db';
import { affiliates, affiliateCommissions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { validateBeforePayment } from './commission-security';

export interface MercadoPagoPayoutResult {
  success: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
  requiresManualReview?: boolean;
  needsMercadoPagoOnboarding?: boolean;
}

function getMercadoPagoPlatformAccessToken(): string | null {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN_PROD || null;
}

function parseTransferId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const candidate = payload as Record<string, unknown>;
  const id = candidate.id;
  if (typeof id === 'string' || typeof id === 'number') {
    return String(id);
  }
  return undefined;
}

function parseTransferStatus(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'processing';
  const candidate = payload as Record<string, unknown>;
  const status = candidate.status;
  if (typeof status === 'string') {
    return status.toLowerCase();
  }
  return 'processing';
}

async function createTransferWithFallback(params: {
  accessToken: string;
  receiverId: string;
  amount: number;
  commissionId: string;
  orderId: string;
  affiliateName: string;
}): Promise<{ ok: true; transferId: string; rawStatus: string } | { ok: false; error: string }> {
  const { accessToken, receiverId, amount, commissionId, orderId, affiliateName } = params;

  const idempotencyKey = `commission_payout_mp_${commissionId}`;

  const primaryPayload = {
    receiver_id: receiverId,
    amount,
    external_reference: `commission_${commissionId}`,
    description: `Comissao venda #${orderId.slice(0, 8)} - ${affiliateName}`,
  };

  const primaryResponse = await fetch('https://api.mercadopago.com/v1/transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(primaryPayload),
  });

  const primaryText = await primaryResponse.text();

  if (primaryResponse.ok) {
    let primaryJson: unknown = {};
    try {
      primaryJson = JSON.parse(primaryText);
    } catch {
      // keep empty object
    }

    const transferId = parseTransferId(primaryJson);
    if (!transferId) {
      return { ok: false, error: 'Transferencia sem ID retornado por /v1/transfers' };
    }

    return { ok: true, transferId, rawStatus: parseTransferStatus(primaryJson) };
  }

  const fallbackPayload = {
    receiver_id: receiverId,
    amount,
    description: `Comissao venda #${orderId.slice(0, 8)} - ${affiliateName}`,
  };

  const fallbackResponse = await fetch('https://api.mercadopago.com/v1/money_transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Idempotency-Key': `${idempotencyKey}_fallback`,
    },
    body: JSON.stringify(fallbackPayload),
  });

  const fallbackText = await fallbackResponse.text();

  if (!fallbackResponse.ok) {
    const primaryError = primaryText.slice(0, 500);
    const fallbackError = fallbackText.slice(0, 500);
    return {
      ok: false,
      error: `Mercado Pago transfer falhou. /v1/transfers=${primaryResponse.status} ${primaryError} | /v1/money_transfers=${fallbackResponse.status} ${fallbackError}`,
    };
  }

  let fallbackJson: unknown = {};
  try {
    fallbackJson = JSON.parse(fallbackText);
  } catch {
    // keep empty object
  }

  const transferId = parseTransferId(fallbackJson);
  if (!transferId) {
    return { ok: false, error: 'Transferencia sem ID retornado por /v1/money_transfers' };
  }

  return { ok: true, transferId, rawStatus: parseTransferStatus(fallbackJson) };
}

export async function processMercadoPagoAffiliatePayout(
  commissionId: string,
  orderId: string
): Promise<MercadoPagoPayoutResult> {
  try {
    const [commission] = await db
      .select({
        id: affiliateCommissions.id,
        affiliateId: affiliateCommissions.affiliateId,
        commissionAmount: affiliateCommissions.commissionAmount,
        status: affiliateCommissions.status,
        pixTransferId: affiliateCommissions.pixTransferId,
        transferAttemptCount: affiliateCommissions.transferAttemptCount,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.id, commissionId))
      .limit(1);

    if (!commission) {
      return { success: false, error: 'Comissao nao encontrada' };
    }

    if (commission.status === 'paid') {
      return {
        success: true,
        transferId: commission.pixTransferId || 'already-paid',
        amount: parseFloat(commission.commissionAmount),
      };
    }

    if (commission.pixTransferId) {
      return {
        success: true,
        transferId: commission.pixTransferId,
        amount: parseFloat(commission.commissionAmount),
      };
    }

    const [affiliate] = await db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        name: affiliates.name,
        email: affiliates.email,
        mercadopagoAccountId: affiliates.mercadopagoAccountId,
        mercadopagoPayoutsEnabled: affiliates.mercadopagoPayoutsEnabled,
        mercadopagoSplitStatus: affiliates.mercadopagoSplitStatus,
      })
      .from(affiliates)
      .where(eq(affiliates.id, commission.affiliateId))
      .limit(1);

    if (!affiliate) {
      return { success: false, error: 'Afiliado nao encontrado' };
    }

    if (
      !affiliate.mercadopagoAccountId ||
      (!affiliate.mercadopagoPayoutsEnabled && affiliate.mercadopagoSplitStatus !== 'completed')
    ) {
      return {
        success: false,
        error: 'Afiliado sem Mercado Pago Split ativo',
        needsMercadoPagoOnboarding: true,
      };
    }

    const securityCheck = await validateBeforePayment(commissionId);
    if (!securityCheck.safe) {
      await db
        .update(affiliateCommissions)
        .set({
          status: 'pending',
          transferError: `Validacao de seguranca bloqueou pagamento: ${securityCheck.reasons.join('; ')}`,
          updatedAt: new Date(),
        })
        .where(eq(affiliateCommissions.id, commissionId));

      return {
        success: false,
        error: 'Pagamento bloqueado por validacao de seguranca',
        requiresManualReview: true,
      };
    }

    const amount = parseFloat(commission.commissionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Valor de comissao invalido' };
    }

    const accessToken = getMercadoPagoPlatformAccessToken();
    if (!accessToken) {
      return {
        success: false,
        error: 'MERCADOPAGO_ACCESS_TOKEN nao configurado para transferencias',
        requiresManualReview: true,
      };
    }

    const transferResult = await createTransferWithFallback({
      accessToken,
      receiverId: affiliate.mercadopagoAccountId,
      amount,
      commissionId,
      orderId,
      affiliateName: affiliate.name,
    });

    if (!transferResult.ok) {
      await db
        .update(affiliateCommissions)
        .set({
          transferError: transferResult.error,
          transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
          transferStatus: 'failed',
          lastTransferAttempt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(affiliateCommissions.id, commissionId));

      return {
        success: false,
        error: transferResult.error,
        requiresManualReview: (commission.transferAttemptCount || 0) >= 2,
      };
    }

    const status =
      transferResult.rawStatus === 'approved' || transferResult.rawStatus === 'completed'
        ? 'completed'
        : 'processing';

    await db
      .update(affiliateCommissions)
      .set({
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'mercadopago_split',
        pixTransferId: transferResult.transferId,
        transferStatus: status,
        transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
        transferError: null,
        lastTransferAttempt: new Date(),
        transferCompletedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(affiliateCommissions.id, commissionId));

    await db
      .update(affiliates)
      .set({
        paidCommission: sql`COALESCE(${affiliates.paidCommission}, 0) + ${commission.commissionAmount}`,
        pendingCommission: sql`GREATEST(COALESCE(${affiliates.pendingCommission}, 0) - ${commission.commissionAmount}, 0)`,
        lastPayoutAt: new Date(),
        totalPaidOut: sql`COALESCE(${affiliates.totalPaidOut}, 0) + ${commission.commissionAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    return {
      success: true,
      transferId: transferResult.transferId,
      amount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no payout Mercado Pago',
      requiresManualReview: true,
    };
  }
}
