import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { siteSettings } from '@/lib/db/schema';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/affiliates/commission-rate
 *
 * Retorna a taxa de comissão padrão configurada pelo admin.
 * Endpoint público para exibir no mural de comissões.
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMITS.public);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const settings = await db
      .select({
        affiliateDefaultCommission: siteSettings.affiliateDefaultCommission,
        affiliateEnabled: siteSettings.affiliateEnabled,
      })
      .from(siteSettings)
      .limit(1);

    const rate = settings.length > 0 ? settings[0].affiliateDefaultCommission : '20.00';

    const enabled = settings.length > 0 ? settings[0].affiliateEnabled : true;

    return NextResponse.json({
      rate,
      enabled,
    });
  } catch (error) {
    console.error('[Commission Rate] Erro:', error);
    return NextResponse.json({ rate: '20.00', enabled: true });
  }
}
