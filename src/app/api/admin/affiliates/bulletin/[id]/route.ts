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

function isMissingAffiliateTypeColumnError(error: unknown): boolean {
  const err = error as {
    message?: string;
    cause?: { code?: string; message?: string };
  };

  return (
    err?.cause?.code === '42703' ||
    err?.message?.includes('affiliate_type') ||
    err?.cause?.message?.includes('affiliate_type') ||
    false
  );
}

const updateMessageSchema = z.object({
  message: z.string().min(1).max(2000).optional(),
  isActive: z.boolean().optional(),
  affiliateType: z.enum(['common', 'commercial_license', 'both']).optional(),
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
    if (validation.data.affiliateType !== undefined) {
      updateData.affiliateType = validation.data.affiliateType;
    }

    let updated:
      | {
          id: string;
          message: string;
          affiliateType: string;
          isActive: boolean;
          createdBy: string | null;
          createdAt: Date;
          updatedAt: Date;
        }
      | undefined;

    try {
      const [result] = await db
        .update(affiliateBulletinBoard)
        .set(updateData)
        .where(eq(affiliateBulletinBoard.id, id))
        .returning();

      updated = result;
    } catch (error) {
      if (!isMissingAffiliateTypeColumnError(error)) {
        throw error;
      }

      if (
        validation.data.affiliateType !== undefined &&
        validation.data.affiliateType !== 'common'
      ) {
        return NextResponse.json(
          {
            error:
              'Banco de dados ainda não atualizado para segmentação do mural. Execute a migration 0100 e tente novamente.',
          },
          { status: 409 }
        );
      }

      const legacyUpdateData = { ...updateData };
      delete legacyUpdateData.affiliateType;

      const [legacyResult] = await db
        .update(affiliateBulletinBoard)
        .set(legacyUpdateData)
        .where(eq(affiliateBulletinBoard.id, id))
        .returning({
          id: affiliateBulletinBoard.id,
          message: affiliateBulletinBoard.message,
          isActive: affiliateBulletinBoard.isActive,
          createdBy: affiliateBulletinBoard.createdBy,
          createdAt: affiliateBulletinBoard.createdAt,
          updatedAt: affiliateBulletinBoard.updatedAt,
        });

      updated = legacyResult
        ? {
            ...legacyResult,
            affiliateType: 'common',
          }
        : undefined;
    }

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
