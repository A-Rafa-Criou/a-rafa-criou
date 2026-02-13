/**
 * API Pública (Afiliados) - Mural de Notícias
 *
 * GET /api/affiliates/bulletin — Retorna mensagens ativas do mural
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateBulletinBoard, affiliates } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';

/**
 * GET /api/affiliates/bulletin
 * Retorna mensagens ativas do mural para afiliados logados
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é afiliado
    const [affiliate] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 403 });
    }

    // Buscar apenas mensagens ativas, ordenadas pela mais recente
    const messages = await db
      .select({
        id: affiliateBulletinBoard.id,
        message: affiliateBulletinBoard.message,
        createdAt: affiliateBulletinBoard.createdAt,
      })
      .from(affiliateBulletinBoard)
      .where(and(eq(affiliateBulletinBoard.isActive, true)))
      .orderBy(desc(affiliateBulletinBoard.createdAt))
      .limit(20);

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('[Bulletin Board] Erro ao buscar mensagens:', error);
    return NextResponse.json({ error: 'Erro ao buscar mensagens do mural' }, { status: 500 });
  }
}
