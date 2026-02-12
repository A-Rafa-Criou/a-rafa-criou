import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/affiliates/onboarding/mercadopago/start
 * Retorna URL de autorização do Mercado Pago
 */
export async function POST(req: NextRequest) {
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

    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/affiliates/onboarding/mercadopago/callback`;

    if (!clientId) {
      return NextResponse.json(
        {
          error: 'Mercado Pago Split não está configurado.',
          details:
            'O administrador precisa adicionar MERCADOPAGO_CLIENT_ID nas variáveis de ambiente.',
        },
        { status: 503 }
      );
    }

    // Gerar state para CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        affiliateId: affiliate.id,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // URL de autorização do Mercado Pago (domínio oficial: auth.mercadopago.com)
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    // Atualizar status para pending
    await db
      .update(affiliates)
      .set({
        mercadopagoSplitStatus: 'pending',
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
