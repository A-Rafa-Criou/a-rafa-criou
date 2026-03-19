import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateMaterials } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getR2SignedUrl } from '@/lib/r2-utils';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * GET /api/affiliates/materials
 *
 * Retorna materiais de divulgação filtrados por tipo do afiliado
 * - Afiliado comum: materiais 'common' ou 'both'
 * - Licença comercial: materiais 'commercial_license' ou 'both'
 *
 * Apenas materiais ativos (isActive = true) são retornados
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await rateLimitMiddleware(req, RATE_LIMITS.auth);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    // Buscar materiais filtrados por tipo do afiliado
    const materials = await db
      .select()
      .from(affiliateMaterials)
      .where(
        and(
          eq(affiliateMaterials.isActive, true),
          or(
            eq(affiliateMaterials.affiliateType, affiliate.affiliateType),
            eq(affiliateMaterials.affiliateType, 'both')
          )
        )
      )
      .orderBy(affiliateMaterials.displayOrder);

    // Gerar URLs assinadas sob demanda para cada material
    const materialsWithUrls = await Promise.all(
      materials.map(async material => {
        let fileUrl = material.fileUrl;
        // Se fileUrl é uma chave R2 (não começa com http), gerar URL assinada
        if (fileUrl && !fileUrl.startsWith('http')) {
          try {
            fileUrl = await getR2SignedUrl(fileUrl, 3600, false); // 1h de expiração
          } catch (err) {
            console.error(`[API MATERIALS] Erro ao gerar URL para ${material.id}:`, err);
          }
        }
        return {
          id: material.id,
          title: material.title,
          description: material.description,
          fileUrl,
          fileName: material.fileName,
          fileType: material.fileType,
          fileSize: material.fileSize,
          affiliateType: material.affiliateType,
          displayOrder: material.displayOrder,
          createdAt: material.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      materials: materialsWithUrls,
      totalMaterials: materialsWithUrls.length,
    });
  } catch (error) {
    console.error('Error fetching affiliate materials:', error);
    return NextResponse.json({ message: 'Erro ao buscar materiais' }, { status: 500 });
  }
}
