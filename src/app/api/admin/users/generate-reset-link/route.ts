import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';

const generateResetLinkSchema = z.object({
  userId: z.string().uuid(),
});

const SUPER_ADMINS = ['arafacriou@gmail.com', 'edduardooo2011@gmail.com'];

/**
 * POST /api/admin/users/generate-reset-link
 * Gera link de reset de senha para um usuário (SEM enviar email)
 * @returns { resetUrl: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação e permissão de super-admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é super-admin
    if (!SUPER_ADMINS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 2. Validar body
    const body = await request.json();
    const { userId } = generateResetLinkSchema.parse(body);

    // 3. Buscar usuário
    const [targetUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 4. Gerar token de reset
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // 5. Salvar token no banco
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpiry: expires,
      })
      .where(eq(users.id, targetUser.id));

    // 6. Montar URL de reset
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    // 7. Retornar apenas o link (SEM enviar email)
    return NextResponse.json({
      message: 'Link gerado com sucesso',
      resetUrl,
    });
  } catch (error) {
    console.error('Erro ao gerar link de reset:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erro ao gerar link de recuperação' }, { status: 500 });
  }
}
