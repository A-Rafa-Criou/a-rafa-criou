import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions } from '@/lib/db/schema';
import { eq, and, sql, lt, isNull, or } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { processAutomaticAffiliatePayout } from '@/lib/affiliates/payout-dispatcher';

interface ProcessingError {
  affiliateCode: string;
  error: string;
}

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/process-affiliate-payouts
 *
 * Cron job diário: retenta pagamentos automáticos (Stripe/Mercado Pago) que falharam
 * (ex: saldo insuficiente, timeout, conectividade, etc.)
 *
 * Também processa comissões aprovadas de afiliados com método de payout ativo
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

    // Buscar afiliados com algum método de payout configurado
    const eligibleAffiliates = await db
      .select({
        id: affiliates.id,
        code: affiliates.code,
        name: affiliates.name,
        email: affiliates.email,
        stripeAccountId: affiliates.stripeAccountId,
        stripePayoutsEnabled: affiliates.stripePayoutsEnabled,
        mercadopagoAccountId: affiliates.mercadopagoAccountId,
        mercadopagoPayoutsEnabled: affiliates.mercadopagoPayoutsEnabled,
        mercadopagoSplitStatus: affiliates.mercadopagoSplitStatus,
      })
      .from(affiliates)
      .where(
        and(
          eq(affiliates.status, 'active'),
          or(
            sql`${affiliates.stripeAccountId} IS NOT NULL`,
            sql`${affiliates.mercadopagoAccountId} IS NOT NULL`
          )
        )
      );

    console.log(`[Cron Payout] 📊 ${eligibleAffiliates.length} afiliados com payout configurado`);

    // Para afiliados com stripePayoutsEnabled=false, verificar direto no Stripe
    for (const aff of eligibleAffiliates) {
      if (!aff.stripePayoutsEnabled && aff.stripeAccountId) {
        try {
          const account = await stripe.accounts.retrieve(aff.stripeAccountId);
          if (account.charges_enabled && account.payouts_enabled) {
            console.log(
              `[Cron Payout] ✅ ${aff.code}: Stripe confirma conta ativa, atualizando BD`
            );
            await db
              .update(affiliates)
              .set({
                stripePayoutsEnabled: true,
                stripeChargesEnabled: true,
                stripeDetailsSubmitted: account.details_submitted || false,
                stripeOnboardingStatus: 'completed',
                paymentAutomationEnabled: true,
                preferredPaymentMethod: 'stripe_connect',
                updatedAt: new Date(),
              })
              .where(eq(affiliates.id, aff.id));
            aff.stripePayoutsEnabled = true;
          }
        } catch (err) {
          console.warn(
            `[Cron Payout] ⚠️ ${aff.code}: Erro ao verificar Stripe:`,
            err instanceof Error ? err.message : err
          );
        }
      }
    }

    // Filtrar afiliados com ao menos um método ativo para retentativa
    const activeAffiliates = eligibleAffiliates.filter(
      a =>
        !!a.stripePayoutsEnabled ||
        (!!a.mercadopagoAccountId &&
          (!!a.mercadopagoPayoutsEnabled || a.mercadopagoSplitStatus === 'completed'))
    );
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
            const payoutResult = await processAutomaticAffiliatePayout(
              commission.id,
              commission.orderId
            );

            if (payoutResult.success) {
              console.log(
                `[Cron Payout] ✅ ${affiliate.code}: R$ ${commission.commissionAmount} → ${payoutResult.transferId}`
              );
            } else {
              console.warn(
                `[Cron Payout] ⚠️ Comissão ${commission.id} não paga: ${payoutResult.error}`
              );
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            console.error(`[Cron Payout] ❌ Comissão ${commission.id}: ${message}`);
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
    message: 'Cron job de pagamentos automáticos (Stripe/Mercado Pago)',
    usage: 'POST /api/cron/process-affiliate-payouts com Bearer CRON_SECRET',
  });
}
