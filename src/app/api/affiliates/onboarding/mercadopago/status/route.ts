import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/affiliates/onboarding/mercadopago/status
 * Verifica o status da integração com Mercado Pago
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMITS.auth);
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

    if (!affiliate.mercadopagoAccountId || !affiliate.mercadopagoAccessToken) {
      if (affiliate.mercadopagoSplitStatus == null) {
        await db
          .update(affiliates)
          .set({
            mercadopagoSplitStatus: 'not_started',
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, affiliate.id));
      }

      return NextResponse.json({
        success: true,
        connected: false,
        status: 'not_started',
      });
    }

    // Verificar se token ainda é válido
    try {
      const userResponse = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          Authorization: `Bearer ${affiliate.mercadopagoAccessToken}`,
        },
      });

      if (!userResponse.ok) {
        // Token inválido ou expirado
        await db
          .update(affiliates)
          .set({
            mercadopagoSplitStatus: 'failed',
            mercadopagoPayoutsEnabled: false,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, affiliate.id));

        return NextResponse.json({
          success: true,
          connected: false,
          status: 'failed',
          message: 'Token expirado. Reconecte sua conta.',
        });
      }

      const userData = await userResponse.json();
      // A conta está conectada se temos um access_token válido e conseguimos buscar dados do usuário
      // O status 'active' e 'site_status' referem-se ao nível da conta no marketplace,
      // não à capacidade de receber split payments via OAuth
      const canReceivePayments = true; // Se chegamos aqui, o token é válido e a conta existe

      // Atualizar se mudou (só atualizar para true, nunca sobrescrever para false uma conexão válida)
      if (!affiliate.mercadopagoPayoutsEnabled && canReceivePayments) {
        await db
          .update(affiliates)
          .set({
            mercadopagoPayoutsEnabled: canReceivePayments,
            mercadopagoSplitStatus: canReceivePayments ? 'completed' : 'failed',
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, affiliate.id));
      }

      return NextResponse.json({
        success: true,
        connected: canReceivePayments,
        status: canReceivePayments ? 'completed' : 'pending',
        details: {
          accountId: affiliate.mercadopagoAccountId,
          payoutsEnabled: canReceivePayments,
        },
      });
    } catch (error) {
      console.error('Erro ao verificar status MP:', error);
      return NextResponse.json({
        success: true,
        connected: affiliate.mercadopagoPayoutsEnabled || false,
        status: affiliate.mercadopagoSplitStatus || 'not_started',
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Erro ao verificar status Mercado Pago:', error);
    return NextResponse.json({ error: err.message || 'Erro ao verificar status' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
