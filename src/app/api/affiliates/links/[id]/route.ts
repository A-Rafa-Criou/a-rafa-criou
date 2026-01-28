import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateLinks, affiliates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateLinkSchema = z.object({
  customName: z.string().max(255).optional(),
});

// PATCH /api/affiliates/links/[id] - Atualizar nome do link
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: linkId } = await params;
    const body = await request.json();
    const validatedData = updateLinkSchema.parse(body);

    // Buscar afiliado pelo userId
    const [affiliate] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Verificar se o link pertence ao afiliado
    const [link] = await db
      .select({ id: affiliateLinks.id })
      .from(affiliateLinks)
      .where(and(eq(affiliateLinks.id, linkId), eq(affiliateLinks.affiliateId, affiliate.id)))
      .limit(1);

    if (!link) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }

    // Atualizar o link
    const [updatedLink] = await db
      .update(affiliateLinks)
      .set({
        customName: validatedData.customName,
        updatedAt: new Date(),
      })
      .where(eq(affiliateLinks.id, linkId))
      .returning();

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Erro ao atualizar link:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/affiliates/links/[id] - Deletar link do afiliado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: linkId } = await params;

    // Buscar afiliado pelo userId
    const [affiliate] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Verificar se o link pertence ao afiliado
    const [link] = await db
      .select({ id: affiliateLinks.id })
      .from(affiliateLinks)
      .where(and(eq(affiliateLinks.id, linkId), eq(affiliateLinks.affiliateId, affiliate.id)))
      .limit(1);

    if (!link) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }

    // Deletar o link
    await db.delete(affiliateLinks).where(eq(affiliateLinks.id, linkId));

    return NextResponse.json({ success: true, message: 'Link deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar link:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
