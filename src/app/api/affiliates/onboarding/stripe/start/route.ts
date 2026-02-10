import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/affiliates/onboarding/stripe/start
 * Cria uma conta Stripe Connect e retorna o link de onboarding
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe não está configurado. Entre em contato com o suporte.' },
        { status: 503 }
      );
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

    // Se já tem conta Stripe, apenas retorna novo link de onboarding
    let stripeAccountId = affiliate.stripeAccountId;

    if (!stripeAccountId) {
      // Criar nova conta Stripe Connect (Express via controller properties)
      // Usa controller em vez de type:'express' para declarar explicitamente
      // a responsabilidade por perdas e taxas (evita erro de platform-profile)
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: 'application' },
          fees: { payer: 'application' },
          stripe_dashboard: { type: 'express' },
        },
        country: 'BR',
        email: affiliate.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          affiliateId: affiliate.id,
          affiliateCode: affiliate.code,
        },
      });

      stripeAccountId = account.id;

      // Salvar no banco
      await db
        .update(affiliates)
        .set({
          stripeAccountId,
          stripeOnboardingStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(affiliates.id, affiliate.id));
    }

    // Criar Account Link para onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId: stripeAccountId,
    });
  } catch (error) {
    const err = error as Error & { type?: string; code?: string };
    console.error('Erro ao iniciar onboarding Stripe:', error);

    // Erro de configuração do perfil de plataforma (losses/liability)
    if (err.type === 'StripeInvalidRequestError' && err.message?.includes('managing losses')) {
      return NextResponse.json(
        {
          error: 'Configuração pendente no Stripe Connect. O administrador precisa definir a responsabilidade por perdas em https://dashboard.stripe.com/settings/connect/platform-profile',
          details: 'Acesse o Stripe Dashboard → Connect → Platform Profile e configure "Manage losses" antes de criar contas conectadas.',
          action: 'dashboard_config',
        },
        { status: 503 }
      );
    }

    // Erro de Connect não habilitado
    if (err.type === 'StripeInvalidRequestError' && err.message?.includes('signed up for Connect')) {
      return NextResponse.json(
        {
          error: 'Stripe Connect não está habilitado nesta conta. O administrador precisa ativar o Stripe Connect em https://dashboard.stripe.com/connect/accounts/overview',
          details: 'Configure o Stripe Connect antes de usar pagamentos automáticos.',
          action: 'enable_connect',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Erro ao conectar com Stripe' },
      { status: 500 }
    );
  }
}
