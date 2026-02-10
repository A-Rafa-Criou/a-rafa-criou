/**
 * API Manual - Pagamento via Stripe Connect para Afiliado
 *
 * Endpoint: POST /api/admin/affiliates/payout
 * Uso: Admin pode disparar pagamento manual via Stripe Connect
 *
 * Casos de uso:
 * - Pagamentos fora do cron
 * - Pagamentos especiais / retroativos
 * - Reprocessar comissões que falharam no automático
 *
 * Data: 09/02/2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

const payoutSchema = z.object({
  affiliateId: z.string().uuid('ID de afiliado inválido'),
  commissionId: z.string().uuid('ID de comissão inválido').optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/affiliates/payout
 *
 * Processa pagamento manual para um afiliado via Stripe Connect
 * Se commissionId for informado, paga apenas essa comissão
 * Se não, paga TODAS as comissões aprovadas do afiliado
 * Apenas admins podem executar
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validar sessão de admin (com authOptions para garantir role)
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado - Apenas admins' }, { status: 403 });
    }

    // 2. Validar dados
    const body = await req.json();
    const validation = payoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { affiliateId, commissionId, notes } = validation.data;

    // 3. Buscar afiliado com dados Stripe Connect
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        name: affiliates.name,
        email: affiliates.email,
        code: affiliates.code,
        stripeAccountId: affiliates.stripeAccountId,
        stripePayoutsEnabled: affiliates.stripePayoutsEnabled,
      })
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // 4. Verificar se afiliado tem Stripe Connect ativo
    if (!affiliate.stripeAccountId || !affiliate.stripePayoutsEnabled) {
      return NextResponse.json(
        {
          error: 'Afiliado não tem Stripe Connect configurado',
          details: 'O afiliado precisa completar o onboarding em /afiliados-da-rafa/configurar-pagamentos',
        },
        { status: 400 }
      );
    }

    // 5. Buscar comissões a pagar
    const conditions = [
      eq(affiliateCommissions.affiliateId, affiliateId),
      eq(affiliateCommissions.status, 'approved'),
    ];

    if (commissionId) {
      conditions.push(eq(affiliateCommissions.id, commissionId));
    }

    const pendingCommissions = await db
      .select({
        id: affiliateCommissions.id,
        orderId: affiliateCommissions.orderId,
        commissionAmount: affiliateCommissions.commissionAmount,
        currency: affiliateCommissions.currency,
        transferAttemptCount: affiliateCommissions.transferAttemptCount,
      })
      .from(affiliateCommissions)
      .where(and(...conditions));

    if (pendingCommissions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma comissão aprovada pendente de pagamento' },
        { status: 404 }
      );
    }

    console.log(
      `[Admin Payout] 💸 Pagamento manual: ${affiliate.name} - ${pendingCommissions.length} comissões`
    );

    // 6. Processar cada comissão via Stripe Connect Transfer
    const results = {
      succeeded: 0,
      failed: 0,
      totalPaid: 0,
      transfers: [] as { commissionId: string; transferId: string; amount: string }[],
      errors: [] as { commissionId: string; error: string }[],
    };

    for (const commission of pendingCommissions) {
      try {
        const amountInCents = Math.round(parseFloat(commission.commissionAmount) * 100);
        const currency = (commission.currency || 'BRL').toLowerCase();

        if (amountInCents < 1) continue;

        const idempotencyKey = `commission_payout_${commission.id}`;

        const transfer = await stripe.transfers.create(
          {
            amount: amountInCents,
            currency,
            destination: affiliate.stripeAccountId!,
            description: `Comissão venda #${commission.orderId.slice(0, 8)} - ${affiliate.name} (admin manual)`,
            transfer_group: `order_${commission.orderId}`,
            metadata: {
              commissionId: commission.id,
              orderId: commission.orderId,
              affiliateId: affiliate.id,
              affiliateCode: affiliate.code,
              source: 'admin_manual',
              adminId: session.user.id,
              notes: notes || '',
            },
          },
          { idempotencyKey }
        );

        // Atualizar comissão como paga
        await db
          .update(affiliateCommissions)
          .set({
            status: 'paid',
            paidAt: new Date(),
            transferId: transfer.id,
            transferStatus: 'processing',
            paymentMethod: 'stripe_connect',
            lastTransferAttempt: new Date(),
            transferAttemptCount: (commission.transferAttemptCount || 0) + 1,
            transferError: null,
            notes: notes ? `[Admin] ${notes}` : null,
            updatedAt: new Date(),
          })
          .where(eq(affiliateCommissions.id, commission.id));

        // Atualizar saldos do afiliado
        await db
          .update(affiliates)
          .set({
            paidCommission: sql`COALESCE(${affiliates.paidCommission}, 0) + ${commission.commissionAmount}`,
            pendingCommission: sql`GREATEST(COALESCE(${affiliates.pendingCommission}, 0) - ${commission.commissionAmount}, 0)`,
            lastPayoutAt: new Date(),
            totalPaidOut: sql`COALESCE(${affiliates.totalPaidOut}, 0) + ${commission.commissionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, affiliate.id));

        results.succeeded++;
        results.totalPaid += parseFloat(commission.commissionAmount);
        results.transfers.push({
          commissionId: commission.id,
          transferId: transfer.id,
          amount: commission.commissionAmount,
        });

        console.log(
          `[Admin Payout] ✅ R$ ${commission.commissionAmount} → ${transfer.id}`
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`[Admin Payout] ❌ Comissão ${commission.id}: ${errorMsg}`);
        results.failed++;
        results.errors.push({
          commissionId: commission.id,
          error: errorMsg,
        });
      }
    }

    console.log(`[Admin Payout] ✅ Concluído: ${results.succeeded} pagos, ${results.failed} erros`);

    return NextResponse.json({
      success: results.succeeded > 0,
      message: `${results.succeeded} comissões pagas via Stripe Connect`,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
      },
      totalPaid: results.totalPaid.toFixed(2),
      succeeded: results.succeeded,
      failed: results.failed,
      transfers: results.transfers,
      errors: results.errors,
    });
  } catch (error) {
    console.error('[Admin Payout] ❌ Erro:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao processar pagamento',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/affiliates/payout
 *
 * Lista estatísticas de pagamentos
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar estatísticas de pagamentos
    const stats = await db
      .select({
        totalAffiliates: sql<number>`count(*)::int`,
        totalPaidOut: sql<number>`coalesce(sum(${affiliates.totalPaidOut}), 0)::numeric`,
        totalPending: sql<number>`coalesce(sum(${affiliates.pendingCommission}), 0)::numeric`,
      })
      .from(affiliates);

    return NextResponse.json({
      stats: stats[0] || {
        totalAffiliates: 0,
        totalPaidOut: 0,
        totalPending: 0,
      },
    });
  } catch (error) {
    console.error('[Admin Payout Stats] ❌ Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
