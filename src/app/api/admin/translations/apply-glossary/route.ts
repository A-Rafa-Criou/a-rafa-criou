import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { products, productI18n } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSlug, getCustomTranslationsES } from '@/lib/deepl';

/**
 * POST /api/admin/translations/apply-glossary
 * Aplica o glossário customizado em todas as traduções existentes
 * Body: { locale, dryRun? }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dryRun = false } = body;

    const glossary = getCustomTranslationsES();
    const sortedKeys = Object.keys(glossary).sort((a, b) => b.length - a.length);

    // Buscar todos os produtos com tradução ES
    const allProducts = await db
      .select({
        productId: products.id,
        ptName: products.name,
        esName: productI18n.name,
        esDescription: productI18n.description,
        esShortDescription: productI18n.shortDescription,
      })
      .from(products)
      .innerJoin(
        productI18n,
        and(eq(products.id, productI18n.productId), eq(productI18n.locale, 'es'))
      );

    const results: Array<{
      type: 'product' | 'variation';
      id: string;
      ptName: string;
      currentName: string;
      newName: string;
    }> = [];

    let updated = 0;

    for (const product of allProducts) {
      const ptName = product.ptName || '';
      let fixedName = product.esName || '';

      // Aplicar glossário
      for (const ptTerm of sortedKeys) {
        const esTerm = glossary[ptTerm];
        const ptRegex = new RegExp(`\\b${escapeRegex(ptTerm)}\\b`, 'gi');
        if (!ptRegex.test(ptName)) continue;

        const esCorrectRegex = new RegExp(`\\b${escapeRegex(esTerm)}\\b`, 'gi');

        // Corrigir nome se necessário
        if (!esCorrectRegex.test(fixedName)) {
          const ptInEsRegex = new RegExp(`\\b${escapeRegex(ptTerm)}\\b`, 'gi');
          if (ptInEsRegex.test(fixedName)) {
            fixedName = fixedName.replace(ptInEsRegex, esTerm);
          }
        }
      }

      const nameChanged = fixedName !== product.esName;

      if (nameChanged) {
        results.push({
          type: 'product',
          id: product.productId,
          ptName,
          currentName: product.esName || '',
          newName: fixedName,
        });

        if (!dryRun) {
          await db
            .update(productI18n)
            .set({
              name: fixedName,
              slug: generateSlug(fixedName),
              seoTitle: fixedName,
              updatedAt: new Date(),
            })
            .where(and(eq(productI18n.productId, product.productId), eq(productI18n.locale, 'es')));
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total: results.length,
      updated: dryRun ? 0 : updated,
      glossaryTerms: Object.keys(glossary).length,
      preview: results,
    });
  } catch (error) {
    console.error('Erro ao aplicar glossário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
