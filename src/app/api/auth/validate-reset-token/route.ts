import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }

    // Buscar usuário com este token
    const [user] = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);

    if (!user || !user.resetTokenExpiry) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Verificar se token expirou
    if (new Date() > user.resetTokenExpiry) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('[Validate Token] Erro:', error);
    return NextResponse.json({ error: 'Erro ao validar token' }, { status: 500 });
  }
}
