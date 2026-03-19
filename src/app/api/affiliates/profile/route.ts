import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

const profileUpdateSchema = z.object({
  pixKey: z.string().trim().min(11).max(255).nullable().optional(),
  bankName: z.string().trim().min(2).max(255).nullable().optional(),
  bankAccount: z.string().trim().min(3).max(50).nullable().optional(),
});

// PUT /api/affiliates/profile - Atualizar dados bancários do afiliado
export async function PUT(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(request, RATE_LIMITS.auth);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { pixKey, bankName, bankAccount } = validation.data;

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
        pixKey: pixKey ?? null,
        bankName: bankName ?? null,
        bankAccount: bankAccount ?? null,
      })
      .where(eq(affiliates.id, affiliate.id));

    return NextResponse.json({ success: true, message: 'Dados atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil do afiliado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
