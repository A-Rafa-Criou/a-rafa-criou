import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateCommissions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/affiliates/commissions/[id]/retry-payout
 * 
 * Retenta o pagamento automático via Stripe Connect para uma comissão aprovada.
 * Útil quando o pagamento falhou por stripePayoutsEnabled=false no BD
 * mas o afiliado já completou onboarding.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Buscar comissão
    const [commission] = await db
      .select({
        id: affiliateCommissions.id,
        orderId: affiliateCommissions.orderId,
        status: affiliateCommissions.status,
        transferId: affiliateCommissions.transferId,
        commissionAmount: affiliateCommissions.commissionAmount,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.id, id))
      .limit(1);

    if (!commission) {
      return NextResponse.json({ error: 'Comissão não encontrada' }, { status: 404 });
    }

    if (commission.status === 'paid' && commission.transferId) {
      return NextResponse.json({
        error: 'Comissão já foi paga',
        transferId: commission.transferId,
      }, { status: 400 });
    }

    if (commission.status !== 'approved') {
      return NextResponse.json({
        error: `Comissão com status '${commission.status}' não pode ser paga automaticamente. Aprove primeiro.`,
      }, { status: 400 });
    }

    console.log(`[Admin Retry Payout] 🔄 Admin ${session.user.email} retentando payout para comissão ${id}`);

    const { processInstantAffiliatePayout } = await import('@/lib/affiliates/instant-payout');
    const result = await processInstantAffiliatePayout(id, commission.orderId);

    if (result.success) {
      console.log(`[Admin Retry Payout] ✅ Payout concluído: ${result.transferId}`);
      return NextResponse.json({
        success: true,
        transferId: result.transferId,
        amount: result.amount,
        message: `Pagamento de ${result.amount} enviado com sucesso!`,
      });
    }

    console.warn(`[Admin Retry Payout] ❌ Payout falhou: ${result.error}`);
    return NextResponse.json({
      success: false,
      error: result.error,
      needsStripeOnboarding: result.needsStripeOnboarding,
      requiresManualReview: result.requiresManualReview,
    }, { status: 422 });

  } catch (error) {
    console.error('[Admin Retry Payout] Erro:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
