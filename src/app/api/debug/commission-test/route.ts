import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliates, siteSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/debug/commission-test
 *
 * Endpoint de diagnóstico para testar cálculo de comissões
 *
 * Query params:
 * - affiliateId (opcional): ID do afiliado para verificar
 * - orderTotal (optional): valor do pedido para simular cálculo
 *
 * Retorna:
 * - Comissão padrão global
 * - Todas as comissões individuais dos afiliados
 * - Simulação de cálculo para um pedido específico
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const affiliateId = searchParams.get('affiliateId');
    const orderTotalStr = searchParams.get('orderTotal');
    const orderTotal = orderTotalStr ? parseFloat(orderTotalStr) : null;

    // 1. Buscar configuração global
    const [settings] = await db.select().from(siteSettings).limit(1);
    const globalCommission = settings?.affiliateDefaultCommission || '20.00';

    console.log('[DEBUG] Configuração global de comissão:', globalCommission);

    // 2. Se pediu um afiliado específico
    if (affiliateId) {
      const [affiliate] = await db
        .select({
          id: affiliates.id,
          name: affiliates.name,
          email: affiliates.email,
          commissionType: affiliates.commissionType,
          commissionValue: affiliates.commissionValue,
          status: affiliates.status,
        })
        .from(affiliates)
        .where(eq(affiliates.id, affiliateId))
        .limit(1);

      if (!affiliate) {
        return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
      }

      const affiliateCommission = parseFloat(affiliate.commissionValue.toString());

      console.log('[DEBUG] Afiliado encontrado:', {
        id: affiliate.id,
        name: affiliate.name,
        commissionType: affiliate.commissionType,
        commissionValue: affiliateCommission,
      });

      // 3. Se solicitou simulação de cálculo
      if (orderTotal && orderTotal > 0) {
        const calculatedCommission = (orderTotal * affiliateCommission) / 100;

        console.log('[DEBUG] Simulação de cálculo:', {
          orderTotal,
          commissionPercentage: affiliateCommission,
          calculatedCommission,
        });

        return NextResponse.json({
          status: 'ok',
          affiliate: {
            id: affiliate.id,
            name: affiliate.name,
            email: affiliate.email,
            commissionType: affiliate.commissionType,
            commissionValue: affiliateCommission,
            status: affiliate.status,
          },
          globalCommission: parseFloat(globalCommission),
          simulation: {
            orderTotal,
            commissionPercentage: affiliateCommission,
            calculatedCommission,
            formula: `(${orderTotal} * ${affiliateCommission}) / 100 = ${calculatedCommission}`,
          },
        });
      }

      return NextResponse.json({
        status: 'ok',
        affiliate: {
          id: affiliate.id,
          name: affiliate.name,
          email: affiliate.email,
          commissionType: affiliate.commissionType,
          commissionValue: affiliateCommission,
          status: affiliate.status,
        },
        globalCommission: parseFloat(globalCommission),
        note: 'Para simular um cálculo, adicione ?orderTotal=100 à URL',
      });
    }

    // 4. Se não pediu afiliado específico, listar todos
    const allAffiliates = await db
      .select({
        id: affiliates.id,
        name: affiliates.name,
        email: affiliates.email,
        commissionType: affiliates.commissionType,
        commissionValue: affiliates.commissionValue,
        status: affiliates.status,
      })
      .from(affiliates)
      .orderBy(affiliates.name);

    console.log('[DEBUG] Total de afiliados:', allAffiliates.length);

    const affiliatesWithParsedCommissions = allAffiliates.map(aff => ({
      id: aff.id,
      name: aff.name,
      email: aff.email,
      commissionType: aff.commissionType,
      commissionValue: parseFloat(aff.commissionValue.toString()),
      status: aff.status,
      isUsingGlobal: parseFloat(aff.commissionValue.toString()) === parseFloat(globalCommission),
    }));

    return NextResponse.json({
      status: 'ok',
      globalCommission: parseFloat(globalCommission),
      totalAffiliates: affiliatesWithParsedCommissions.length,
      affiliatesUsingGlobal: affiliatesWithParsedCommissions.filter(a => a.isUsingGlobal).length,
      affiliatesWithCustom: affiliatesWithParsedCommissions.filter(a => !a.isUsingGlobal).length,
      affiliates: affiliatesWithParsedCommissions,
      testQueries: {
        testSpecificAffiliate: `/api/debug/commission-test?affiliateId=<AFFILIATE_ID>`,
        testCalculation: `/api/debug/commission-test?affiliateId=<AFFILIATE_ID>&orderTotal=100`,
      },
    });
  } catch (error) {
    console.error('[DEBUG] Erro ao testar comissões:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao testar comissões' },
      { status: 500 }
    );
  }
}
