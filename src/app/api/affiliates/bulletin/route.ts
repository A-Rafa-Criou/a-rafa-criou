/**
 * API Pública (Afiliados) - Mural de Notícias
 *
 * GET /api/affiliates/bulletin — Retorna mensagens ativas do mural
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateBulletinBoard, affiliates } from '@/lib/db/schema';
import { and, eq, desc, or } from 'drizzle-orm';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

function isMissingAffiliateTypeColumnError(error: unknown): boolean {
  const err = error as {
    message?: string;
    cause?: { code?: string; message?: string };
  };

  return (
    err?.cause?.code === '42703' ||
    err?.message?.includes('affiliate_type') ||
    err?.cause?.message?.includes('affiliate_type') ||
    false
  );
}

/**
 * GET /api/affiliates/bulletin
 * Retorna mensagens ativas do mural para afiliados logados
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMITS.auth);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é afiliado
    const [affiliate] = await db
      .select({ id: affiliates.id, affiliateType: affiliates.affiliateType })
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 403 });
    }

    // Buscar apenas mensagens ativas, ordenadas pela mais recente
    let messages: Array<{
      id: string;
      message: string;
      affiliateType: string;
      createdAt: Date;
    }> = [];

    try {
      messages = await db
        .select({
          id: affiliateBulletinBoard.id,
          message: affiliateBulletinBoard.message,
          affiliateType: affiliateBulletinBoard.affiliateType,
          createdAt: affiliateBulletinBoard.createdAt,
        })
        .from(affiliateBulletinBoard)
        .where(
          and(
            eq(affiliateBulletinBoard.isActive, true),
            or(
              eq(affiliateBulletinBoard.affiliateType, affiliate.affiliateType),
              eq(affiliateBulletinBoard.affiliateType, 'both')
            )
          )
        )
        .orderBy(desc(affiliateBulletinBoard.createdAt))
        .limit(20);
    } catch (error) {
      if (!isMissingAffiliateTypeColumnError(error)) {
        throw error;
      }

      // Compatibilidade temporária com banco antigo (sem segmentação)
      const legacyMessages = await db
        .select({
          id: affiliateBulletinBoard.id,
          message: affiliateBulletinBoard.message,
          createdAt: affiliateBulletinBoard.createdAt,
        })
        .from(affiliateBulletinBoard)
        .where(eq(affiliateBulletinBoard.isActive, true))
        .orderBy(desc(affiliateBulletinBoard.createdAt))
        .limit(20);

      messages = legacyMessages.map(item => ({
        ...item,
        affiliateType: 'common',
      }));
    }

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('[Bulletin Board] Erro ao buscar mensagens:', error);
    return NextResponse.json({ error: 'Erro ao buscar mensagens do mural' }, { status: 500 });
  }
}
