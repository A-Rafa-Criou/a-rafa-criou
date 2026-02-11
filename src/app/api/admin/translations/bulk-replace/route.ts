import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { products, productI18n, productVariations, productVariationI18n } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { generateSlug } from '@/lib/deepl';

/**
 * POST /api/admin/translations/bulk-replace
 * Substituição em massa de termos nas traduções
 * Body: { locale, findText, replaceText, dryRun? }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { locale, findText, replaceText, dryRun = false } = body;

    if (!locale || !findText || replaceText === undefined) {
      return NextResponse.json(
        { error: 'locale, findText e replaceText são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar produtos que contêm o texto a ser substituído (case-insensitive via ILIKE)
    const affectedProducts = await db
      .select({
        productId: productI18n.productId,
        name: productI18n.name,
        description: productI18n.description,
        shortDescription: productI18n.shortDescription,
        ptName: products.name,
      })
      .from(productI18n)
      .innerJoin(products, eq(products.id, productI18n.productId))
      .where(
        and(
          eq(productI18n.locale, locale),
          sql`(${productI18n.name} ILIKE ${'%' + findText + '%'} OR ${productI18n.description} ILIKE ${'%' + findText + '%'} OR ${productI18n.shortDescription} ILIKE ${'%' + findText + '%'})`
        )
      );

    // Buscar variações afetadas
    const affectedVariations = await db
      .select({
        variationId: productVariationI18n.variationId,
        name: productVariationI18n.name,
        ptName: productVariations.name,
      })
      .from(productVariationI18n)
      .innerJoin(productVariations, eq(productVariations.id, productVariationI18n.variationId))
      .where(
        and(
          eq(productVariationI18n.locale, locale),
          sql`${productVariationI18n.name} ILIKE ${'%' + findText + '%'}`
        )
      );

    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    const preview: Array<{
      type: 'product' | 'variation';
      id: string;
      ptName: string;
      currentName: string;
      newName: string;
      descriptionChanged: boolean;
      shortDescriptionChanged: boolean;
    }> = [];

    let updated = 0;

    // Processar produtos
    for (const product of affectedProducts) {
      const newName = product.name.replace(regex, replaceText);
      const newDesc = product.description?.replace(regex, replaceText) ?? product.description;
      const newShortDesc =
        product.shortDescription?.replace(regex, replaceText) ?? product.shortDescription;

      const nameChanged = newName !== product.name;
      const descChanged = newDesc !== product.description;
      const shortDescChanged = newShortDesc !== product.shortDescription;

      if (nameChanged || descChanged || shortDescChanged) {
        preview.push({
          type: 'product',
          id: product.productId,
          ptName: product.ptName,
          currentName: product.name,
          newName,
          descriptionChanged: descChanged,
          shortDescriptionChanged: shortDescChanged,
        });

        if (!dryRun) {
          const updateData: Record<string, string | Date | null> = { updatedAt: new Date() };
          if (nameChanged) {
            updateData.name = newName;
            updateData.slug = generateSlug(newName);
            updateData.seoTitle = newName;
          }
          if (descChanged) {
            updateData.description = newDesc;
            updateData.seoDescription = newDesc;
          }
          if (shortDescChanged) {
            updateData.shortDescription = newShortDesc;
          }

          await db
            .update(productI18n)
            .set(updateData)
            .where(
              and(eq(productI18n.productId, product.productId), eq(productI18n.locale, locale))
            );
          updated++;
        }
      }
    }

    // Processar variações
    for (const variation of affectedVariations) {
      const newName = variation.name.replace(regex, replaceText);
      if (newName !== variation.name) {
        preview.push({
          type: 'variation',
          id: variation.variationId,
          ptName: variation.ptName,
          currentName: variation.name,
          newName,
          descriptionChanged: false,
          shortDescriptionChanged: false,
        });

        if (!dryRun) {
          await db
            .update(productVariationI18n)
            .set({
              name: newName,
              slug: generateSlug(newName),
            })
            .where(
              and(
                eq(productVariationI18n.variationId, variation.variationId),
                eq(productVariationI18n.locale, locale)
              )
            );
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total: preview.length,
      updated: dryRun ? 0 : updated,
      preview,
    });
  } catch (error) {
    console.error('Erro no bulk-replace:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
