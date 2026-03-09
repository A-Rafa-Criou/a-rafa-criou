/**
 * API Admin - Gestão de Materiais para Afiliados
 *
 * GET  /api/admin/affiliates/materials — Lista todos os materiais
 * POST /api/admin/affiliates/materials — Cria novo material
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateMaterials } from '@/lib/db/schema';
import { desc, eq, or, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { getR2SignedUrl } from '@/lib/r2-utils';

const createMaterialSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().max(2000).nullable().optional(),
  fileUrl: z.string().min(1, 'Chave do arquivo é obrigatória'),
  fileName: z.string().min(1).max(255),
  fileType: z.string().max(100).nullable().optional(),
  fileSize: z.number().int().positive().nullable().optional(),
  affiliateType: z.enum(['common', 'commercial_license', 'both']),
  displayOrder: z.number().int().min(0).default(0),
});

/**
 * GET /api/admin/affiliates/materials
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type');
    const search = searchParams.get('search');

    let query = db.select().from(affiliateMaterials);

    const conditions = [];

    if (filterType && ['common', 'commercial_license', 'both'].includes(filterType)) {
      conditions.push(eq(affiliateMaterials.affiliateType, filterType));
    }

    if (search) {
      conditions.push(
        or(
          ilike(affiliateMaterials.title, `%${search}%`),
          ilike(affiliateMaterials.fileName, `%${search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      const { and } = await import('drizzle-orm');
      query = query.where(and(...conditions)) as typeof query;
    }

    const materials = await query.orderBy(desc(affiliateMaterials.createdAt));

    // Gerar URLs assinadas para preview no admin
    const materialsWithPreview = await Promise.all(
      materials.map(async material => {
        let previewUrl: string | null = null;
        if (material.fileUrl && !material.fileUrl.startsWith('http')) {
          try {
            previewUrl = await getR2SignedUrl(material.fileUrl, 3600, false);
          } catch {
            // silently fail - preview won't be available
          }
        } else {
          previewUrl = material.fileUrl;
        }
        return { ...material, previewUrl };
      })
    );

    return NextResponse.json({ success: true, materials: materialsWithPreview });
  } catch (error) {
    console.error('[Admin Materials] Erro ao listar materiais:', error);
    return NextResponse.json({ error: 'Erro ao listar materiais' }, { status: 500 });
  }
}

/**
 * POST /api/admin/affiliates/materials
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createMaterialSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      affiliateType,
      displayOrder,
    } = validation.data;

    const [newMaterial] = await db
      .insert(affiliateMaterials)
      .values({
        title,
        description: description ?? null,
        fileUrl,
        fileName,
        fileType: fileType ?? null,
        fileSize: fileSize ?? null,
        affiliateType,
        displayOrder,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, material: newMaterial }, { status: 201 });
  } catch (error) {
    console.error('[Admin Materials] Erro ao criar material:', error);
    return NextResponse.json({ error: 'Erro ao criar material' }, { status: 500 });
  }
}
