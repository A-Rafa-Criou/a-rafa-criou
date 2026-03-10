import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/affiliates/onboarding/mercadopago/callback
 * Callback OAuth do Mercado Pago - troca authorization code por tokens
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[MP Callback] Recebido:', {
      hasCode: !!code,
      hasState: !!state,
      error,
      errorDescription,
      fullUrl: req.nextUrl.pathname + req.nextUrl.search,
    });

    // Se usuário negou autorização
    if (error) {
      console.log('[MP Callback] Autorização negada:', error, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=denied&detail=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      console.error('[MP Callback] Parâmetros faltando: code=', !!code, 'state=', !!state);
      return NextResponse.redirect(`${baseUrl}/afiliados-da-rafa/dashboard?error=invalid_params`);
    }

    // Decodificar state
    let affiliateId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      affiliateId = stateData.affiliateId;
      console.log('[MP Callback] State decodificado: affiliateId=', affiliateId);
    } catch (e) {
      console.error('[MP Callback] Erro ao decodificar state:', e);
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=invalid_params&detail=invalid_state`
      );
    }

    // Buscar afiliado
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate) {
      console.error('[MP Callback] Afiliado não encontrado:', affiliateId);
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=affiliate_not_found`
      );
    }

    console.log('[MP Callback] Afiliado encontrado:', affiliate.code);

    // Trocar code por access_token
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/affiliates/onboarding/mercadopago/callback`;
    const codeVerifier = affiliate.mercadopagoCodeVerifier;

    console.log('[MP Callback] Token exchange:', {
      clientId: clientId?.substring(0, 6) + '...',
      redirectUri,
      codePrefix: code?.substring(0, 10) + '...',
      hasCodeVerifier: !!codeVerifier,
    });

    if (!codeVerifier) {
      console.error('[MP Callback] ❌ code_verifier não encontrado no DB para o afiliado');
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=token_exchange_failed&detail=${encodeURIComponent('code_verifier ausente. Tente conectar novamente.')}`
      );
    }

    const tokenBody: Record<string, string> = {
      client_id: clientId!,
      client_secret: clientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    };

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenBody),
    });

    const tokenResponseText = await tokenResponse.text();
    console.log('[MP Callback] Token response status:', tokenResponse.status);
    console.log('[MP Callback] Token response body:', tokenResponseText);

    if (!tokenResponse.ok) {
      console.error(
        `[MP Callback] ❌ Token exchange FALHOU (${tokenResponse.status}):`,
        tokenResponseText
      );

      let mpError = 'token_exchange_failed';
      let mpDetail = `status_${tokenResponse.status}`;
      try {
        const parsed = JSON.parse(tokenResponseText);
        if (parsed.error) mpError = parsed.error;
        if (parsed.message) mpDetail = parsed.message;
        if (parsed.error_description) mpDetail = parsed.error_description;
      } catch {
        mpDetail = tokenResponseText.substring(0, 100);
      }

      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=token_exchange_failed&detail=${encodeURIComponent(`${mpError}: ${mpDetail}`)}`
      );
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenResponseText);
    } catch {
      console.error('[MP Callback] ❌ Resposta do token não é JSON:', tokenResponseText);
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=token_exchange_failed&detail=invalid_json_response`
      );
    }

    const accessToken = tokenData.access_token;
    const publicKey = tokenData.public_key;
    const refreshToken = tokenData.refresh_token;

    console.log('[MP Callback] Token obtido:', {
      hasAccessToken: !!accessToken,
      hasPublicKey: !!publicKey,
      hasRefreshToken: !!refreshToken,
      userId: tokenData.user_id,
    });

    if (!accessToken) {
      console.error('[MP Callback] ❌ access_token ausente na resposta');
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=token_exchange_failed&detail=no_access_token`
      );
    }

    // Buscar informações da conta do usuário
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const userError = await userResponse.text();
      console.error('[MP Callback] ❌ Falha ao buscar /users/me:', tokenResponse.status, userError);
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=user_fetch_failed&detail=status_${userResponse.status}`
      );
    }

    const userData = await userResponse.json();
    const mercadopagoAccountId = userData.id?.toString();

    console.log('[MP Callback] Dados do usuário MP:', {
      id: mercadopagoAccountId,
      status: userData.status,
      site_status: userData.site_status,
      email: userData.email,
    });

    if (!mercadopagoAccountId) {
      console.error('[MP Callback] ❌ ID da conta MP ausente');
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=user_fetch_failed&detail=no_account_id`
      );
    }

    // Conexão bem-sucedida — limpar code_verifier usado
    const updateData: Partial<typeof affiliates.$inferInsert> = {
      mercadopagoAccountId,
      mercadopagoAccessToken: accessToken,
      mercadopagoPublicKey: publicKey,
      mercadopagoPayoutsEnabled: true,
      mercadopagoSplitStatus: 'completed',
      mercadopagoCodeVerifier: null,
      updatedAt: new Date(),
    };

    // Se completou pela primeira vez ou reconectou
    if (affiliate.mercadopagoSplitStatus !== 'completed') {
      updateData.mercadopagoOnboardedAt = new Date();
    }

    // Se não tem método de pagamento preferido, define Mercado Pago
    if (!affiliate.preferredPaymentMethod || affiliate.preferredPaymentMethod === 'manual_pix') {
      updateData.preferredPaymentMethod = 'mercadopago_split';
      updateData.paymentAutomationEnabled = true;
    }

    await db.update(affiliates).set(updateData).where(eq(affiliates.id, affiliate.id));

    console.log(
      `[MP Callback] ✅ Afiliado ${affiliate.code} conectou Mercado Pago! Account: ${mercadopagoAccountId}`
    );

    // Redirecionar de volta para painel
    return NextResponse.redirect(`${baseUrl}/afiliados-da-rafa/dashboard?success=mercadopago`);
  } catch (error) {
    console.error('[MP Callback] ❌ Erro inesperado:', error);
    return NextResponse.redirect(`${baseUrl}/afiliados-da-rafa/dashboard?error=internal_error`);
  }
}

export const dynamic = 'force-dynamic';
