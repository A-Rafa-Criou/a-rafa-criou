import { NextRequest, NextResponse } from 'next/server';
import { translateAttributes } from '@/lib/db/i18n-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attributes, locale } = body;

    if (!attributes || !Array.isArray(attributes)) {
      return NextResponse.json({ error: 'Invalid attributes format' }, { status: 400 });
    }

    const translated = await translateAttributes(attributes, locale || 'pt');

    return NextResponse.json({ attributes: translated });
  } catch (error) {
    console.error('Error translating attributes:', error);
    return NextResponse.json({ error: 'Failed to translate attributes' }, { status: 500 });
  }
}
