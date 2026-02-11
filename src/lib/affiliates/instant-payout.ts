import { db } from '@/lib/db';
import { affiliates, affiliateCommissions, orders } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { validateBeforePayment } from './commission-security';
import { stripe } from '@/lib/stripe';

interface InstantPayoutResult {
  success: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
  requiresManualReview?: boolean;
  /** true se afiliado precisa completar onboarding Stripe */
  needsStripeOnboarding?: boolean;
}

/**
 * Processa pagamento automático para afiliado via Stripe Connect
 *
 * Chamado pelos webhooks Stripe/PayPal/MercadoPago quando status = paid
 *
 * @param commissionId - ID da comissão recém-criada
 * @param orderId - ID do pedido (para logs e metadata)
 */
export async function processInstantAffiliatePayout(
  commissionId: string,
  orderId: string
): Promise<InstantPayoutResult> {
  console.log(
    `[Instant Payout] 🚀 Processando pagamento para comissão ${commissionId} (pedido ${orderId})`
  );

  try {
    // ══════════════════════════════════════════════
    // 1. Buscar comissão
    // ══════════════════════════════════════════════
    const [commission] = await db
      .select({
        id: affiliateCommissions.id,
        affiliateId: affiliateCommissions.affiliateId,
        commissionAmount: affiliateCommissions.commissionAmount,
        currency: affiliateCommissions.currency,
        status: affiliateCommissions.status,
        transferId: affiliateCommissions.transferId,
        pixTransferId: affiliateCommissions.pixTransferId,
        transferAttemptCount: affiliateCommissions.transferAttemptCount,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.id, commissionId))
      .limit(1);

    if (!commission) {
      console.error('[Instant Payout] ❌ Comissão não encontrada:', commissionId);
      return { success: false, error: 'Comissão não encontrada' };
    }

    // ══════════════════════════════════════════════
    // 2. IDEMPOTÊNCIA: Verificar se já foi paga ou já tem transferência
    // ══════════════════════════════════════════════
    if (commission.status === 'paid') {
      console.log('[Instant Payout] ℹ️ Comissão já paga:', commissionId);
      return {
        success: true,
        transferId: commission.transferId || commission.pixTransferId || 'already-paid',
        amount: parseFloat(commission.commissionAmount),
      };
    }

    if (commission.transferId) {
      console.log('[Instant Payout] ℹ️ Transferência já criada:', commission.transferId);
      return {
        success: true,
        transferId: commission.transferId,
        amount: parseFloat(commission.commissionAmount),
      };
    }

    // ══════════════════════════════════════════════
    // 3. Buscar dados do afiliado (incluindo Stripe Connect)
    // ══════════════════════════════════════════════
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        name: affiliates.name,
        email: affiliates.email,
        affiliateType: affiliates.affiliateType,
        code: affiliates.code,
        // Stripe Connect
        stripeAccountId: affiliates.stripeAccountId,
        stripePayoutsEnabled: affiliates.stripePayoutsEnabled,
        stripeOnboardingStatus: affiliates.stripeOnboardingStatus,
        paymentAutomationEnabled: affiliates.paymentAutomationEnabled,
      })
      .from(affiliates)
      .where(eq(affiliates.id, commission.affiliateId))
      .limit(1);

    if (!affiliate) {
      console.error('[Instant Payout] ❌ Afiliado não encontrado:', commission.affiliateId);
      return { success: false, error: 'Afiliado não encontrado' };
    }

    // ══════════════════════════════════════════════
    // 4. VALIDAÇÃO DE SEGURANÇA (integridade + antifraude)
    // ══════════════════════════════════════════════
    console.log('[Instant Payout] 🔒 Validando segurança da comissão...');

    const securityCheck = await validateBeforePayment(commissionId);

    if (!securityCheck.safe) {
      console.error(`[Instant Payout] ❌ FRAUDE DETECTADA: ${securityCheck.reasons.join('; ')}`);

      await db
        .update(affiliateCommissions)
        .set({
          status: 'pending',
          transferError: `⚠️ POSSÍVEL FRAUDE: ${securityCheck.reasons.join('; ')}`,
          updatedAt: new Date(),
        })
        .where(eq(affiliateCommissions.id, commissionId));

      await sendSecurityAlertToAdmin(affiliate, commission, securityCheck.reasons);

      return {
        success: false,
        error: 'Pagamento bloqueado por suspeita de fraude',
        requiresManualReview: true,
      };
    }

    // ══════════════════════════════════════════════
    // 5. VERIFICAR SE AFILIADO TEM STRIPE CONNECT ATIVO
    //    Se stripePayoutsEnabled está false mas tem stripeAccountId,
    //    verificar diretamente com Stripe (webhook Connect pode não ter atualizado BD)
    // ══════════════════════════════════════════════
    let stripePayoutsConfirmed = !!affiliate.stripePayoutsEnabled;

    if (affiliate.stripeAccountId && !stripePayoutsConfirmed) {
      console.log(
        `[Instant Payout] 🔄 stripePayoutsEnabled=false no BD, verificando direto no Stripe para ${affiliate.stripeAccountId}...`
      );

      try {
        const account = await stripe.accounts.retrieve(affiliate.stripeAccountId);
        const chargesEnabled = account.charges_enabled || false;
        const payoutsEnabled = account.payouts_enabled || false;
        const detailsSubmitted = account.details_submitted || false;

        if (chargesEnabled && payoutsEnabled) {
          // Conta está ativa no Stripe! Atualizar BD para futuras chamadas
          console.log(`[Instant Payout] ✅ Stripe confirma conta ativa! Atualizando BD...`);

          const onboardingStatus =
            chargesEnabled && payoutsEnabled
              ? 'completed'
              : detailsSubmitted
                ? 'pending'
                : 'pending';

          await db
            .update(affiliates)
            .set({
              stripePayoutsEnabled: true,
              stripeChargesEnabled: chargesEnabled,
              stripeDetailsSubmitted: detailsSubmitted,
              stripeOnboardingStatus: onboardingStatus,
              paymentAutomationEnabled: true,
              preferredPaymentMethod: 'stripe_connect',
              ...(affiliate.stripeOnboardingStatus !== 'completed'
                ? { stripeOnboardedAt: new Date() }
                : {}),
              updatedAt: new Date(),
            })
            .where(eq(affiliates.id, affiliate.id));

          // Marcar como confirmado para continuar com a transferência
          stripePayoutsConfirmed = true;
        } else {
          console.log(
            `[Instant Payout] ℹ️ Stripe confirma conta NÃO ativa: charges=${chargesEnabled}, payouts=${payoutsEnabled}`
          );
        }
      } catch (stripeCheckError) {
        console.error(
          `[Instant Payout] ⚠️ Erro ao verificar conta Stripe:`,
          stripeCheckError instanceof Error ? stripeCheckError.message : stripeCheckError
        );
        // Continuar com o fluxo normal (vai cair no guard abaixo)
      }
    }

    if (!affiliate.stripeAccountId || !stripePayoutsConfirmed) {
      const reason = !affiliate.stripeAccountId
        ? 'Afiliado não completou onboarding Stripe Connect'
        : 'Stripe Connect ainda não habilitou payouts';

      console.log(
        `[Instant Payout] ℹ️ ${affiliate.name}: ${reason}. Comissão fica como 'approved' para pagamento manual.`
      );

      return {
        success: false,
        error: reason,
        needsStripeOnboarding: true,
        requiresManualReview: false,
      };
    }

    // ══════════════════════════════════════════════
    // 6. BUSCAR CHARGE ID (obrigatório para transferências no Brasil)
    // ══════════════════════════════════════════════
    let sourceChargeId: string | undefined;

    try {
      // Buscar o stripePaymentIntentId do pedido
      const [order] = await db
        .select({ stripePaymentIntentId: orders.stripePaymentIntentId })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (order?.stripePaymentIntentId) {
        // Retrieve the PaymentIntent to get the charge ID
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        const latestCharge = paymentIntent.latest_charge;

        if (typeof latestCharge === 'string') {
          sourceChargeId = latestCharge;
        } else if (latestCharge && typeof latestCharge === 'object' && 'id' in latestCharge) {
          sourceChargeId = (latestCharge as { id: string }).id;
        }

        console.log(`[Instant Payout] 🔗 Charge encontrado: ${sourceChargeId || 'NENHUM'}`);
      } else {
        console.warn(`[Instant Payout] ⚠️ Pedido ${orderId} sem stripePaymentIntentId`);
      }
    } catch (chargeError) {
      console.error(
        '[Instant Payout] ⚠️ Erro ao buscar charge:',
        chargeError instanceof Error ? chargeError.message : chargeError
      );
    }

    if (!sourceChargeId) {
      console.error(
        `[Instant Payout] ❌ Charge ID não encontrado para pedido ${orderId}. Transferência requer source_transaction para contas no Brasil.`
      );

      await db
        .update(affiliateCommissions)
        .set({
          transferError: 'Charge ID não disponível - source_transaction obrigatório para Brasil',
          transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
          lastTransferAttempt: new Date(),
          transferStatus: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(affiliateCommissions.id, commissionId));

      return {
        success: false,
        error: 'Charge ID não encontrado para source_transaction',
        requiresManualReview: true,
      };
    }

    // ══════════════════════════════════════════════
    // 7. CRIAR STRIPE TRANSFER (com idempotência + source_transaction)
    // ══════════════════════════════════════════════
    const amountInCents = Math.round(parseFloat(commission.commissionAmount) * 100);
    const currency = (commission.currency || 'BRL').toLowerCase();

    if (amountInCents < 1) {
      console.log('[Instant Payout] ℹ️ Valor muito baixo para transferir:', amountInCents);
      return { success: false, error: 'Valor mínimo não atingido' };
    }

    console.log(
      `[Instant Payout] 💸 Criando Stripe Transfer: ${amountInCents} centavos → ${affiliate.stripeAccountId} (${affiliate.name}) [source: ${sourceChargeId}]`
    );

    // Chave de idempotência baseada na comissão (previne duplicações mesmo com retries)
    const idempotencyKey = `commission_payout_${commissionId}`;

    let transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: amountInCents,
          currency,
          destination: affiliate.stripeAccountId,
          source_transaction: sourceChargeId,
          description: `Comissão venda #${orderId.slice(0, 8)} - ${affiliate.name}`,
          transfer_group: `order_${orderId}`,
          metadata: {
            commissionId: commission.id,
            orderId,
            affiliateId: affiliate.id,
            affiliateCode: affiliate.code,
            affiliateName: affiliate.name,
          },
        },
        {
          idempotencyKey,
        }
      );
    } catch (stripeError: unknown) {
      const err =
        stripeError instanceof Error ? stripeError : new Error('Erro desconhecido no Stripe');
      const errorMsg = err.message;
      const errorCode = (stripeError as { code?: string })?.code || 'unknown';

      console.error(`[Instant Payout] ❌ Stripe Transfer falhou: [${errorCode}] ${errorMsg}`);

      // Registrar tentativa falha
      await db
        .update(affiliateCommissions)
        .set({
          transferError: `Stripe [${errorCode}]: ${errorMsg}`,
          transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
          lastTransferAttempt: new Date(),
          transferStatus: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(affiliateCommissions.id, commissionId));

      // Se saldo insuficiente, cron pode tentar depois
      const isRetryable = ['balance_insufficient', 'rate_limit'].includes(errorCode);

      return {
        success: false,
        error: errorMsg,
        requiresManualReview: !isRetryable && (commission.transferAttemptCount || 0) >= 2,
      };
    }

    console.log(`[Instant Payout] ✅ Stripe Transfer criado: ${transfer.id}`);

    // ══════════════════════════════════════════════
    // 7. ATUALIZAR COMISSÃO → status: paid
    // ══════════════════════════════════════════════
    await db
      .update(affiliateCommissions)
      .set({
        status: 'paid',
        paidAt: new Date(),
        transferId: transfer.id,
        transferStatus: 'processing', // Stripe confirma via webhook
        paymentMethod: 'stripe_connect',
        lastTransferAttempt: new Date(),
        transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
        transferError: null,
        updatedAt: new Date(),
      })
      .where(eq(affiliateCommissions.id, commissionId));

    // ══════════════════════════════════════════════
    // 8. ATUALIZAR SALDOS DO AFILIADO
    // ══════════════════════════════════════════════
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

    // ══════════════════════════════════════════════
    // 9. ENVIAR EMAIL DE CONFIRMAÇÃO
    // ══════════════════════════════════════════════
    sendPayoutConfirmationEmail(
      affiliate.email,
      affiliate.name,
      parseFloat(commission.commissionAmount),
      transfer.id,
      currency.toUpperCase()
    ).catch(err => {
      console.error('[Instant Payout] ⚠️ Erro ao enviar email (não bloqueante):', err);
    });

    console.log(
      `[Instant Payout] ✅ Pagamento concluído: R$ ${commission.commissionAmount} → ${affiliate.name} (${transfer.id})`
    );

    return {
      success: true,
      transferId: transfer.id,
      amount: parseFloat(commission.commissionAmount),
    };
  } catch (error) {
    console.error('[Instant Payout] ❌ Erro crítico:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      requiresManualReview: true,
    };
  }
}

/**
 * Envia email de confirmação de pagamento
 */
async function sendPayoutConfirmationEmail(
  email: string,
  name: string,
  amount: number,
  transferId: string,
  currency: string = 'BRL'
): Promise<void> {
  try {
    const { sendEmail } = await import('@/lib/email');

    const firstName = name.split(' ')[0];
    const formattedAmount =
      currency === 'BRL' ? `R$ ${amount.toFixed(2)}` : `${currency} ${amount.toFixed(2)}`;

    await sendEmail({
      to: email,
      subject: `💸 Comissão Paga - ${formattedAmount} - A Rafa Criou`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .amount { font-size: 36px; font-weight: bold; color: #10b981; margin: 20px 0; text-align: center; }
            .badge { background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
            .info-box { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px; }
            .code { background: #f1f5f9; padding: 8px 12px; border-radius: 4px; font-family: monospace; color: #475569; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⚡ Pagamento Automático!</h1>
              <p style="margin: 10px 0 0;">Sua comissão foi transferida via Stripe</p>
            </div>
            <div class="content">
              <p>Olá <strong>${firstName}</strong>!</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <span class="badge">✅ PAGO AUTOMATICAMENTE</span>
              </div>
              
              <div class="amount">${formattedAmount}</div>
              
              <div class="info-box">
                <p style="margin: 0; font-size: 14px;"><strong>💳 Transferência Stripe Connect</strong></p>
                <p style="margin: 10px 0 0; font-size: 14px;">
                  ID: <span class="code">${transferId}</span>
                </p>
                <p style="margin: 10px 0 0; font-size: 12px; color: #666;">
                  ⚡ O valor será depositado automaticamente na sua conta bancária pelo Stripe.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="text-align: center; font-size: 16px;">
                <strong>Continue promovendo e ganhe ainda mais! 🚀</strong>
              </p>
            </div>
            <div class="footer">
              <p><strong>A Rafa Criou</strong></p>
              <p>Programa de Afiliados - Pagamentos Automáticos</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[Instant Payout] 📧 Email enviado para ${email}`);
  } catch (error) {
    console.error(`[Instant Payout] ⚠️ Erro ao enviar email:`, error);
  }
}

/**
 * Envia alerta de segurança para admin
 */
async function sendSecurityAlertToAdmin(
  affiliate: { name: string; email: string },
  commission: { commissionAmount: string },
  reasons: string[]
): Promise<void> {
  try {
    const { sendEmail } = await import('@/lib/email');

    await sendEmail({
      to: 'contato@arafacriou.com.br',
      subject: '🚨 Pagamento Retido - Revisão de Segurança Necessária',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">🚨 Alerta de Segurança</h1>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
              <p>Um pagamento automático foi retido para revisão manual.</p>
              
              <div style="background: #fee2e2; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p><strong>Afiliado:</strong> ${affiliate.name} (${affiliate.email})</p>
                <p><strong>Valor:</strong> R$ ${commission.commissionAmount}</p>
                <p><strong>Status:</strong> Aguardando revisão manual</p>
              </div>
              
              <p><strong>Motivos da retenção:</strong></p>
              <ul>
                ${reasons.map(r => `<li>${r}</li>`).join('')}
              </ul>
              
              <p>Acesse o painel admin para revisar este pagamento.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('[Security Alert] Erro ao enviar alerta:', error);
  }
}
