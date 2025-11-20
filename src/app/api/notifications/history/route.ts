import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/notifications/history
 * Lista histórico de notificações do usuário
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;

    // Buscar notificações
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      notifications: userNotifications,
      total: userNotifications.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de notificações' },
      { status: 500 }
    );
  }
}
