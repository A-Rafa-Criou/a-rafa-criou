import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe/connect
 * Webhook para atualizar status de contas Stripe Connect e transferências
 *
 * Eventos processados:
 * - account.updated → Status do onboarding do afiliado
 * - transfer.created → Confirma que transferência foi criada (status: processing)
 * - transfer.reversed → Transferência revertida (reverte comissão para approved + saldos)
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('Stripe Connect webhook: assinatura ausente');
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 });
  }

  // Se webhook secret não configurado, aceitar sem verificação em dev
  if (!webhookSecret) {
    console.warn('[Stripe Connect Webhook] ⚠️ STRIPE_CONNECT_WEBHOOK_SECRET não configurado');
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error('Erro ao verificar webhook Stripe Connect:', error.message);
    return NextResponse.json({ error: `Webhook error: ${error.message}` }, { status: 400 });
  }

  try {
    // ══════════════════════════════════════════════
    // EVENTO: account.updated - Status do onboarding
    // ══════════════════════════════════════════════
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      const accountId = account.id;

      const [affiliate] = await db
        .select()
        .from(affiliates)
        .where(eq(affiliates.stripeAccountId, accountId))
        .limit(1);

      if (!affiliate) {
        console.log(`[Stripe Connect] Afiliado não encontrado para conta ${accountId}`);
        return NextResponse.json({ received: true });
      }

      const detailsSubmitted = account.details_submitted || false;
      const chargesEnabled = account.charges_enabled || false;
      const payoutsEnabled = account.payouts_enabled || false;

      let onboardingStatus: string = 'pending';
      if (chargesEnabled && payoutsEnabled) {
        onboardingStatus = 'completed';
      } else if (detailsSubmitted) {
        onboardingStatus = 'pending';
      } else if (
        account.requirements?.currently_due &&
        account.requirements.currently_due.length > 0
      ) {
        onboardingStatus = 'failed';
      }

      const updateData: Partial<typeof affiliates.$inferInsert> = {
        stripeOnboardingStatus: onboardingStatus,
        stripeDetailsSubmitted: detailsSubmitted,
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        updatedAt: new Date(),
      };

      if (onboardingStatus === 'completed' && affiliate.stripeOnboardingStatus !== 'completed') {
        updateData.stripeOnboardedAt = new Date();
        updateData.paymentAutomationEnabled = true;
        updateData.preferredPaymentMethod = 'stripe_connect';
        console.log(`[Stripe Connect] ✅ Afiliado ${affiliate.code} completou onboarding!`);
      }

      await db.update(affiliates).set(updateData).where(eq(affiliates.id, affiliate.id));
      console.log(`[Stripe Connect] Conta ${accountId} atualizada - Status: ${onboardingStatus}`);
    }

    // ══════════════════════════════════════════════
    // EVENTO: transfer.created - Transferência criada com sucesso
    // ══════════════════════════════════════════════
    if (event.type === 'transfer.created') {
      const transfer = event.data.object as Stripe.Transfer;
      const transferId = transfer.id;
      const commissionId = transfer.metadata?.commissionId;

      console.log(`[Stripe Connect] 🔔 Transfer ${transferId}: created`);

      if (commissionId) {
        // Atualizar comissão específica
        await db
          .update(affiliateCommissions)
          .set({
            transferStatus: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(affiliateCommissions.id, commissionId));

        console.log(`[Stripe Connect] ✅ Comissão ${commissionId} confirmada como completed`);
      } else {
        // Fallback: buscar por transferId (cron batch transfers)
        const commissionsToUpdate = await db
          .select({ id: affiliateCommissions.id })
          .from(affiliateCommissions)
          .where(eq(affiliateCommissions.transferId, transferId));

        for (const commission of commissionsToUpdate) {
          await db
            .update(affiliateCommissions)
            .set({
              transferStatus: 'completed',
              updatedAt: new Date(),
            })
            .where(eq(affiliateCommissions.id, commission.id));
        }

        console.log(`[Stripe Connect] ✅ ${commissionsToUpdate.length} comissões atualizadas para completed`);
      }
    }

    // ══════════════════════════════════════════════
    // EVENTO: transfer.reversed - Transferência revertida (falha)
    // ══════════════════════════════════════════════
    if (event.type === 'transfer.reversed') {
      const transfer = event.data.object as Stripe.Transfer;
      const transferId = transfer.id;
      const commissionId = transfer.metadata?.commissionId;

      console.log(`[Stripe Connect] 🔔 Transfer ${transferId}: reversed (failed)`);

      // Buscar comissões afetadas
      const commissionsToRevert = commissionId
        ? await db
            .select({
              id: affiliateCommissions.id,
              affiliateId: affiliateCommissions.affiliateId,
              commissionAmount: affiliateCommissions.commissionAmount,
              status: affiliateCommissions.status,
            })
            .from(affiliateCommissions)
            .where(eq(affiliateCommissions.id, commissionId))
        : await db
            .select({
              id: affiliateCommissions.id,
              affiliateId: affiliateCommissions.affiliateId,
              commissionAmount: affiliateCommissions.commissionAmount,
              status: affiliateCommissions.status,
            })
            .from(affiliateCommissions)
            .where(eq(affiliateCommissions.transferId, transferId));

      for (const commission of commissionsToRevert) {
        // Reverter comissão para approved (será retentada pelo cron)
        await db
          .update(affiliateCommissions)
          .set({
            status: 'approved',
            transferStatus: 'failed',
            transferId: null, // Limpar para permitir nova tentativa
            transferError: `Stripe Transfer ${transferId} revertida`,
            paidAt: null,
            paymentMethod: null,
            updatedAt: new Date(),
          })
          .where(eq(affiliateCommissions.id, commission.id));

        // REVERTER SALDOS do afiliado (se estava como paid)
        if (commission.status === 'paid') {
          await db
            .update(affiliates)
            .set({
              paidCommission: sql`GREATEST(COALESCE(${affiliates.paidCommission}, 0) - ${commission.commissionAmount}, 0)`,
              pendingCommission: sql`COALESCE(${affiliates.pendingCommission}, 0) + ${commission.commissionAmount}`,
              totalPaidOut: sql`GREATEST(COALESCE(${affiliates.totalPaidOut}, 0) - ${commission.commissionAmount}, 0)`,
              updatedAt: new Date(),
            })
            .where(eq(affiliates.id, commission.affiliateId));

          console.log(
            `[Stripe Connect] ↩️ Comissão ${commission.id} revertida: R$ ${commission.commissionAmount} → pendente`
          );
        }
      }

      console.log(`[Stripe Connect] ✅ ${commissionsToRevert.length} comissões revertidas`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook Stripe Connect:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
