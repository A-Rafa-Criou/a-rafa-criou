import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/affiliates/onboarding/mercadopago/callback
 * Callback OAuth do Mercado Pago - troca authorization code por tokens
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Se usuário negou autorização
    if (error) {
      console.log('Mercado Pago: autorização negada', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?error=denied`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?error=invalid_params`
      );
    }

    // Decodificar state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const affiliateId = stateData.affiliateId;

    // Buscar afiliado
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?error=affiliate_not_found`
      );
    }

    // Trocar code por access_token
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/affiliates/onboarding/mercadopago/callback`;

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Erro ao trocar code por token:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const publicKey = tokenData.public_key;

    // Buscar informações da conta do usuário
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Erro ao buscar dados do usuário MP');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?error=user_fetch_failed`
      );
    }

    const userData = await userResponse.json();
    const mercadopagoAccountId = userData.id.toString();

    // Verificar se pode receber pagamentos
    const canReceivePayments =
      userData.status === 'active' &&
      userData.site_status === 'active';

    const updateData: Partial<typeof affiliates.$inferInsert> = {
      mercadopagoAccountId,
      mercadopagoAccessToken: accessToken,
      mercadopagoPublicKey: publicKey,
      mercadopagoPayoutsEnabled: canReceivePayments,
      mercadopagoSplitStatus: canReceivePayments ? 'completed' : 'failed',
      updatedAt: new Date(),
    };

    // Se completou pela primeira vez
    if (canReceivePayments && affiliate.mercadopagoSplitStatus !== 'completed') {
      updateData.mercadopagoOnboardedAt = new Date();
      
      // Se não tem método de pagamento preferido, define Mercado Pago
      if (!affiliate.preferredPaymentMethod || affiliate.preferredPaymentMethod === 'manual_pix') {
        updateData.preferredPaymentMethod = 'mercadopago_split';
        updateData.paymentAutomationEnabled = true;
      }

      console.log(`✅ Afiliado ${affiliate.code} completou onboarding Mercado Pago Split!`);
    }

    await db.update(affiliates).set(updateData).where(eq(affiliates.id, affiliate.id));

    // Redirecionar de volta para painel
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?success=mercadopago`
    );
  } catch (error) {
    console.error('Erro no callback Mercado Pago:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/configurar-pagamentos?error=internal_error`
    );
  }
}
