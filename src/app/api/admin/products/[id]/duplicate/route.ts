import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  products,
  files,
  productCategories,
  productI18n,
  productImages,
  productVariations,
  productAttributes,
  variationAttributeValues,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateProductsCache } from '@/lib/cache-invalidation';

/**
 * POST /api/admin/products/[id]/duplicate
 * Duplica um produto existente com todos os seus dados relacionados
 * Permite editar campos específicos através do body
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: originalProductId } = (await params) as unknown as { id: string };
    const body = await request.json();

    // Buscar produto original
    const [originalProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, originalProductId))
      .limit(1);

    if (!originalProduct) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Buscar dados relacionados
    const [
      originalImages,
      originalFiles,
      originalCategories,
      originalI18n,
      originalVariations,
      originalAttributes,
    ] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, originalProductId)),
      db.select().from(files).where(eq(files.productId, originalProductId)),
      db.select().from(productCategories).where(eq(productCategories.productId, originalProductId)),
      db.select().from(productI18n).where(eq(productI18n.productId, originalProductId)),
      db.select().from(productVariations).where(eq(productVariations.productId, originalProductId)),
      db.select().from(productAttributes).where(eq(productAttributes.productId, originalProductId)),
    ]);

    // Criar slug único se não fornecido
    let newSlug = body.slug || `${originalProduct.slug}-copia`;

    // Verificar se slug já existe e adicionar número se necessário
    let slugExists = true;
    let slugAttempt = 1;
    while (slugExists) {
      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.slug, newSlug))
        .limit(1);

      if (!existing) {
        slugExists = false;
      } else {
        newSlug = `${originalProduct.slug}-copia-${slugAttempt}`;
        slugAttempt++;
      }
    }

    // Criar novo produto com campos editáveis do body
    const [newProduct] = await db
      .insert(products)
      .values({
        name: body.name || `${originalProduct.name} (Cópia)`,
        slug: newSlug,
        description:
          body.description !== undefined ? body.description : originalProduct.description,
        shortDescription:
          body.shortDescription !== undefined
            ? body.shortDescription
            : originalProduct.shortDescription,
        categoryId: body.categoryId !== undefined ? body.categoryId : originalProduct.categoryId,
        isActive: body.isActive !== undefined ? body.isActive : false, // Por padrão inativo
        isFeatured: body.isFeatured !== undefined ? body.isFeatured : false, // Por padrão não destacado
        fileType: body.fileType || originalProduct.fileType,
        seoTitle: body.seoTitle !== undefined ? body.seoTitle : originalProduct.seoTitle,
        seoDescription:
          body.seoDescription !== undefined ? body.seoDescription : originalProduct.seoDescription,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Duplicar imagens (referenciando as mesmas imagens do Cloudinary)
    if (originalImages.length > 0) {
      await db.insert(productImages).values(
        originalImages.map(img => ({
          productId: newProduct.id,
          variationId: null, // Imagens do produto base
          cloudinaryId: img.cloudinaryId,
          url: img.url,
          width: img.width,
          height: img.height,
          format: img.format,
          size: img.size,
          alt: img.alt,
          isMain: img.isMain,
          sortOrder: img.sortOrder,
          createdAt: new Date(),
        }))
      );
    }

    // Duplicar arquivos (referenciando os mesmos arquivos no R2)
    if (originalFiles.length > 0) {
      await db.insert(files).values(
        originalFiles.map(file => ({
          productId: newProduct.id,
          variationId: null, // Arquivos do produto base
          name: file.name,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          path: file.path, // Mesmo path do R2
          hash: file.hash,
          createdAt: new Date(),
        }))
      );
    }

    // Duplicar categorias
    if (originalCategories.length > 0) {
      await db.insert(productCategories).values(
        originalCategories.map(cat => ({
          productId: newProduct.id,
          categoryId: cat.categoryId,
        }))
      );
    }

    // Duplicar traduções (i18n)
    if (originalI18n.length > 0) {
      await db.insert(productI18n).values(
        originalI18n.map(i18n => ({
          productId: newProduct.id,
          locale: i18n.locale,
          name: i18n.name,
          slug: `${i18n.slug}-copia`,
          description: i18n.description,
          shortDescription: i18n.shortDescription,
          seoTitle: i18n.seoTitle,
          seoDescription: i18n.seoDescription,
        }))
      );
    }

    // Duplicar atributos do produto (sem valueIds)
    if (originalAttributes.length > 0) {
      await db.insert(productAttributes).values(
        originalAttributes.map(attr => ({
          productId: newProduct.id,
          attributeId: attr.attributeId,
        }))
      );
    }

    // Duplicar variações
    if (originalVariations.length > 0) {
      const variationIdMap = new Map<string, string>(); // old ID -> new ID

      for (const originalVariation of originalVariations) {
        // Criar nova variação
        const [newVariation] = await db
          .insert(productVariations)
          .values({
            productId: newProduct.id,
            name: originalVariation.name,
            slug: `${originalVariation.slug}-copia-${Date.now()}`,
            price: originalVariation.price,
            isActive: originalVariation.isActive,
            sortOrder: originalVariation.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        variationIdMap.set(originalVariation.id, newVariation.id);

        // Duplicar imagens da variação
        const variationImages = await db
          .select()
          .from(productImages)
          .where(eq(productImages.variationId, originalVariation.id));

        if (variationImages.length > 0) {
          await db.insert(productImages).values(
            variationImages.map(img => ({
              productId: newProduct.id,
              variationId: newVariation.id,
              cloudinaryId: img.cloudinaryId,
              url: img.url,
              width: img.width,
              height: img.height,
              format: img.format,
              size: img.size,
              alt: img.alt,
              isMain: img.isMain,
              sortOrder: img.sortOrder,
              createdAt: new Date(),
            }))
          );
        }

        // Duplicar arquivos da variação
        const variationFiles = await db
          .select()
          .from(files)
          .where(eq(files.variationId, originalVariation.id));

        if (variationFiles.length > 0) {
          await db.insert(files).values(
            variationFiles.map(file => ({
              productId: newProduct.id,
              variationId: newVariation.id,
              name: file.name,
              originalName: file.originalName,
              size: file.size,
              mimeType: file.mimeType,
              path: file.path,
              hash: file.hash,
              createdAt: new Date(),
            }))
          );
        }

        // Duplicar valores de atributos da variação
        const variationAttrValues = await db
          .select()
          .from(variationAttributeValues)
          .where(eq(variationAttributeValues.variationId, originalVariation.id));

        if (variationAttrValues.length > 0) {
          await db.insert(variationAttributeValues).values(
            variationAttrValues.map(attrVal => ({
              variationId: newVariation.id,
              attributeId: attrVal.attributeId,
              valueId: attrVal.valueId,
            }))
          );
        }
      }
    }

    // Invalidar cache
    await invalidateProductsCache();

    return NextResponse.json({
      success: true,
      product: {
        id: newProduct.id,
        name: newProduct.name,
        slug: newProduct.slug,
      },
      message: 'Produto duplicado com sucesso',
    });
  } catch (error) {
    console.error('❌ Erro ao duplicar produto:', error);
    return NextResponse.json({ error: 'Erro ao duplicar produto' }, { status: 500 });
  }
}
