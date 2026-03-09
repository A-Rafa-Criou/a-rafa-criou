/**
 * POST /api/affiliates/materials/[id]/download
 *
 * Registra download de material pelo afiliado
 * Armazena no affiliate_material_downloads para analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateMaterials, affiliateMaterialDownloads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: materialId } = await params;

    // Buscar afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Verificar se material existe
    const [material] = await db
      .select({ id: affiliateMaterials.id })
      .from(affiliateMaterials)
      .where(eq(affiliateMaterials.id, materialId))
      .limit(1);

    if (!material) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 });
    }

    // Registrar download
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    await db.insert(affiliateMaterialDownloads).values({
      affiliateId: affiliate.id,
      materialId,
      ipAddress: ip.substring(0, 45),
      userAgent: userAgent.substring(0, 500),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Material Download] Erro ao registrar download:', error);
    return NextResponse.json({ error: 'Erro ao registrar download' }, { status: 500 });
  }
}
