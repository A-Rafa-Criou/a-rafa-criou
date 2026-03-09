/**
 * API Admin - Gerenciar Material Individual
 *
 * PATCH  /api/admin/affiliates/materials/[id] — Atualiza material
 * DELETE /api/admin/affiliates/materials/[id] — Remove material + arquivo R2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateMaterials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { deleteFromR2 } from '@/lib/r2-utils';

const updateMaterialSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  fileUrl: z.string().min(1).optional(),
  fileName: z.string().min(1).max(255).optional(),
  fileType: z.string().max(100).nullable().optional(),
  fileSize: z.number().int().positive().nullable().optional(),
  affiliateType: z.enum(['common', 'commercial_license', 'both']).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/admin/affiliates/materials/[id]
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = updateMaterialSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(validation.data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const [updated] = await db
      .update(affiliateMaterials)
      .set(updateData)
      .where(eq(affiliateMaterials.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, material: updated });
  } catch (error) {
    console.error('[Admin Materials] Erro ao atualizar:', error);
    return NextResponse.json({ error: 'Erro ao atualizar material' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/affiliates/materials/[id]
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;

    // Buscar material para obter a key do R2
    const [material] = await db
      .select()
      .from(affiliateMaterials)
      .where(eq(affiliateMaterials.id, id))
      .limit(1);

    if (!material) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 });
    }

    // Tentar remover arquivo do R2
    try {
      const fileKey = extractR2Key(material.fileUrl);
      if (fileKey) {
        await deleteFromR2(fileKey);
      }
    } catch (r2Error) {
      console.warn('[Admin Materials] Erro ao remover arquivo do R2 (continuando):', r2Error);
    }

    // Remover do banco
    await db.delete(affiliateMaterials).where(eq(affiliateMaterials.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Materials] Erro ao deletar:', error);
    return NextResponse.json({ error: 'Erro ao remover material' }, { status: 500 });
  }
}

/**
 * Extrai a key do R2 a partir de uma URL
 * URLs do R2 seguem o formato: https://...r2.cloudflarestorage.com/bucket/key
 * ou podem ser URLs assinadas com a key no path
 */
function extractR2Key(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Remove o primeiro "/" e o nome do bucket
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    // Se a URL contém o bucket name, pular o primeiro segmento
    if (pathParts.length > 1 && pathParts[0] === 'pdfs') {
      return pathParts.join('/');
    }
    // Para URLs com prefixo affiliate-materials/
    if (pathParts.length > 0) {
      const key = pathParts.join('/');
      if (key.startsWith('affiliate-materials/')) {
        return key;
      }
    }
    return pathParts.join('/') || null;
  } catch {
    return null;
  }
}
