import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/affiliates/onboarding/stripe/status
 * Verifica o status da conta Stripe Connect
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado do usuário
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    if (!affiliate.stripeAccountId) {
      return NextResponse.json({
        success: true,
        connected: false,
        status: 'not_started',
      });
    }

    // Buscar dados da conta no Stripe
    const account = await stripe.accounts.retrieve(affiliate.stripeAccountId);

    const detailsSubmitted = account.details_submitted || false;
    const chargesEnabled = account.charges_enabled || false;
    const payoutsEnabled = account.payouts_enabled || false;

    // Determinar status
    let onboardingStatus: string = 'pending';
    if (chargesEnabled && payoutsEnabled) {
      onboardingStatus = 'completed';
    } else if (detailsSubmitted) {
      onboardingStatus = 'pending';
    }

    // Atualizar no banco se mudou
    if (
      affiliate.stripeOnboardingStatus !== onboardingStatus ||
      affiliate.stripeDetailsSubmitted !== detailsSubmitted ||
      affiliate.stripeChargesEnabled !== chargesEnabled ||
      affiliate.stripePayoutsEnabled !== payoutsEnabled
    ) {
      const updateData: Partial<typeof affiliates.$inferInsert> = {
        stripeOnboardingStatus: onboardingStatus,
        stripeDetailsSubmitted: detailsSubmitted,
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        updatedAt: new Date(),
      };

      // Se completou agora, marcar timestamp e habilitar automação
      if (onboardingStatus === 'completed' && affiliate.stripeOnboardingStatus !== 'completed') {
        updateData.stripeOnboardedAt = new Date();
        updateData.paymentAutomationEnabled = true;
        updateData.preferredPaymentMethod = 'stripe_connect';
      }

      await db.update(affiliates).set(updateData).where(eq(affiliates.id, affiliate.id));
    }

    return NextResponse.json({
      success: true,
      connected: chargesEnabled && payoutsEnabled,
      status: onboardingStatus,
      details: {
        detailsSubmitted,
        chargesEnabled,
        payoutsEnabled,
        accountId: affiliate.stripeAccountId,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('Erro ao verificar status Stripe:', error);
    return NextResponse.json(
      { error: err.message || 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}
