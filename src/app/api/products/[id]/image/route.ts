import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productImages } from '@/lib/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const variationId = searchParams.get('variationId');

    let imageUrl = null;

    if (variationId && variationId !== '') {
      // Buscar imagem específica da variação
      const [variationImage] = await db
        .select()
        .from(productImages)
        .where(and(eq(productImages.productId, id), eq(productImages.variationId, variationId)))
        .limit(1);

      if (variationImage) {
        imageUrl = variationImage.url;
      }
    }

    // Se não encontrou imagem da variação, buscar imagem padrão do produto
    if (!imageUrl) {
      const [productImage] = await db
        .select()
        .from(productImages)
        .where(and(eq(productImages.productId, id), isNull(productImages.variationId)))
        .orderBy(asc(productImages.sortOrder))
        .limit(1);

      if (productImage) {
        imageUrl = productImage.url;
      }
    }

    return NextResponse.json({
      imageUrl,
    });
  } catch (error) {
    console.error('Erro ao buscar imagem do produto:', error);
    return NextResponse.json(
      { imageUrl: null },
      { status: 200 } // Retorna 200 com null para não quebrar o frontend
    );
  }
}
