import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Buscar usuário com este token
    const [user] = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);

    if (!user || !user.resetTokenExpiry) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Verificar se token expirou
    if (new Date() > user.resetTokenExpiry) {
      return NextResponse.json(
        { error: 'Token expirado. Solicite um novo link de recuperação.' },
        { status: 400 }
      );
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atualizar senha e limpar token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log(`[Reset Password] Senha redefinida para usuário: ${user.email}`);

    return NextResponse.json({
      message: 'Senha redefinida com sucesso!',
    });
  } catch (error) {
    console.error('[Reset Password] Erro:', error);
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
  }
}
