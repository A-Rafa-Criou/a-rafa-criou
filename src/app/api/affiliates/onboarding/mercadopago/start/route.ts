import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
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

function signOAuthState(payload: MercadoPagoOAuthStatePayload, secret: string): string {
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('hex');

  return Buffer.from(JSON.stringify({ payload: payloadBase64, sig: signature })).toString(
    'base64url'
  );
}

/**
 * POST /api/affiliates/onboarding/mercadopago/start
 * Retorna URL de autorização do Mercado Pago
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMITS.public);
    if (rateLimitResult) {
      return rateLimitResult;
    }

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

    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/affiliates/onboarding/mercadopago/callback`;

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Mercado Pago não está configurado.',
          details:
            'O administrador precisa adicionar MERCADOPAGO_CLIENT_ID nas variáveis de ambiente.',
        },
        { status: 503 }
      );
    }

    // Gerar PKCE code_verifier e code_challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const stateSecret = process.env.MERCADOPAGO_CLIENT_SECRET;

    if (!stateSecret) {
      return NextResponse.json(
        {
          error: 'Mercado Pago não está configurado.',
          details:
            'O administrador precisa adicionar MERCADOPAGO_CLIENT_SECRET nas variáveis de ambiente.',
        },
        { status: 503 }
      );
    }

    // Gerar state assinado para proteção contra tampering
    const state = signOAuthState(
      {
        affiliateId: affiliate.id,
        userId: session.user.id,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex'),
      },
      stateSecret
    );

    // URL de autorização do Mercado Pago Brasil (domínio oficial: auth.mercadopago.com.br)
    // Parâmetros fortes para forçar nova autenticação:
    // - prompt=login: força tela de login (não reutiliza sessão anterior)
    // - max_age=0: invalida qualquer sessão anterior imediatamente
    const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&prompt=login&max_age=0`;

    // Atualizar status para pending e salvar code_verifier
    await db
      .update(affiliates)
      .set({
        mercadopagoSplitStatus: 'pending',
        mercadopagoCodeVerifier: codeVerifier,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    return NextResponse.json({
      success: true,
      url: authUrl,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Erro ao iniciar onboarding Mercado Pago:', error);
    return NextResponse.json(
      { error: err.message || 'Erro ao conectar com Mercado Pago' },
      { status: 500 }
    );
  }
}
