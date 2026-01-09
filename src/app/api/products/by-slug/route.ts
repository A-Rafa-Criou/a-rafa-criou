import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/db/products';

// 🔥 Cache alinhado com ISR da página de produto
export const revalidate = 3600; // 1 hora

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const locale = searchParams.get('locale') || 'pt';

    if (!slug) {
      return NextResponse.json({ error: 'Slug é obrigatório' }, { status: 400 });
    }

    const product = await getProductBySlug(slug, locale);

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 });
  }
}
