import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/affiliates/onboarding/mercadopago/status
 * Verifica o status da integração com Mercado Pago
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

    if (!affiliate.mercadopagoAccountId || !affiliate.mercadopagoAccessToken) {
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
      const canReceivePayments =
        userData.status === 'active' &&
        userData.site_status === 'active';

      // Atualizar se mudou
      if (affiliate.mercadopagoPayoutsEnabled !== canReceivePayments) {
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
        status: affiliate.mercadopagoSplitStatus || 'pending',
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error('Erro ao verificar status Mercado Pago:', error);
    return NextResponse.json(
      { error: err.message || 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}
