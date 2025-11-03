import { NextRequest, NextResponse } from 'next/server';
import { getProductWithTranslation } from '@/lib/db/i18n-helpers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const locale = searchParams.get('locale') || 'pt';

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await getProductWithTranslation(id, locale);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ name: product.name });
  } catch (error) {
    console.error('Error fetching product translation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product translation' },
      { status: 500 }
    );
  }
}
