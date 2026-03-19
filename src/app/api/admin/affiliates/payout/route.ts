/**
 * API Manual - Pagamento automático de comissões para Afiliado
 *
 * Endpoint: POST /api/admin/affiliates/payout
 * Uso: Admin pode disparar pagamento manual via Stripe ou Mercado Pago
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

const payoutSchema = z.object({
  affiliateId: z.string().uuid('ID de afiliado inválido'),
  commissionId: z.string().uuid('ID de comissão inválido').optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/affiliates/payout
 *
 * Processa pagamento manual para um afiliado via método automático (Stripe/MP)
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

    // 3. Buscar afiliado com dados de payout
    const [affiliate] = await db
      .select({
        id: affiliates.id,
        name: affiliates.name,
        email: affiliates.email,
        code: affiliates.code,
        stripeAccountId: affiliates.stripeAccountId,
        stripePayoutsEnabled: affiliates.stripePayoutsEnabled,
        mercadopagoAccountId: affiliates.mercadopagoAccountId,
        mercadopagoPayoutsEnabled: affiliates.mercadopagoPayoutsEnabled,
        mercadopagoSplitStatus: affiliates.mercadopagoSplitStatus,
      })
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // 4. Verificar se afiliado tem ao menos um método ativo
    const hasStripe = !!affiliate.stripeAccountId && !!affiliate.stripePayoutsEnabled;
    const hasMercadoPago =
      !!affiliate.mercadopagoAccountId &&
      (!!affiliate.mercadopagoPayoutsEnabled || affiliate.mercadopagoSplitStatus === 'completed');

    if (!hasStripe && !hasMercadoPago) {
      return NextResponse.json(
        {
          error: 'Afiliado não tem método de payout ativo',
          details:
            'O afiliado precisa completar onboarding de Stripe Connect ou Mercado Pago em /afiliados-da-rafa/configurar-pagamentos',
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

    // 6. Processar cada comissão via dispatcher automático
    const results = {
      succeeded: 0,
      failed: 0,
      totalPaid: 0,
      transfers: [] as { commissionId: string; transferId: string; amount: string }[],
      errors: [] as { commissionId: string; error: string }[],
    };

    for (const commission of pendingCommissions) {
      try {
        if (parseFloat(commission.commissionAmount) <= 0) {
          continue;
        }

        const { processAutomaticAffiliatePayout } = await import(
          '@/lib/affiliates/payout-dispatcher'
        );
        const payoutResult = await processAutomaticAffiliatePayout(
          commission.id,
          commission.orderId
        );

        if (!payoutResult.success) {
          throw new Error(payoutResult.error || 'Falha no payout automático');
        }

        if (notes) {
          await db
            .update(affiliateCommissions)
            .set({
              notes: `[Admin] ${notes}`,
              updatedAt: new Date(),
            })
            .where(eq(affiliateCommissions.id, commission.id));
        }

        results.succeeded++;
        results.totalPaid += parseFloat(commission.commissionAmount);
        results.transfers.push({
          commissionId: commission.id,
          transferId: payoutResult.transferId || 'sem-id',
          amount: commission.commissionAmount,
        });

        console.log(
          `[Admin Payout] ✅ R$ ${commission.commissionAmount} → ${payoutResult.transferId}`
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
      message: `${results.succeeded} comissões pagas via payout automático`,
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
