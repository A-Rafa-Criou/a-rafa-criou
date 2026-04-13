/**
 * API de Diagnóstico - Verificar Problema de Comissão de Afiliados
 *
 * Endpoint para debug: /api/debug/affiliate-diagnosis?orderId=XXX
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, affiliates, affiliateCommissions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  // ⚠️ Apenas em desenvolvimento/admin
  const apiKey = req.headers.get('x-debug-key');
  if (apiKey !== 'debug-key-12345') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });
  }

  try {
    // 1. Buscar pedido
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado', orderId }, { status: 404 });
    }

    // 2. Buscar afiliado (se houver)
    let affiliate = null;
    if (order.affiliateId) {
      const [aff] = await db
        .select()
        .from(affiliates)
        .where(eq(affiliates.id, order.affiliateId))
        .limit(1);
      affiliate = aff;
    }

    // 3. Buscar comissão
    const [commission] = await db
      .select()
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.orderId, order.id))
      .limit(1);

    const diagnosis = {
      orderId: order.id,
      orderStatus: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentProvider: order.paymentProvider,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      },
      affiliateAssociation: {
        affiliateId: order.affiliateId || 'SEM AFILIADO ❌',
        hasAffiliateId: !!order.affiliateId,
        affiliateLinkId: order.affiliateLinkId,
      },
      affiliate: affiliate
        ? {
            id: affiliate.id,
            name: affiliate.name,
            code: affiliate.code,
            email: affiliate.email,
            status: affiliate.status,
            affiliateType: affiliate.affiliateType,
            commissionValue: affiliate.commissionValue,
            pixKey: affiliate.pixKey ? '***' : '(vazio)',
            stripeAccountId: affiliate.stripeAccountId ? '***' : '(vazio)',
            mercadopagoAccountId: affiliate.mercadopagoAccountId ? '***' : '(vazio)',
          }
        : null,
      commission: commission
        ? {
            id: commission.id,
            status: commission.status,
            commissionAmount: commission.commissionAmount,
            commissionRate: commission.commissionRate,
            orderTotal: commission.orderTotal,
            paidAt: commission.paidAt,
            pixTransferId: commission.pixTransferId,
            transferId: commission.transferId,
            paymentMethod: commission.paymentMethod,
            transferStatus: commission.transferStatus,
          }
        : null,
      summary: {
        problemDetected: !order.affiliateId
          ? 'affiliateId é NULL - comissão NÃO foi criada'
          : commission
            ? 'OK'
            : 'Comissão não encontrada no banco',
        recommendations: getRecommendations(order, affiliate, commission),
      },
    };

    return NextResponse.json(diagnosis);
  } catch (error) {
    console.error('[Diagnosis] Erro:', error);
    return NextResponse.json(
      {
        error: 'Erro ao diagnosticar',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function getRecommendations(order: any, affiliate: any, commission: any): string[] {
  const recs: string[] = [];

  if (!order.affiliateId) {
    recs.push('🔴 CRÍTICO: order.affiliateId é NULL - O afiliado NÃO foi associado ao pedido');
    recs.push('   → Verifique os logs da API de criação do pedido em: /api/mercado-pago/pix');
    recs.push('   → Cookie "affiliate_code" não foi enviado ou estava vazio');
    recs.push('   → Código do afiliado no cookie não corresponde a nenhum afiliado ativo');
  }

  if (order.affiliateId && !commission) {
    recs.push('⚠️  Pedido tem affiliateId, mas comissão não foi criada');
    recs.push('   → Verifique se webhook do Mercado Pago foi disparado');
    recs.push('   → Verifique status do pedido - deve estar "completed" e "paid"');
    recs.push('   → Verifique se há erros nos logs do webhook em: /api/mercado-pago/webhook');
    return recs;
  }

  if (affiliate && affiliate.status !== 'active') {
    recs.push('⚠️  Afiliado com status "' + affiliate.status + '" não pode receber comissão');
    recs.push('   → Ative o afiliado no painel de admin');
  }

  if (commission && commission.status === 'pending') {
    recs.push('ℹ️  Comissão está com status "pending" - pode estar retida por fraude');
    recs.push('   → Revise a susposta fraude e aprove manualmente se necessário');
  }

  if (commission && !commission.pixTransferId && !commission.transferId) {
    recs.push('ℹ️  Comissão não foi transferida para o afiliado');
    recs.push('   → Status: ' + commission.status);
    recs.push('   → Método: ' + (commission.paymentMethod || 'não definido'));
  }

  if (!commission && order.affiliateId) {
    recs.push('✅ Nenhum problema detectado - verifique os logs para mais detalhes');
  } else if (commission && commission.paidAt) {
    recs.push('✅ Comissão foi paga em: ' + commission.paidAt);
  }

  return recs;
}
