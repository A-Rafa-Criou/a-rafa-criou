import { NextRequest, NextResponse } from 'next/server';
import { translateProduct, translateVariation, translateCategory } from '@/lib/deepl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API rápida para tradução em tempo real (usada durante criação de produto/categoria)
 * POST /api/translate
 * Body: {
 *   type: 'product' | 'variation' | 'category',
 *   data: { name, description?, shortDescription? } | { name } | { name, description? },
 *   targetLangs?: ('EN' | 'ES')[]  // Padrão: ['EN', 'ES']
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, targetLangs = ['EN', 'ES'] } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Campos obrigatórios: type, data' }, { status: 400 });
    }

    const results: Record<string, unknown> = {};

    // Traduzir em paralelo para todos os idiomas solicitados
    if (type === 'product') {
      const translations = await Promise.all(
        targetLangs.map(async (lang: 'EN' | 'ES') => {
          const translated = await translateProduct(
            {
              name: data.name || '',
              description: data.description || null,
              shortDescription: data.shortDescription || null,
            },
            lang,
            'PT'
          );
          return { lang: lang.toLowerCase(), ...translated };
        })
      );

      translations.forEach(t => {
        results[t.lang] = {
          name: t.name,
          description: t.description,
          shortDescription: t.shortDescription,
        };
      });
    } else if (type === 'variation') {
      const translations = await Promise.all(
        targetLangs.map(async (lang: 'EN' | 'ES') => {
          const translated = await translateVariation({ name: data.name || '' }, lang, 'PT');
          return { lang: lang.toLowerCase(), ...translated };
        })
      );

      translations.forEach(t => {
        results[t.lang] = { name: t.name };
      });
    } else if (type === 'category') {
      const translations = await Promise.all(
        targetLangs.map(async (lang: 'EN' | 'ES') => {
          const translated = await translateCategory(
            { name: data.name || '', description: data.description || null },
            lang,
            'PT'
          );
          return { lang: lang.toLowerCase(), ...translated };
        })
      );

      translations.forEach(t => {
        results[t.lang] = { name: t.name, description: t.description };
      });
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "product", "variation" ou "category"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ translations: results });
  } catch (error) {
    console.error('❌ Erro na tradução:', error);
    return NextResponse.json(
      {
        error: 'Erro ao traduzir',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
