import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

type MercadoPagoOAuthStatePayload = {
  affiliateId: string;
  userId: string;
  timestamp: number;
  nonce: string;
};

function verifyOAuthState(
  encodedState: string,
  secret: string,
  maxAgeMs: number
): { valid: true; payload: MercadoPagoOAuthStatePayload } | { valid: false; reason: string } {
  try {
    const stateJson = Buffer.from(encodedState, 'base64url').toString();
    const parsed = JSON.parse(stateJson) as { payload?: string; sig?: string };

    if (!parsed.payload || !parsed.sig) {
      return { valid: false, reason: 'missing_state_fields' };
    }

    const expectedSig = crypto.createHmac('sha256', secret).update(parsed.payload).digest('hex');
    const sigBuffer = Buffer.from(parsed.sig, 'hex');
    const expectedSigBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedSigBuffer.length) {
      return { valid: false, reason: 'invalid_signature_length' };
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return { valid: false, reason: 'invalid_signature' };
    }

    const payloadJson = Buffer.from(parsed.payload, 'base64url').toString();
    const payload = JSON.parse(payloadJson) as MercadoPagoOAuthStatePayload;

    if (!payload.affiliateId || !payload.userId || !payload.timestamp || !payload.nonce) {
      return { valid: false, reason: 'invalid_payload' };
    }

    const now = Date.now();
    if (now - payload.timestamp > maxAgeMs) {
      return { valid: false, reason: 'state_expired' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'state_parse_error' };
  }
}

/**
 * GET /api/affiliates/onboarding/mercadopago/callback
 * Callback OAuth do Mercado Pago - troca authorization code por tokens
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  try {
    const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMITS.public);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[MP Callback] Recebido callback', {
      hasCode: !!code,
      hasState: !!state,
      error,
      hasErrorDescription: !!errorDescription,
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

    const stateSecret =
      process.env.MERCADOPAGO_OAUTH_STATE_SECRET || process.env.MERCADOPAGO_CLIENT_SECRET;
    if (!stateSecret) {
      console.error('[MP Callback] Secret de state não configurado');
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=invalid_params&detail=state_secret_not_configured`
      );
    }

    const verifiedState = verifyOAuthState(state, stateSecret, 15 * 60 * 1000);
    if (!verifiedState.valid) {
      console.error('[MP Callback] State inválido:', verifiedState.reason);
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=invalid_params&detail=${encodeURIComponent(verifiedState.reason)}`
      );
    }

    const affiliateId = verifiedState.payload.affiliateId;
    const stateUserId = verifiedState.payload.userId;
    console.log('[MP Callback] State validado');

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

    if (affiliate.userId !== stateUserId) {
      console.error('[MP Callback] State userId não confere com afiliado');
      return NextResponse.redirect(
        `${baseUrl}/afiliados-da-rafa/dashboard?error=invalid_params&detail=state_user_mismatch`
      );
    }

    console.log('[MP Callback] Afiliado validado para conexão');

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
      hasUserId: !!tokenData.user_id,
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
      hasAccountId: !!mercadopagoAccountId,
      status: userData.status,
      site_status: userData.site_status,
      hasEmail: !!userData.email,
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

    console.log('[MP Callback] ✅ Conta Mercado Pago conectada com sucesso');

    // Redirecionar de volta para painel
    return NextResponse.redirect(`${baseUrl}/afiliados-da-rafa/dashboard?success=mercadopago`);
  } catch (error) {
    console.error('[MP Callback] ❌ Erro inesperado:', error);
    return NextResponse.redirect(`${baseUrl}/afiliados-da-rafa/dashboard?error=internal_error`);
  }
}

export const dynamic = 'force-dynamic';
