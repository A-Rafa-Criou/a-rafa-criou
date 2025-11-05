import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    console.log('[Reset Password] 🔄 Iniciando reset de senha');
    console.log('[Reset Password] Token recebido:', token?.substring(0, 10) + '...');

    if (!token || !password) {
      console.log('[Reset Password] ❌ Token ou senha não fornecidos');
      return NextResponse.json({ error: 'Token e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      console.log('[Reset Password] ❌ Senha muito curta:', password.length, 'caracteres');
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Buscar usuário com este token
    console.log('[Reset Password] 🔍 Buscando usuário com token...');
    const [user] = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);

    if (!user || !user.resetTokenExpiry) {
      console.log('[Reset Password] ❌ Token inválido ou usuário não encontrado');
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    console.log('[Reset Password] ✅ Usuário encontrado:', user.email);
    console.log('[Reset Password] Token expira em:', user.resetTokenExpiry);

    // Verificar se token expirou
    if (new Date() > user.resetTokenExpiry) {
      console.log('[Reset Password] ❌ Token expirado');
      return NextResponse.json(
        { error: 'Token expirado. Solicite um novo link de recuperação.' },
        { status: 400 }
      );
    }

    console.log('[Reset Password] ✅ Token válido');
    console.log('[Reset Password] 🔐 Gerando hash da nova senha...');

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('[Reset Password] ✅ Hash gerado:', hashedPassword.substring(0, 20) + '...');

    console.log('[Reset Password] 💾 Atualizando usuário no banco...');

    // Atualizar senha, limpar token E campos legados do WordPress
    const result = await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        legacyPasswordHash: null,    // Limpar hash legado do WordPress
        legacyPasswordType: null,     // Limpar tipo legado
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning({ id: users.id, email: users.email });

    console.log('[Reset Password] ✅ Usuário atualizado:', result);
    console.log('[Reset Password] 🎉 Senha redefinida com sucesso para:', user.email);

    return NextResponse.json({
      message: 'Senha redefinida com sucesso!',
    });
  } catch (error) {
    console.error('[Reset Password] ❌ Erro:', error);
    return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
  }
}
