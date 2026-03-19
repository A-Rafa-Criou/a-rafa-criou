import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/affiliates/onboarding/mercadopago/disconnect
 * Desvincula a conta Mercado Pago do afiliado
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(request, RATE_LIMITS.auth);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado pelo userId do usuário autenticado
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    if (!affiliate.mercadopagoAccountId) {
      return NextResponse.json({ error: 'Nenhuma conta Mercado Pago vinculada' }, { status: 400 });
    }

    // Limpar dados do Mercado Pago
    await db
      .update(affiliates)
      .set({
        mercadopagoAccountId: null,
        mercadopagoAccessToken: null,
        mercadopagoPublicKey: null,
        mercadopagoCodeVerifier: null,
        mercadopagoPayoutsEnabled: false,
        mercadopagoSplitStatus: 'not_started',
        mercadopagoOnboardedAt: null,
        // Se o método preferido era MP, voltar para manual
        ...(affiliate.preferredPaymentMethod === 'mercadopago_split'
          ? { preferredPaymentMethod: 'manual_pix', paymentAutomationEnabled: false }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    console.log('🔌 Conta Mercado Pago desvinculada com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Conta Mercado Pago desvinculada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao desvincular Mercado Pago:', error);
    return NextResponse.json({ error: 'Erro interno ao desvincular' }, { status: 500 });
  }
}
