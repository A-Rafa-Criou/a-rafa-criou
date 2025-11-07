import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar variação
    const [variation] = await db
      .select()
      .from(productVariations)
      .where(eq(productVariations.id, id))
      .limit(1);

    if (!variation) {
      return NextResponse.json({ error: 'Variação não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      id: variation.id,
      name: variation.name,
      price: variation.price,
      slug: variation.slug,
      isActive: variation.isActive,
      sortOrder: variation.sortOrder,
    });
  } catch (error) {
    console.error('Erro ao buscar variação:', error);
    return NextResponse.json({ error: 'Erro ao buscar variação' }, { status: 500 });
  }
}
