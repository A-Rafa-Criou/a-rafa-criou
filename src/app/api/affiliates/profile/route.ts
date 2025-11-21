import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PUT /api/affiliates/profile - Atualizar dados bancários do afiliado
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { pixKey, bankName, bankAccount } = body;

    // Buscar afiliado pelo userId
    const [affiliate] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Atualizar dados
    await db
      .update(affiliates)
      .set({
        pixKey: pixKey || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
      })
      .where(eq(affiliates.id, affiliate.id));

    return NextResponse.json({ success: true, message: 'Dados atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
