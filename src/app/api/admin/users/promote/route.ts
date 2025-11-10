import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// E-mails autorizados a alterar cargos sem senha
const AUTHORIZED_EMAILS = new Set([
  'byrafaelapereirajw@gmail.com',
  'arafacriou@gmail.com',
  'edduardooo2011@gmail.com',
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const currentEmail = session.user.email.toLowerCase();

    // Verificar se é um e-mail autorizado
    if (!AUTHORIZED_EMAILS.has(currentEmail)) {
      return NextResponse.json(
        { error: 'Apenas administradores autorizados podem alterar cargos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, action } = body;

    if (!email || !action) {
      return NextResponse.json({ error: 'Email e ação são obrigatórios' }, { status: 400 });
    }

    if (!['promote', 'demote'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    // Encontrar usuário alvo
    const targetUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!targetUser[0]) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Executar ação
    const newRole = action === 'promote' ? 'admin' : 'user';

    await db
      .update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    const actionText =
      action === 'promote' ? 'promovido a administrador' : 'rebaixado a usuário comum';

    return NextResponse.json({
      success: true,
      message: `Usuário ${targetUser[0].name || email} foi ${actionText} com sucesso`,
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
