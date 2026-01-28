import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateMaterials } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

/**
 * GET /api/affiliates/materials
 *
 * Retorna materiais de divulgação filtrados por tipo do afiliado
 * - Afiliado comum: materiais 'common' ou 'both'
 * - Licença comercial: materiais 'commercial_license' ou 'both'
 *
 * Apenas materiais ativos (isActive = true) são retornados
 */
export async function GET() {
  try {
    console.log('[API MATERIALS] Iniciando busca de materiais...');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('[API MATERIALS] Usuário não autenticado');
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    console.log('[API MATERIALS] Usuário autenticado:', session.user.id);

    // Buscar afiliado do usuário logado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      console.log('[API MATERIALS] Usuário não é afiliado');
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    console.log('[API MATERIALS] Afiliado encontrado:', {
      id: affiliate.id,
      type: affiliate.affiliateType,
    });

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

    console.log('[API MATERIALS] Materiais encontrados:', materials.length);

    return NextResponse.json({
      success: true,
      materials: materials.map(material => ({
        id: material.id,
        title: material.title,
        description: material.description,
        fileUrl: material.fileUrl,
        fileName: material.fileName,
        fileType: material.fileType,
        fileSize: material.fileSize,
        affiliateType: material.affiliateType,
        displayOrder: material.displayOrder,
        createdAt: material.createdAt,
      })),
      totalMaterials: materials.length,
    });
  } catch (error) {
    console.error('Error fetching affiliate materials:', error);
    return NextResponse.json({ message: 'Erro ao buscar materiais' }, { status: 500 });
  }
}
