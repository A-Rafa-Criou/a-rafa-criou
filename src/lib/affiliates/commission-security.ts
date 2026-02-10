/**
 * Validações de Segurança para Comissões de Afiliados
 *
 * Protege contra:
 * - Alteração manual de valores de comissão
 * - Alteração de porcentagens
 * - Fraude por criação de comissões falsas
 * - Duplicação de pagamentos
 *
 * Data: 06/02/2026 (Corrigido)
 */

import { db } from '@/lib/db';
import { orders, affiliateCommissions, affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Valida se valor da comissão não foi alterado desde a criação
 *
 * @returns true se válido, false se detectar adulteração
 */
export async function validateCommissionIntegrity(
  commissionId: string
): Promise<{ valid: boolean; reason?: string }> {
  console.log('[Security] 🔒 Validando integridade da comissão:', commissionId);

  // Buscar comissão e dados do pedido original
  const [commission] = await db
    .select({
      id: affiliateCommissions.id,
      orderId: affiliateCommissions.orderId,
      affiliateId: affiliateCommissions.affiliateId,
      orderTotal: affiliateCommissions.orderTotal,
      commissionRate: affiliateCommissions.commissionRate,
      commissionAmount: affiliateCommissions.commissionAmount,
    })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.id, commissionId))
    .limit(1);

  if (!commission) {
    return { valid: false, reason: 'Comissão não encontrada' };
  }

  // Buscar pedido original para validar valores
  const [order] = await db
    .select({
      id: orders.id,
      total: orders.total,
      affiliateId: orders.affiliateId,
    })
    .from(orders)
    .where(eq(orders.id, commission.orderId))
    .limit(1);

  if (!order) {
    return { valid: false, reason: 'Pedido original não encontrado' };
  }

  // VALIDAÇÃO 1: Verificar se affiliate_id do pedido corresponde à comissão
  if (order.affiliateId !== commission.affiliateId) {
    console.error(
      '[Security] ❌ FRAUDE DETECTADA: affiliateId da comissão não corresponde ao pedido'
    );
    return {
      valid: false,
      reason: 'AffiliateId inconsistente entre pedido e comissão',
    };
  }

  // VALIDAÇÃO 2: Verificar se total do pedido corresponde à comissão
  const orderTotalFloat = parseFloat(order.total);
  const commissionOrderTotalFloat = parseFloat(commission.orderTotal);

  if (Math.abs(orderTotalFloat - commissionOrderTotalFloat) > 0.01) {
    console.error('[Security] ❌ FRAUDE DETECTADA: Total do pedido alterado na comissão');
    return {
      valid: false,
      reason: `Total do pedido divergente: ${orderTotalFloat} vs ${commissionOrderTotalFloat}`,
    };
  }

  // VALIDAÇÃO 3: Recalcular comissão e verificar se corresponde
  const [affiliate] = await db
    .select({
      commissionValue: affiliates.commissionValue,
    })
    .from(affiliates)
    .where(eq(affiliates.id, commission.affiliateId))
    .limit(1);

  if (!affiliate) {
    return { valid: false, reason: 'Afiliado não encontrado' };
  }

  const expectedCommissionRate = parseFloat(affiliate.commissionValue);
  const actualCommissionRate = parseFloat(commission.commissionRate);

  // Verificar se taxa de comissão está correta
  if (Math.abs(expectedCommissionRate - actualCommissionRate) > 0.01) {
    console.error('[Security] ❌ FRAUDE DETECTADA: Taxa de comissão alterada');
    return {
      valid: false,
      reason: `Taxa de comissão divergente: esperado ${expectedCommissionRate}%, recebido ${actualCommissionRate}%`,
    };
  }

  // VALIDAÇÃO 4: Recalcular valor da comissão
  const expectedCommissionAmount = (orderTotalFloat * expectedCommissionRate) / 100;
  const actualCommissionAmount = parseFloat(commission.commissionAmount);

  if (Math.abs(expectedCommissionAmount - actualCommissionAmount) > 0.01) {
    console.error('[Security] ❌ FRAUDE DETECTADA: Valor da comissão alterado');
    return {
      valid: false,
      reason: `Valor da comissão divergente: esperado R$ ${expectedCommissionAmount.toFixed(2)}, recebido R$ ${actualCommissionAmount.toFixed(2)}`,
    };
  }

  console.log('[Security] ✅ Comissão válida e íntegra');
  return { valid: true };
}

/**
 * Valida comissão antes de processar pagamento automático (Stripe Connect)
 *
 * Garante que valores não foram adulterados e que a comissão não foi paga
 */
export async function validateBeforePayment(
  commissionId: string
): Promise<{ safe: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Validar integridade
  const integrityCheck = await validateCommissionIntegrity(commissionId);
  if (!integrityCheck.valid) {
    reasons.push(integrityCheck.reason || 'Falha na validação de integridade');
    return { safe: false, reasons };
  }

  // Validar se não foi paga antes (evitar duplicação)
  const [commission] = await db
    .select({
      status: affiliateCommissions.status,
      transferId: affiliateCommissions.transferId,
      pixTransferId: affiliateCommissions.pixTransferId,
      paidAt: affiliateCommissions.paidAt,
    })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.id, commissionId))
    .limit(1);

  if (!commission) {
    reasons.push('Comissão não encontrada');
    return { safe: false, reasons };
  }

  // Verificar duplicação: status paid OU qualquer transferId já registrado
  if (commission.status === 'paid' || commission.transferId || commission.pixTransferId) {
    reasons.push('Comissão já foi paga anteriormente');
    return { safe: false, reasons };
  }

  return { safe: true, reasons: [] };
}
