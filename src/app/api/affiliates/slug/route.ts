import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq, and, sql, ne } from 'drizzle-orm';
import { z } from 'zod';

const updateSlugSchema = z.object({
  customSlug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífen')
    .optional(),
});

// PATCH /api/affiliates/slug - Atualizar slug personalizado
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { customSlug } = updateSlugSchema.parse(body);

    // Verificar se o slug já está em uso
    if (customSlug) {
      const existing = await db
        .select({ id: affiliates.id })
        .from(affiliates)
        .where(and(eq(affiliates.customSlug, customSlug), ne(affiliates.userId, session.user.id)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Este slug já está em uso. Tente outro.' },
          { status: 409 }
        );
      }
    }

    // Atualizar o afiliado
    const [updatedAffiliate] = await db
      .update(affiliates)
      .set({
        customSlug: customSlug || null,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.userId, session.user.id))
      .returning();

    if (!updatedAffiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customSlug: updatedAffiliate.customSlug,
    });
  } catch (error) {
    console.error('Erro ao atualizar slug:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues[0]?.message || 'Erro de validação' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
