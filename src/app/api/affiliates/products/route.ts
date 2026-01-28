import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }

    // Buscar produtos ativos com variações e imagens
    const productsList = await db.query.products.findMany({
      where: eq(products.isActive, true),
      with: {
        variations: {
          limit: 1,
          orderBy: (variations, { asc }) => [asc(variations.sortOrder)],
        },
        images: {
          limit: 1,
          orderBy: (images, { asc }) => [asc(images.sortOrder)],
        },
      },
    });

    return NextResponse.json({
      success: true,
      products: productsList.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.variations[0]?.price ? parseFloat(p.variations[0].price) * 100 : 0,
        image: p.images[0]?.url || null,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return NextResponse.json({ message: 'Erro ao buscar produtos' }, { status: 500 });
  }
}
