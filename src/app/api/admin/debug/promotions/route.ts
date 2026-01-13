import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getBrazilianTime } from '@/lib/brazilian-time';

/**
 * Rota de DEBUG para verificar promoções em produção
 * GET /api/admin/debug/promotions
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = getBrazilianTime();
    const nowUTC = new Date();

    // 1. Verificar promoções ativas no banco
    const promotionsResult = await db.execute(sql`
      SELECT 
        id,
        name,
        discount_type,
        discount_value,
        start_date,
        end_date,
        is_active,
        applies_to,
        created_at,
        CASE 
          WHEN NOW() >= start_date AND NOW() <= end_date THEN 'ATIVA'
          WHEN NOW() < start_date THEN 'FUTURA'
          ELSE 'EXPIRADA'
        END as status_temporal
      FROM promotions
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const promotions = (promotionsResult as any)?.rows || promotionsResult || [];

    // 2. Para cada promoção, buscar produtos e variações vinculadas
    const promotionsWithDetails = await Promise.all(
      promotions.map(async (promo: any) => {
        // Produtos vinculados
        const productsResult = await db.execute(sql`
          SELECT 
            pp.product_id,
            p.name as product_name
          FROM promotion_products pp
          LEFT JOIN products p ON p.id = pp.product_id
          WHERE pp.promotion_id = ${promo.id}
        `);

        const products = (productsResult as any)?.rows || productsResult || [];

        // Variações vinculadas
        const variationsResult = await db.execute(sql`
          SELECT 
            pv.variation_id,
            v.name as variation_name,
            v.price,
            p.name as product_name
          FROM promotion_variations pv
          LEFT JOIN product_variations v ON v.id = pv.variation_id
          LEFT JOIN products p ON p.id = v.product_id
          WHERE pv.promotion_id = ${promo.id}
        `);

        const variations = (variationsResult as any)?.rows || variationsResult || [];

        return {
          ...promo,
          products,
          variations,
        };
      })
    );

    // 3. Buscar algumas variações para teste
    const testVariationsResult = await db.execute(sql`
      SELECT 
        v.id,
        v.name,
        v.price,
        p.name as product_name
      FROM product_variations v
      JOIN products p ON p.id = v.product_id
      WHERE p.name LIKE '%WALLPAPER%' OR p.name LIKE '%Nao compre%'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    const testVariations = (testVariationsResult as any)?.rows || testVariationsResult || [];

    return NextResponse.json({
      success: true,
      timestamp: {
        brazilian: now.toISOString(),
        utc: nowUTC.toISOString(),
        formatted_br: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      },
      totalActivePromotions: promotions.length,
      promotions: promotionsWithDetails,
      testVariations,
      instructions: {
        message: 'Use os IDs das variações abaixo para testar',
        endpoint: 'GET /api/variations/[id]',
        note: 'Verifique se a promoção está sendo aplicada corretamente',
      },
    });
  } catch (error) {
    console.error('[DEBUG Promotions] Erro:', error);
    return NextResponse.json(
      {
        error: 'Erro ao buscar dados de debug',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
