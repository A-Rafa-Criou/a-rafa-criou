import { NextRequest, NextResponse } from 'next/server';
import { invalidateProductsCache, invalidateProductCache } from '@/lib/cache-invalidation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { products, files, productCategories, productI18n, productJobs } from '@/lib/db/schema';
import { variationAttributeValues } from '@/lib/db/schema';
import { productAttributes } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { productImages, productVariations } from '@/lib/db/schema';
import { deleteFromR2 } from '@/lib/r2-utils';
import { extractPublicId } from '@/lib/cloudinary-utils';
import {
  cleanupProductImages,
  cleanupVariationImages,
  deleteAllProductImages,
} from '@/lib/utils/image-cleanup-cloudinary';

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().optional().nullable(),
  price: z.number().min(0).optional(), // ✅ Permite R$ 0,00 para produtos gratuitos
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional(), // NOVO: array de categorias
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  fileType: z.enum(['pdf', 'png']).optional(), // NOVO: Tipo de arquivo digital
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  // Aceitar campos adicionais que serão processados mas não validados pelo schema básico
  variations: z.any().optional(),
  images: z.any().optional(),
  files: z.any().optional(),
  attributes: z.any().optional(),
  attributeDefinitions: z.any().optional(),
});

// Incoming shapes from client
type IncomingImage = {
  data?: string | null; // Pode ser base64 antigo ou URL do Cloudinary
  cloudinaryId?: string | null; // Cloudinary public_id
  url?: string | null; // Cloudinary URL
  width?: number | null;
  height?: number | null;
  format?: string | null;
  size?: number | null;
  alt?: string | null;
  isMain?: boolean;
  order?: number;
};
type IncomingFile = {
  filename: string;
  originalName?: string | null;
  fileSize?: number;
  mimeType?: string | null;
  r2Key?: string | null;
};
type IncomingVariation = {
  id?: string;
  name?: string;
  slug?: string;
  price?: number | string;
  isActive?: boolean;
  images?: IncomingImage[];
  files?: IncomingFile[];
  attributeValues?: { attributeId: string; valueId: string }[];
};

// Drizzle insert types
type ProductImageInsert = typeof productImages.$inferInsert;
type FileInsert = typeof files.$inferInsert;
type VariationAttributeInsert = typeof variationAttributeValues.$inferInsert;
type ProductVariationInsert = typeof productVariations.$inferInsert;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = (await params) as unknown as { id: string };

    // Get product
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get related files
    const productFiles = await db.select().from(files).where(eq(files.productId, id));

    // Get product_attributes (list of attributes applied to this product)
    const prodAttrs = await db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, id));

    // Get variations first to know their IDs
    const variationsRaw = await db
      .select()
      .from(productVariations)
      .where(eq(productVariations.productId, id))
      .orderBy(productVariations.sortOrder);

    const variationIds = variationsRaw.map(v => v.id);

    // Buscar TODOS os atributos usados nas variações (mesmo que não estejam em product_attributes)
    let allAttributeIds: string[] = [];

    if (variationIds.length > 0) {
      const allVariationAttrs = await db
        .select()
        .from(variationAttributeValues)
        .where(inArray(variationAttributeValues.variationId, variationIds));

      // Pegar IDs únicos de atributos
      allAttributeIds = Array.from(new Set(allVariationAttrs.map(va => va.attributeId)));
    }

    // 🔧 CORREÇÃO: Unir atributos de product_attributes E das variações (usar Set para evitar duplicatas)
    const prodAttrIds = prodAttrs.map(pa => pa.attributeId);
    const attributeIdsToUse = Array.from(new Set([...prodAttrIds, ...allAttributeIds]));

    // Para cada atributo, buscar TODOS os valores usados em TODAS as variações
    const attributesWithValues = await Promise.all(
      attributeIdsToUse.map(async attrId => {
        if (variationIds.length === 0) {
          return {
            attributeId: attrId,
            valueIds: [],
          };
        }

        // Buscar todos os valores deste atributo para as variações deste produto
        const valueRecords = await db
          .select()
          .from(variationAttributeValues)
          .where(
            and(
              eq(variationAttributeValues.attributeId, attrId),
              inArray(variationAttributeValues.variationId, variationIds)
            )
          );

        // Pegar IDs únicos dos valores
        const uniqueValueIds = Array.from(new Set(valueRecords.map(vr => vr.valueId)));

        return {
          attributeId: attrId,
          valueIds: uniqueValueIds,
        };
      })
    );

    // Get product images (product_images table)
    const images = await db.select().from(productImages).where(eq(productImages.productId, id));

    // Get product categories (multiple categories support)
    const productCategoriesRaw = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.productId, id));

    const categoryIds = productCategoriesRaw.map(pc => pc.categoryId);

    // ============================================================================
    // OTIMIZAÇÃO: Buscar TODOS os dados das variações de UMA VEZ (evita N+1)
    // ============================================================================
    // (variationIds já foi declarado acima na linha 98)

    // Buscar todos os files, images e mappings de todas as variações de uma vez
    const allVariationFiles =
      variationIds.length > 0
        ? await db.select().from(files).where(inArray(files.variationId, variationIds))
        : [];

    const allVariationImages =
      variationIds.length > 0
        ? await db
            .select()
            .from(productImages)
            .where(inArray(productImages.variationId, variationIds))
        : [];

    const allVariationMappings =
      variationIds.length > 0
        ? await db
            .select()
            .from(variationAttributeValues)
            .where(inArray(variationAttributeValues.variationId, variationIds))
        : [];

    // Montar variações usando os dados em memória
    const variations = variationsRaw.map(v => {
      const variationFiles = allVariationFiles.filter(f => f.variationId === v.id);
      const variationImages = allVariationImages.filter(img => img.variationId === v.id);
      const mappings = allVariationMappings.filter(m => m.variationId === v.id);

      const attributeValues = mappings.map(m => ({
        attributeId: m.attributeId,
        valueId: m.valueId,
      }));

      return {
        ...v,
        files: variationFiles.map(f => ({
          filename: f.name,
          originalName: f.originalName,
          fileSize: f.size,
          mimeType: f.mimeType,
          r2Key: f.path,
        })),
        images: variationImages.map(img => ({
          id: img.id,
          cloudinaryId: img.cloudinaryId,
          url: img.url,
          width: img.width,
          height: img.height,
          format: img.format,
          size: img.size,
          alt: img.alt,
          isMain: img.isMain,
          order: img.sortOrder,
        })),
        attributeValues,
      };
    });

    const completeProduct = {
      ...product,
      categoryIds, // NOVO: array de IDs de categorias selecionadas
      files: productFiles.map(f => ({
        filename: f.name,
        originalName: f.originalName,
        fileSize: f.size,
        mimeType: f.mimeType,
        r2Key: f.path,
      })),
      images: images.map(img => ({
        id: img.id,
        cloudinaryId: img.cloudinaryId,
        url: img.url,
        width: img.width,
        height: img.height,
        format: img.format,
        size: img.size,
        alt: img.alt,
        isMain: img.isMain,
        order: img.sortOrder,
      })),
      variations,
      // Retornar atributos com os valores reais buscados do banco
      attributes: attributesWithValues,
    };

    return NextResponse.json(completeProduct);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('📝 [UPDATE PRODUCT] Recebido:', {
      id,
      name: body.name,
      categoryIds: body.categoryIds,
      variations: body.variations?.length,
    });

    const validatedData = updateProductSchema.parse(body);

    console.log('✅ [UPDATE PRODUCT] Validado:', {
      name: validatedData.name,
      slug: validatedData.slug,
      categoryId: validatedData.categoryId,
    });

    // Check if product exists
    const [existingProduct] = await db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product
    const updateData: Partial<typeof products.$inferInsert> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.slug !== undefined) updateData.slug = validatedData.slug;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.shortDescription !== undefined)
      updateData.shortDescription = validatedData.shortDescription;
    // Removed: price is now in variations only
    if (validatedData.categoryId !== undefined) updateData.categoryId = validatedData.categoryId;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.isFeatured !== undefined) updateData.isFeatured = validatedData.isFeatured;
    if (validatedData.fileType !== undefined) updateData.fileType = validatedData.fileType;
    if (validatedData.seoTitle !== undefined) updateData.seoTitle = validatedData.seoTitle;
    if (validatedData.seoDescription !== undefined)
      updateData.seoDescription = validatedData.seoDescription;

    updateData.updatedAt = new Date();

    console.log('🔄 [UPDATE PRODUCT] Atualizando com:', updateData);

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    console.log('✅ [UPDATE PRODUCT] Produto atualizado:', {
      id: updatedProduct.id,
      name: updatedProduct.name,
    });

    // Atualizar múltiplas categorias se fornecidas
    if (body.categoryIds && Array.isArray(body.categoryIds)) {
      // Deletar associações antigas
      await db.delete(productCategories).where(eq(productCategories.productId, id)).execute();

      // Inserir novas associações
      if (body.categoryIds.length > 0) {
        const productCategoriesData = body.categoryIds.map((categoryId: string) => ({
          productId: id,
          categoryId,
          isPrimary: categoryId === validatedData.categoryId, // Marca a categoria principal
        }));

        await db.insert(productCategories).values(productCategoriesData);
        console.log(`✅ Produto atualizado com ${body.categoryIds.length} categoria(s)`);
      }
    }

    // If variations were provided in the body, sync/create/update variations, files, images and attribute values
    if (body.variations && Array.isArray(body.variations)) {
      for (const [idx, variation] of (body.variations as IncomingVariation[]).entries()) {
        if (variation.id) {
          // existing variation: update its fields
          await db
            .update(productVariations)
            .set({
              name: variation.name,
              slug: variation.slug || variation.name?.toLowerCase().replace(/\s+/g, '-'),
              price: String(variation.price),
              isActive: variation.isActive ?? true,
              sortOrder: idx,
              updatedAt: new Date(),
            })
            .where(eq(productVariations.id, variation.id))
            .execute();

          // replace variation images if provided
          if (variation.images && Array.isArray(variation.images)) {
            // ✅ Recuperar cloudinaryId a partir da URL quando estiver faltando
            const normalizedImages = variation.images.map((img: IncomingImage) => {
              if (!img.cloudinaryId && img.url && img.url.includes('cloudinary.com')) {
                const recovered = extractPublicId(img.url);
                if (recovered) {
                  return { ...img, cloudinaryId: recovered };
                }
              }
              return img;
            });

            // Contar imagens válidas que seriam re-inseridas
            const validIncomingImages = normalizedImages.filter(
              (img: IncomingImage) => img.cloudinaryId && img.url
            );

            // ⚠️ SEGURANÇA: Buscar imagens atuais da variação no banco ANTES de deletar
            const existingVariationImages = await db
              .select()
              .from(productImages)
              .where(eq(productImages.variationId, variation.id));

            // ⚠️ SEGURANÇA: Se incoming válido é 0 mas a variação tem imagens no banco,
            // NÃO deletar — provavelmente houve perda de dados no round-trip do frontend
            if (validIncomingImages.length === 0 && existingVariationImages.length > 0) {
              console.warn(
                `⚠️ [UPDATE PRODUCT] Variação ${variation.id} (${variation.name}): ` +
                  `${existingVariationImages.length} imagens no banco mas 0 válidas no payload. ` +
                  `Preservando imagens existentes para evitar perda de dados.`
              );
            } else {
              // Limpar imagens antigas do Cloudinary antes de deletar do banco
              const newVariationCloudinaryIds = normalizedImages
                .filter((img: IncomingImage) => img.cloudinaryId)
                .map((img: IncomingImage) => img.cloudinaryId!);
              await cleanupVariationImages(variation.id, newVariationCloudinaryIds);

              await db
                .delete(productImages)
                .where(eq(productImages.variationId, variation.id))
                .execute();

              const imgsRaw: Array<ProductImageInsert | null> = normalizedImages.map(
                (img: IncomingImage) => {
                  // Apenas salvar se tiver cloudinaryId e url (ignora base64 antigo)
                  if (img.cloudinaryId && img.url) {
                    return {
                      variationId: variation.id!,
                      cloudinaryId: img.cloudinaryId,
                      url: img.url, // ✅ Manter URL original sem conversão
                      width: img.width || null,
                      height: img.height || null,
                      format: img.format || null,
                      size: img.size || null,
                      alt: img.alt ?? null,
                      sortOrder: img.order ?? 0,
                      isMain: img.isMain ?? false,
                      createdAt: new Date(),
                    };
                  }
                  // Ignorar base64 ou dados inválidos
                  return null;
                }
              );
              const imgs = imgsRaw.filter((i): i is ProductImageInsert => i !== null);
              if (imgs.length > 0) await db.insert(productImages).values(imgs).execute();
            }
          }

          // replace variation files if provided
          if (variation.files && Array.isArray(variation.files)) {
            await db.delete(files).where(eq(files.variationId, variation.id)).execute();
            const flsRaw: Array<FileInsert | null> = (variation.files || []).map(
              (f: IncomingFile) => {
                const path = f.r2Key ?? '';
                if (!path) return null;
                return {
                  variationId: variation.id!,
                  name: f.filename,
                  originalName: f.originalName ?? '',
                  mimeType: f.mimeType ?? '',
                  size: f.fileSize ?? 0,
                  path,
                  createdAt: new Date(),
                };
              }
            );
            const fls = flsRaw.filter((i): i is FileInsert => i !== null);
            if (fls.length > 0) await db.insert(files).values(fls).execute();
          }

          // sync attribute mappings
          await db
            .delete(variationAttributeValues)
            .where(eq(variationAttributeValues.variationId, variation.id))
            .execute();
          if (
            variation.attributeValues &&
            Array.isArray(variation.attributeValues) &&
            variation.attributeValues.length > 0
          ) {
            const vamp: VariationAttributeInsert[] = variation.attributeValues.map(
              (av: { attributeId: string; valueId: string }) =>
                ({
                  variationId: variation.id!,
                  attributeId: av.attributeId,
                  valueId: av.valueId,
                }) as VariationAttributeInsert
            );
            if (vamp.length > 0) await db.insert(variationAttributeValues).values(vamp).execute();
          }
        } else {
          // new variation: insert
          const newVarInsert: ProductVariationInsert = {
            productId: id,
            name: variation.name ?? '',
            slug: (variation.name || '').toLowerCase().replace(/\s+/g, '-'),
            price: String(variation.price || 0),
            isActive: variation.isActive ?? true,
            sortOrder: idx,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as ProductVariationInsert;
          const [newVar] = await db.insert(productVariations).values(newVarInsert).returning();
          if (variation.images && Array.isArray(variation.images)) {
            const imgsRawNew: Array<ProductImageInsert | null> = (variation.images || []).map(
              (img: IncomingImage) => {
                // ✅ Recuperar cloudinaryId a partir da URL se estiver faltando
                let effectiveCloudinaryId = img.cloudinaryId;
                if (!effectiveCloudinaryId && img.url && img.url.includes('cloudinary.com')) {
                  effectiveCloudinaryId = extractPublicId(img.url);
                }
                // Apenas salvar se tiver cloudinaryId e url (ignora base64 antigo)
                if (effectiveCloudinaryId && img.url) {
                  return {
                    variationId: newVar.id!,
                    cloudinaryId: effectiveCloudinaryId,
                    url: img.url, // ✅ Manter URL original
                    width: img.width || null,
                    height: img.height || null,
                    format: img.format || null,
                    size: img.size || null,
                    alt: img.alt ?? null,
                    sortOrder: img.order ?? 0,
                    isMain: img.isMain ?? false,
                    createdAt: new Date(),
                  };
                }
                // Ignorar base64 ou dados inválidos
                return null;
              }
            );
            const imgsNew = imgsRawNew.filter((i): i is ProductImageInsert => i !== null);
            if (imgsNew.length > 0) await db.insert(productImages).values(imgsNew).execute();
          }
          if (variation.files && Array.isArray(variation.files)) {
            const flsRawNew: Array<FileInsert | null> = (variation.files || []).map(
              (f: IncomingFile) => {
                const path = f.r2Key ?? '';
                if (!path) return null;
                return {
                  variationId: newVar.id!,
                  name: f.filename,
                  originalName: f.originalName ?? '',
                  mimeType: f.mimeType ?? '',
                  size: f.fileSize ?? 0,
                  path,
                  createdAt: new Date(),
                };
              }
            );
            const flsNew = flsRawNew.filter((i): i is FileInsert => i !== null);
            if (flsNew.length > 0) await db.insert(files).values(flsNew).execute();
          }
          if (
            variation.attributeValues &&
            Array.isArray(variation.attributeValues) &&
            variation.attributeValues.length > 0
          ) {
            const vampNew: VariationAttributeInsert[] = variation.attributeValues.map(
              (av: { attributeId: string; valueId: string }) =>
                ({
                  variationId: newVar.id!,
                  attributeId: av.attributeId,
                  valueId: av.valueId,
                }) as VariationAttributeInsert
            );
            if (vampNew.length > 0)
              await db.insert(variationAttributeValues).values(vampNew).execute();
          }
        }
      }
    }
    // Sync product images if provided
    if (body.images && Array.isArray(body.images)) {
      // ✅ Recuperar cloudinaryId a partir da URL quando estiver faltando
      const normalizedProductImages = body.images.map((img: IncomingImage) => {
        if (!img.cloudinaryId && img.url && img.url.includes('cloudinary.com')) {
          const recovered = extractPublicId(img.url);
          if (recovered) {
            return { ...img, cloudinaryId: recovered };
          }
        }
        // Também tentar recuperar do campo "data" (usado pelo EditVariationDialog como fallback)
        if (
          !img.cloudinaryId &&
          img.data &&
          typeof img.data === 'string' &&
          img.data.includes('cloudinary.com')
        ) {
          const recovered = extractPublicId(img.data);
          if (recovered) {
            return { ...img, cloudinaryId: recovered, url: img.url || img.data };
          }
        }
        return img;
      });

      // Limpar imagens antigas do Cloudinary antes de deletar do banco
      const newCloudinaryIds = normalizedProductImages
        .filter((img: IncomingImage) => img.cloudinaryId)
        .map((img: IncomingImage) => img.cloudinaryId!);
      await cleanupProductImages(id, newCloudinaryIds);

      await db.delete(productImages).where(eq(productImages.productId, id)).execute();

      const imgsRaw2: Array<ProductImageInsert | null> = normalizedProductImages.map(
        (img: IncomingImage) => {
          // Priorizar dados do Cloudinary
          if (img.cloudinaryId && (img.url || img.data)) {
            return {
              productId: id,
              cloudinaryId: img.cloudinaryId,
              url: img.url || img.data || '', // ✅ Manter URL original, usar data como fallback
              width: img.width || null,
              height: img.height || null,
              format: img.format || null,
              size: img.size || null,
              alt: img.alt ?? null,
              sortOrder: img.order ?? 0,
              isMain: img.isMain ?? false,
              createdAt: new Date(),
            };
          }
          // Fallback: se tiver URL do Cloudinary no campo data, tentar extrair
          const data = img.data ?? '';
          if (!data) return null;
          if (data.startsWith('http') && data.includes('cloudinary.com')) {
            const recoveredId = extractPublicId(data);
            if (recoveredId) {
              return {
                productId: id,
                cloudinaryId: recoveredId,
                url: data,
                width: img.width || null,
                height: img.height || null,
                format: img.format || null,
                size: img.size || null,
                alt: img.alt ?? null,
                sortOrder: img.order ?? 0,
                isMain: img.isMain ?? false,
                createdAt: new Date(),
              };
            }
          }
          return null; // Ignorar base64 antigo ou dados inválidos
        }
      );
      const imgs2 = imgsRaw2.filter((i): i is ProductImageInsert => i !== null);
      if (imgs2.length > 0) await db.insert(productImages).values(imgs2).execute();
    }

    // Get updated product with files/images/variations
    const productFiles = await db.select().from(files).where(eq(files.productId, id));
    const images = await db.select().from(productImages).where(eq(productImages.productId, id));
    const variationsRaw2 = await db
      .select()
      .from(productVariations)
      .where(eq(productVariations.productId, id));
    const variations2 = await Promise.all(
      variationsRaw2.map(async v => {
        const variationFiles = await db.select().from(files).where(eq(files.variationId, v.id));
        const variationImages = await db
          .select()
          .from(productImages)
          .where(eq(productImages.variationId, v.id));
        const mappings = await db
          .select()
          .from(variationAttributeValues)
          .where(eq(variationAttributeValues.variationId, v.id));
        const attributeValues = mappings.map(m => ({
          attributeId: m.attributeId,
          valueId: m.valueId,
        }));
        return {
          ...v,
          files: variationFiles.map(f => ({
            filename: f.name,
            originalName: f.originalName,
            fileSize: f.size,
            mimeType: f.mimeType,
            r2Key: f.path,
          })),
          images: variationImages.map(img => ({
            id: img.id,
            cloudinaryId: img.cloudinaryId,
            url: img.url,
            width: img.width,
            height: img.height,
            format: img.format,
            size: img.size,
            alt: img.alt,
            isMain: img.isMain,
            order: img.sortOrder,
          })),
          attributeValues,
        };
      })
    );

    const prodAttrs2 = await db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, id));

    const completeProduct = {
      ...updatedProduct,
      files: productFiles.map(f => ({
        filename: f.name,
        originalName: f.originalName,
        fileSize: f.size,
        mimeType: f.mimeType,
        r2Key: f.path,
      })),
      images: images.map(img => ({
        id: img.id,
        cloudinaryId: img.cloudinaryId,
        url: img.url,
        width: img.width,
        height: img.height,
        format: img.format,
        size: img.size,
        alt: img.alt,
        isMain: img.isMain,
        order: img.sortOrder,
      })),
      variations: variations2,
      attributes: prodAttrs2.map(pa => ({ attributeId: pa.attributeId, valueIds: [] })),
    };

    // � Invalidar cache para mudanças aparecerem imediatamente
    await invalidateProductCache(id, updatedProduct.slug);

    return NextResponse.json(completeProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    console.log(`🔍 DELETE request para produto ${id}`);
    console.log(`   permanent: ${permanent}`);

    // Check if product exists
    const [existingProduct] = await db.select().from(products).where(eq(products.id, id)).limit(1);

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log(`   Produto encontrado: ${existingProduct.name}`);
    console.log(`   isActive: ${existingProduct.isActive}`);

    // 🔥 EXCLUSÃO PERMANENTE: Se produto já está inativo E permanent=true
    if (permanent && !existingProduct.isActive) {
      console.log(`🔴 EXCLUSÃO PERMANENTE iniciada para produto ${id}`);

      // 1. Deletar registros relacionados (cascade manual)
      // 1.1. Product I18n
      await db.delete(productI18n).where(eq(productI18n.productId, id));

      // 1.2. Product Categories
      await db.delete(productCategories).where(eq(productCategories.productId, id));

      // 1.3. Product Attributes
      await db.delete(productAttributes).where(eq(productAttributes.productId, id));

      // 1.4. Product Images
      await db.delete(productImages).where(eq(productImages.productId, id));

      // 1.5. Buscar variações e deletar seus relacionamentos
      const variations = await db
        .select()
        .from(productVariations)
        .where(eq(productVariations.productId, id));

      for (const variation of variations) {
        await db
          .delete(variationAttributeValues)
          .where(eq(variationAttributeValues.variationId, variation.id));
        await db.delete(productImages).where(eq(productImages.variationId, variation.id));
        await db.delete(files).where(eq(files.variationId, variation.id));
      }

      // 1.6. Deletar variações
      await db.delete(productVariations).where(eq(productVariations.productId, id));

      // 1.7. Deletar arquivos do produto
      await db.delete(files).where(eq(files.productId, id));

      // 1.8. Deletar jobs pendentes (buscar por payload que contém productId)
      // Como productJobs.payload é JSON string, não podemos fazer WHERE direto
      // Vamos buscar todos e filtrar (ou deixar os jobs orphan, não é crítico)
      const allJobs = await db.select().from(productJobs);
      const jobsToDelete = allJobs
        .filter(job => {
          try {
            const payload = JSON.parse(job.payload);
            return payload.productId === id;
          } catch {
            return false;
          }
        })
        .map(job => job.id);

      if (jobsToDelete.length > 0) {
        await db.delete(productJobs).where(inArray(productJobs.id, jobsToDelete));
      }

      // 2. Deletar produto do banco
      await db.delete(products).where(eq(products.id, id));

      console.log(`✅ Produto ${id} EXCLUÍDO PERMANENTEMENTE do banco de dados`);

      // 🔥 Invalidar cache
      await invalidateProductsCache();

      return NextResponse.json({
        message: 'Produto excluído permanentemente',
        permanentlyDeleted: true,
      });
    }

    // 🔄 SOFT DELETE: Desativar produto (primeira vez)
    // ⚠️ IMPORTANTE: ARQUIVOS NÃO SÃO DELETADOS DO R2 E CLOUDINARY
    // Motivo: Produto pode ser reativado, e re-upload causaria problemas
    if (existingProduct.isActive) {
      console.log(`🟡 SOFT DELETE: Produto está ativo, desativando...`);

      // 1. Buscar todos os arquivos do produto (apenas para contagem)
      const productFiles = await db.select().from(files).where(eq(files.productId, id));

      // 2. Buscar todas as variações do produto
      const variations = await db
        .select()
        .from(productVariations)
        .where(eq(productVariations.productId, id));

      // 3. Buscar todos os arquivos das variações (apenas para contagem)
      const variationFiles: typeof productFiles = [];
      for (const variation of variations) {
        const vFiles = await db.select().from(files).where(eq(files.variationId, variation.id));
        variationFiles.push(...vFiles);
      }

      const allFiles = [...productFiles, ...variationFiles];
      console.log(`📦 Produto tem ${allFiles.length} arquivos que serão PRESERVADOS no R2`);

      // ❌ DELETAR ARQUIVOS DO R2 - DESABILITADO
      // Motivo: Manter arquivos para possível reativação
      // const r2DeletionPromises = allFiles
      //   .filter(file => file.path)
      //   .map(async file => {
      //     try {
      //       await deleteFromR2(file.path);
      //     } catch (error) {
      //       console.warn(`⚠️ Falha ao deletar arquivo ${file.path}:`, error);
      //     }
      //   });
      // await Promise.all(r2DeletionPromises);

      // ❌ DELETAR ZIPs TEMPORÁRIOS - DESABILITADO
      // Motivo: Manter arquivos para possível reativação
      // try {
      //   const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
      //   const { r2, R2_BUCKET } = await import('@/lib/r2');
      //   const listCommand = new ListObjectsV2Command({
      //     Bucket: R2_BUCKET,
      //     Prefix: 'zips/',
      //   });
      //   const listResult = await r2.send(listCommand);
      //   if (listResult.Contents && listResult.Contents.length > 0) {
      //     const objectsToDelete = listResult.Contents.map((obj: { Key?: string }) => ({
      //       Key: obj.Key!,
      //     }));
      //     const deleteCommand = new DeleteObjectsCommand({
      //       Bucket: R2_BUCKET,
      //       Delete: { Objects: objectsToDelete },
      //     });
      //     await r2.send(deleteCommand);
      //     console.log(`✅ Deletados ${objectsToDelete.length} ZIPs temporários`);
      //   }
      // } catch (error) {
      //   console.warn('⚠️ Falha ao deletar ZIPs temporários:', error);
      // }

      // ❌ DELETAR IMAGENS DO CLOUDINARY - DESABILITADO
      // Motivo: Manter imagens para possível reativação
      // await deleteAllProductImages(id);

      // Desativar produto (soft delete)
      await db
        .update(products)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id));

      console.log(`✅ Produto ${id} desativado (soft delete) - ARQUIVOS PRESERVADOS`);

      // 🔥 Invalidar cache após desativação
      await invalidateProductCache(id, existingProduct.slug);

      return NextResponse.json({
        message: 'Produto desativado com sucesso. Arquivos preservados no R2 e Cloudinary.',
        preservedFiles: allFiles.length,
        details: {
          productFiles: productFiles.length,
          variationFiles: variationFiles.length,
          variations: variations.length,
          note: 'Arquivos NÃO foram deletados do R2 e Cloudinary para permitir reativação',
        },
      });
    }

    // Produto já está inativo mas não foi solicitada exclusão permanente
    console.log(`⚠️ Produto já inativo mas permanent=false. Retornando mensagem.`);
    return NextResponse.json({
      message: 'Produto já está inativo. Use ?permanent=true para excluir permanentemente.',
      isActive: false,
    });
  } catch (error) {
    console.error('❌ ERRO ao deletar produto:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      {
        error: 'Erro ao excluir produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/products/[id]
 * Reativar produto desativado (soft delete reverso)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    // Verificar se o produto existe
    const existingProducts = await db.select().from(products).where(eq(products.id, id)).limit(1);

    if (existingProducts.length === 0) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const product = existingProducts[0];

    // Se já está ativo, não fazer nada
    if (product.isActive) {
      return NextResponse.json({
        message: 'Produto já está ativo',
        product,
      });
    }

    // Reativar produto
    await db
      .update(products)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    console.log(`✅ Produto ${id} reativado com sucesso`);

    // 🔥 Invalidar cache para produto reativado aparecer imediatamente
    await invalidateProductCache(id, product.slug);

    return NextResponse.json({
      message: 'Produto reativado com sucesso',
      productId: id,
    });
  } catch (error) {
    console.error('❌ ERRO ao reativar produto:', error);
    return NextResponse.json(
      {
        error: 'Erro ao reativar produto',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
