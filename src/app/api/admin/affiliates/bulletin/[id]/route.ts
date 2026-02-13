/**
 * API Admin - Gerenciar Mensagem Individual do Mural
 *
 * PATCH  /api/admin/affiliates/bulletin/[id] — Atualiza mensagem (texto ou ativo/inativo)
 * DELETE /api/admin/affiliates/bulletin/[id] — Remove mensagem do mural
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateBulletinBoard } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateMessageSchema = z.object({
  message: z.string().min(1).max(2000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/admin/affiliates/bulletin/[id]
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = updateMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (validation.data.message !== undefined) {
      updateData.message = validation.data.message;
    }
    if (validation.data.isActive !== undefined) {
      updateData.isActive = validation.data.isActive;
    }

    const [updated] = await db
      .update(affiliateBulletinBoard)
      .set(updateData)
      .where(eq(affiliateBulletinBoard.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error('[Bulletin Board] Erro ao atualizar:', error);
    return NextResponse.json({ error: 'Erro ao atualizar mensagem' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/affiliates/bulletin/[id]
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(affiliateBulletinBoard)
      .where(eq(affiliateBulletinBoard.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Bulletin Board] Erro ao deletar:', error);
    return NextResponse.json({ error: 'Erro ao remover mensagem' }, { status: 500 });
  }
}
