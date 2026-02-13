import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/affiliates/onboarding/mercadopago/disconnect
 * Desvincula a conta Mercado Pago do afiliado
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado pelo email do usuário
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.email, session.user.email))
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
        mercadopagoPayoutsEnabled: false,
        mercadopagoSplitStatus: null,
        mercadopagoOnboardedAt: null,
        // Se o método preferido era MP, voltar para manual
        ...(affiliate.preferredPaymentMethod === 'mercadopago_split'
          ? { preferredPaymentMethod: 'manual_pix', paymentAutomationEnabled: false }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    console.log(
      `🔌 Afiliado ${affiliate.code} desvinculou conta Mercado Pago (ID: ${affiliate.mercadopagoAccountId})`
    );

    return NextResponse.json({
      success: true,
      message: 'Conta Mercado Pago desvinculada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao desvincular Mercado Pago:', error);
    return NextResponse.json({ error: 'Erro interno ao desvincular' }, { status: 500 });
  }
}
