import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions, orders } from '@/lib/db/schema';
import { eq, and, sql, lt, isNull, or } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

interface ProcessingError {
  affiliateCode: string;
  error: string;
}

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/process-affiliate-payouts
 *
 * Cron job diário: retenta pagamentos Stripe Connect que falharam
 * (ex: saldo insuficiente, timeout, etc.)
 *
 * Também processa comissões aprovadas de afiliados com Stripe Connect
 * que não foram pagas no momento do webhook (fallback).
 *
 * Configurar no vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-affiliate-payouts",
 *     "schedule": "0 10 * * *"
 *   }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação (fail-closed: requer CRON_SECRET configurado)
    if (!CRON_SECRET) {
      console.error('[Cron Payout] ❌ CRON_SECRET não configurado - acesso bloqueado');
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron Payout] 🚀 Iniciando processamento de pagamentos pendentes...');

    // Buscar afiliados com Stripe Connect ativo
    const eligibleAffiliates = await db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        name: affiliates.name,
        email: affiliates.email,
        stripeAccountId: affiliates.stripeAccountId,
        stripePayoutsEnabled: affiliates.stripePayoutsEnabled,
      })
      .from(affiliates)
      .where(
        and(
          eq(affiliates.status, 'active'),
          sql`${affiliates.stripeAccountId} IS NOT NULL`
        )
      );

    console.log(`[Cron Payout] 📊 ${eligibleAffiliates.length} afiliados com Stripe Connect configurado`);

    // Para afiliados com stripePayoutsEnabled=false, verificar direto no Stripe
    for (const aff of eligibleAffiliates) {
      if (!aff.stripePayoutsEnabled && aff.stripeAccountId) {
        try {
          const account = await stripe.accounts.retrieve(aff.stripeAccountId);
          if (account.charges_enabled && account.payouts_enabled) {
            console.log(`[Cron Payout] ✅ ${aff.code}: Stripe confirma conta ativa, atualizando BD`);
            await db.update(affiliates).set({
              stripePayoutsEnabled: true,
              stripeChargesEnabled: true,
              stripeDetailsSubmitted: account.details_submitted || false,
              stripeOnboardingStatus: 'completed',
              paymentAutomationEnabled: true,
              preferredPaymentMethod: 'stripe_connect',
              updatedAt: new Date(),
            }).where(eq(affiliates.id, aff.id));
            aff.stripePayoutsEnabled = true;
          }
        } catch (err) {
          console.warn(`[Cron Payout] ⚠️ ${aff.code}: Erro ao verificar Stripe:`, err instanceof Error ? err.message : err);
        }
      }
    }

    // Filtrar apenas afiliados confirmados com payouts ativos
    const activeAffiliates = eligibleAffiliates.filter(a => a.stripePayoutsEnabled);
    console.log(`[Cron Payout] 📊 ${activeAffiliates.length} afiliados com payouts confirmados`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [] as ProcessingError[],
    };

    for (const affiliate of activeAffiliates) {
      try {
        // Buscar comissões aprovadas sem transferência (ou com transferência falhada)
        // Máximo 3 tentativas por comissão
        const pendingCommissions = await db
          .select({
            id: affiliateCommissions.id,
            orderId: affiliateCommissions.orderId,
            commissionAmount: affiliateCommissions.commissionAmount,
            currency: affiliateCommissions.currency,
            transferAttemptCount: affiliateCommissions.transferAttemptCount,
          })
          .from(affiliateCommissions)
          .where(
            and(
              eq(affiliateCommissions.affiliateId, affiliate.id),
              eq(affiliateCommissions.status, 'approved'),
              or(
                isNull(affiliateCommissions.transferId),
                eq(affiliateCommissions.transferStatus, 'failed')
              ),
              lt(sql`COALESCE(${affiliateCommissions.transferAttemptCount}, 0)`, 5)
            )
          );

        if (pendingCommissions.length === 0) {
          results.skipped++;
          continue;
        }

        console.log(
          `[Cron Payout] 💰 ${affiliate.code}: ${pendingCommissions.length} comissões pendentes`
        );

        results.processed++;

        // Processar cada comissão individualmente (idempotente)
        for (const commission of pendingCommissions) {
          try {
            const amountInCents = Math.round(parseFloat(commission.commissionAmount) * 100);
            const currency = (commission.currency || 'BRL').toLowerCase();

            if (amountInCents < 1) continue;

            // Buscar charge ID do pedido (obrigatório para transferências no Brasil)
            let sourceChargeId: string | undefined;
            try {
              const [order] = await db
                .select({ stripePaymentIntentId: orders.stripePaymentIntentId })
                .from(orders)
                .where(eq(orders.id, commission.orderId))
                .limit(1);

              if (order?.stripePaymentIntentId) {
                const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
                const latestCharge = pi.latest_charge;
                if (typeof latestCharge === 'string') {
                  sourceChargeId = latestCharge;
                } else if (latestCharge && typeof latestCharge === 'object' && 'id' in latestCharge) {
                  sourceChargeId = (latestCharge as { id: string }).id;
                }
              }
            } catch (chargeErr) {
              console.error(`[Cron Payout] ⚠️ Erro ao buscar charge para pedido ${commission.orderId}:`, chargeErr instanceof Error ? chargeErr.message : chargeErr);
            }

            if (!sourceChargeId) {
              console.error(`[Cron Payout] ❌ Charge ID não encontrado para pedido ${commission.orderId}, pulando...`);
              continue;
            }

            // Idempotência: mesma chave que o instant-payout usa
            const idempotencyKey = `commission_payout_${commission.id}`;

            const transfer = await stripe.transfers.create(
              {
                amount: amountInCents,
                currency,
                destination: affiliate.stripeAccountId!,
                source_transaction: sourceChargeId,
                description: `Comissão venda #${commission.orderId.slice(0, 8)} - ${affiliate.name} (cron retry)`,
                transfer_group: `order_${commission.orderId}`,
                metadata: {
                  commissionId: commission.id,
                  orderId: commission.orderId,
                  affiliateId: affiliate.id,
                  affiliateCode: affiliate.code,
                  source: 'cron_retry',
                },
              },
              { idempotencyKey }
            );

            // Atualizar comissão como paga
            await db
              .update(affiliateCommissions)
              .set({
                status: 'paid',
                paidAt: new Date(),
                transferId: transfer.id,
                transferStatus: 'processing',
                paymentMethod: 'stripe_connect',
                lastTransferAttempt: new Date(),
                transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
                transferError: null,
                updatedAt: new Date(),
              })
              .where(eq(affiliateCommissions.id, commission.id));

            // Atualizar saldos do afiliado
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

            console.log(
              `[Cron Payout] ✅ ${affiliate.code}: R$ ${commission.commissionAmount} → ${transfer.id}`
            );
          } catch (err: any) {
            console.error(
              `[Cron Payout] ❌ Comissão ${commission.id}: ${err.message}`
            );

            await db
              .update(affiliateCommissions)
              .set({
                transferError: err.message || 'Erro desconhecido',
                transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
                lastTransferAttempt: new Date(),
                transferStatus: 'failed',
                updatedAt: new Date(),
              })
              .where(eq(affiliateCommissions.id, commission.id));
          }
        }

        results.succeeded++;
      } catch (error) {
        const err = error as Error;
        console.error(`[Cron Payout] ❌ Afiliado ${affiliate.code}:`, err.message);
        results.failed++;
        results.errors.push({
          affiliateCode: affiliate.code,
          error: err.message,
        });
      }
    }

    console.log('[Cron Payout] ✅ Processamento concluído:', results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[Cron Payout] ❌ Erro crítico:', error);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET para teste manual (apenas dev)
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  return NextResponse.json({
    message: 'Cron job de pagamentos automáticos (Stripe Connect)',
    usage: 'POST /api/cron/process-affiliate-payouts com Bearer CRON_SECRET',
  });
}
