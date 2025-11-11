import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  products,
  files,
  productImages,
  productVariations,
  categories,
  productCategories,
  productJobs,
} from '@/lib/db/schema';
import {
  productAttributes,
  variationAttributeValues,
  attributes,
  attributeValues,
} from '@/lib/db/schema';
import { eq, desc, or, and, ilike, isNull, inArray, count } from 'drizzle-orm';

// Cache de 10 segundos (ultra rápido)
export const revalidate = 10;
export const dynamic = 'force-dynamic';

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().min(0.01),
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]), // NOVO: array de categorias
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  images: z
    .array(
      z.object({
        cloudinaryId: z.string(), // Cloudinary public_id
        url: z.string(), // Cloudinary secure URL
        width: z.number().optional(),
        height: z.number().optional(),
        format: z.string().optional(),
        size: z.number().optional(),
        alt: z.string().optional(),
        isMain: z.boolean().default(false),
        order: z.number().default(0),
      })
    )
    .optional(),
  variations: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        isActive: z.boolean().default(true),
        images: z
          .array(
            z.object({
              cloudinaryId: z.string(), // Cloudinary public_id
              url: z.string(), // Cloudinary secure URL
              width: z.number().optional(),
              height: z.number().optional(),
              format: z.string().optional(),
              size: z.number().optional(),
              alt: z.string().optional(),
              isMain: z.boolean().default(false),
              order: z.number().default(0),
            })
          )
          .optional(),
        files: z
          .array(
            z.object({
              filename: z.string(),
              originalName: z.string(),
              fileSize: z.number(),
              mimeType: z.string(),
              r2Key: z.string(),
            })
          )
          .optional(),
        attributeValues: z
          .array(
            z.object({
              attributeId: z.string(),
              valueId: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  files: z
    .array(
      z.object({
        filename: z.string(),
        originalName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        r2Key: z.string(),
      })
    )
    .optional(),
});

// Schema for attribute definitions (client-created local attributes)
const attributeDefSchema = z.object({
  id: z.string(), // local id from frontend (ex: local-...)
  name: z.string(),
  values: z.array(z.object({ id: z.string(), value: z.string() })),
});

// Extend createProductSchema with optional attributeDefinitions
const createProductSchemaWithDefs = createProductSchema.extend({
  attributeDefinitions: z.array(attributeDefSchema).optional(),
  attributes: z
    .array(z.object({ attributeId: z.string(), valueIds: z.array(z.string()) }))
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper authentication
    // const session = await auth()
    // if (!session?.user || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const include = searchParams.get('include') || '';
    // Paginação com limite razoável (50 produtos por vez)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    // Case-insensitive search
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.slug, `%${search}%`)
        )
      );
    }

    // Category filter - check both slug and categoryId, including subcategories
    if (category) {
      if (category === 'sem-categoria' || category === 'uncategorized') {
        // Show products without category
        conditions.push(isNull(products.categoryId));
      } else {
        // First, try to find category by slug
        const categoryRecord = await db
          .select()
          .from(categories)
          .where(eq(categories.slug, category))
          .limit(1);

        if (categoryRecord.length > 0) {
          const categoryId = categoryRecord[0].id;

          // Buscar IDs de todas as subcategorias desta categoria
          const subcategories = await db
            .select()
            .from(categories)
            .where(eq(categories.parentId, categoryId));

          const categoryIds = [categoryId, ...subcategories.map(sub => sub.id)];

          // Buscar produtos que tenham QUALQUER uma dessas categorias (pai ou filhas)
          // via tabela product_categories (múltiplas categorias)
          const productsWithCategory = await db
            .select({ productId: productCategories.productId })
            .from(productCategories)
            .where(inArray(productCategories.categoryId, categoryIds));

          const productIdsWithCategory = productsWithCategory.map(pc => pc.productId);

          // Também incluir produtos que tenham a categoria no campo legado categoryId
          if (productIdsWithCategory.length > 0) {
            conditions.push(
              or(
                inArray(products.id, productIdsWithCategory),
                inArray(products.categoryId, categoryIds)
              )
            );
          } else {
            // Se não houver na tabela de junção, buscar pelo campo legado
            conditions.push(inArray(products.categoryId, categoryIds));
          }
        } else {
          // If no category found by slug, try as categoryId
          conditions.push(eq(products.categoryId, category));
        }
      }
    }

    // Query products with conditions
    let allProducts;
    let totalCount = 0;

    if (conditions.length > 0) {
      // Contar total para paginação usando count() do drizzle
      const countQuery = await db
        .select({ count: count() })
        .from(products)
        .where(and(...conditions));

      totalCount = countQuery[0]?.count || 0;

      allProducts = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      // Contar total para paginação usando count() do drizzle
      const countQuery = await db.select({ count: count() }).from(products);

      totalCount = countQuery[0]?.count || 0;

      allProducts = await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);
    }

    // ============================================================================
    // OTIMIZAÇÃO: Buscar TODOS os dados relacionados de UMA VEZ (evita N+1 queries)
    // ============================================================================

    const productIds = allProducts.map(p => p.id);

    // Buscar todos os files de uma vez
    const allProductFiles =
      productIds.length > 0
        ? await db.select().from(files).where(inArray(files.productId, productIds))
        : [];

    // Buscar todas as imagens de produtos de uma vez
    const allProductImages =
      productIds.length > 0
        ? await db.select().from(productImages).where(inArray(productImages.productId, productIds))
        : [];

    // Buscar todas as categorias dos produtos (múltiplas categorias)
    const allProductCategoriesRaw =
      productIds.length > 0
        ? await db
            .select()
            .from(productCategories)
            .where(inArray(productCategories.productId, productIds))
        : [];

    // Buscar informações das categorias
    const categoryIds = Array.from(
      new Set([
        ...(allProducts.map(p => p.categoryId).filter(Boolean) as string[]),
        ...allProductCategoriesRaw.map(pc => pc.categoryId),
      ])
    );

    const allCategories =
      categoryIds.length > 0
        ? await db.select().from(categories).where(inArray(categories.id, categoryIds))
        : [];

    // Criar mapa de categorias para acesso rápido
    const categoriesMap = new Map(allCategories.map(cat => [cat.id, cat]));

    // Buscar todas as variações de uma vez se necessário
    let allVariations: (typeof productVariations.$inferSelect)[] = [];
    let allVariationFiles: (typeof files.$inferSelect)[] = [];
    let allVariationImages: (typeof productImages.$inferSelect)[] = [];

    if (include.includes('variations') && productIds.length > 0) {
      allVariations = await db
        .select()
        .from(productVariations)
        .where(inArray(productVariations.productId, productIds));

      const variationIds = allVariations.map(v => v.id);

      if (include.includes('files') && variationIds.length > 0) {
        allVariationFiles = await db
          .select()
          .from(files)
          .where(inArray(files.variationId, variationIds));

        allVariationImages = await db
          .select()
          .from(productImages)
          .where(inArray(productImages.variationId, variationIds));
      }
    }

    // Montar produtos com detalhes usando os dados em memória
    const productsWithDetails = allProducts.map(product => {
      const productFiles = allProductFiles.filter(f => f.productId === product.id);
      const productImagesList = allProductImages.filter(img => img.productId === product.id);

      // Buscar todas as categorias deste produto
      const productCategoryIds = allProductCategoriesRaw
        .filter(pc => pc.productId === product.id)
        .map(pc => pc.categoryId);

      // Incluir também a categoria legada se existir
      if (product.categoryId && !productCategoryIds.includes(product.categoryId)) {
        productCategoryIds.push(product.categoryId);
      }

      // Montar array de categorias com informações completas
      const productCategories = productCategoryIds
        .map(catId => categoriesMap.get(catId))
        .filter(Boolean)
        .map(cat => ({
          id: cat!.id,
          name: cat!.name,
          slug: cat!.slug,
          parentId: cat!.parentId,
        }));

      let variations: object[] = [];
      if (include.includes('variations')) {
        const productVariationsList = allVariations.filter(v => v.productId === product.id);

        if (include.includes('files')) {
          variations = productVariationsList.map(variation => {
            const variationFiles = allVariationFiles.filter(f => f.variationId === variation.id);
            const variationImages = allVariationImages.filter(
              img => img.variationId === variation.id
            );

            return {
              ...variation,
              files: variationFiles,
              images: variationImages,
            };
          });
        } else {
          variations = productVariationsList;
        }
      }

      return {
        ...product,
        files: productFiles,
        variations,
        images: productImagesList,
        categories: productCategories, // Array de todas as categorias (incluindo subcategorias)
        status: product.isActive ? 'active' : 'draft',
        digitalProduct: true,
        category: 'digital',
        tags: [],
      };
    });

    const response = NextResponse.json({
      products: productsWithDetails,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

    // Cache ultra agressivo - 10s no servidor, 20s no CDN
    response.headers.set('Cache-Control', 's-maxage=10, stale-while-revalidate=20');

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication
    // const session = await auth()
    // if (!session?.user || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json();

    let validatedData;
    try {
      // validate with extended schema to accept attributeDefinitions
      validatedData = createProductSchemaWithDefs.parse(body as unknown);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Dados inválidos',
            details: error.issues,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Erro de validação' }, { status: 400 });
    }

    // Generate slug (timestamp garante unicidade sem query)
    const slug =
      validatedData.slug ||
      `${validatedData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()}-${Date.now().toString(36)}`;

    // Create product - using all schema fields
    const newProduct = {
      name: validatedData.name,
      slug,
      description: validatedData.description || null,
      shortDescription: validatedData.shortDescription || null,
      price: validatedData.price.toString(), // Convert to string for decimal field
      categoryId: validatedData.categoryId || null,
      isActive: validatedData.isActive,
      isFeatured: validatedData.isFeatured,
      seoTitle: validatedData.seoTitle || validatedData.name,
      seoDescription: validatedData.seoDescription || validatedData.description || null,
    };

    // Narrow validated data to the extended schema type
    const validated = validatedData as z.infer<typeof createProductSchemaWithDefs>;

    // Wrap DB operations in a transaction to ensure atomicity
    const result = await db.transaction(async tx => {
      const [insertedProduct] = await tx.insert(products).values(newProduct).returning();

      // Inserir múltiplas categorias na tabela de junção
      if (validated.categoryIds && validated.categoryIds.length > 0) {
        const productCategoriesData = validated.categoryIds.map(categoryId => ({
          productId: insertedProduct.id,
          categoryId,
          isPrimary: categoryId === validated.categoryId, // Marca se é a categoria principal
        }));

        await tx.insert(productCategories).values(productCategoriesData);
      }

      // If client provided attributeDefinitions (local-created attributes), create them first and build maps
      const localAttrDefs = validated.attributeDefinitions || [];
      const localAttrIdToReal: Record<string, string> = {};
      const localValIdToReal: Record<string, string> = {};

      if (Array.isArray(localAttrDefs) && localAttrDefs.length > 0) {
        for (const def of localAttrDefs) {
          const attrSlug = def.name.toLowerCase().replace(/\s+/g, '-');

          // Criar diretamente (onConflictDoUpdate garante idempotência)
          const [createdAttr] = await tx
            .insert(attributes)
            .values({
              name: def.name,
              slug: attrSlug,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: attributes.slug,
              set: { updatedAt: new Date() },
            })
            .returning();

          localAttrIdToReal[def.id] = createdAttr.id;

          // Processar valores do atributo (batch insert)
          if (Array.isArray(def.values) && def.values.length > 0) {
            const valuesToInsert = def.values.map(val => ({
              attributeId: createdAttr.id,
              value: val.value,
              slug: val.value.toLowerCase().replace(/\s+/g, '-'),
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            const insertedVals = await tx
              .insert(attributeValues)
              .values(valuesToInsert)
              .onConflictDoUpdate({
                target: [attributeValues.attributeId, attributeValues.slug],
                set: { updatedAt: new Date() },
              })
              .returning();

            // Mapear IDs locais para IDs reais
            def.values.forEach((val, idx) => {
              localValIdToReal[val.id] = insertedVals[idx].id;
            });
          }
        }
      }

      // Insert product images if provided
      if (validated.images && validated.images.length > 0) {
        const imageData = validated.images.map(image => ({
          productId: insertedProduct.id,
          cloudinaryId: image.cloudinaryId,
          url: image.url,
          width: image.width || null,
          height: image.height || null,
          format: image.format || null,
          size: image.size || null,
          alt: image.alt || validated.name,
          isMain: image.isMain,
          sortOrder: image.order,
        }));

        await tx.insert(productImages).values(imageData);
      }

      // Insert variations if provided (BATCH INSERT - muito mais rápido!)
      if (validatedData.variations && validatedData.variations.length > 0) {
        // 1. Inserir TODAS as variações de uma vez
        const variationsToInsert = validatedData.variations.map(variation => ({
          productId: insertedProduct.id,
          name: variation.name,
          slug: `${variation.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()}-${Date.now().toString(36)}`,
          price: variation.price.toString(),
          isActive: variation.isActive,
        }));

        const insertedVariations = await tx
          .insert(productVariations)
          .values(variationsToInsert)
          .returning();

        // 2. Preparar TODOS os inserts de imagens, files e atributos (batch)
        const allVariationImages: (typeof productImages.$inferInsert)[] = [];
        const allVariationFiles: (typeof files.$inferInsert)[] = [];
        const allVariationAttrs: (typeof variationAttributeValues.$inferInsert)[] = [];

        validatedData.variations.forEach((variation, idx) => {
          const insertedVariation = insertedVariations[idx];

          // Imagens
          if (variation.images && variation.images.length > 0) {
            variation.images.forEach(image => {
              allVariationImages.push({
                variationId: insertedVariation.id,
                cloudinaryId: image.cloudinaryId,
                url: image.url,
                width: image.width || null,
                height: image.height || null,
                format: image.format || null,
                size: image.size || null,
                alt: image.alt || variation.name,
                isMain: image.isMain,
                sortOrder: image.order,
              });
            });
          }

          // Files
          if (variation.files && variation.files.length > 0) {
            variation.files.forEach(file => {
              allVariationFiles.push({
                variationId: insertedVariation.id,
                name: file.filename,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: file.fileSize,
                path: file.r2Key,
              });
            });
          }

          // Atributos
          if (variation.attributeValues && variation.attributeValues.length > 0) {
            variation.attributeValues.forEach((av: { attributeId: string; valueId: string }) => {
              let attrId = av.attributeId;
              let valId = av.valueId;
              if (attrId && attrId.startsWith('local-') && localAttrIdToReal[attrId])
                attrId = localAttrIdToReal[attrId];
              if (valId && valId.startsWith('local-') && localValIdToReal[valId])
                valId = localValIdToReal[valId];

              allVariationAttrs.push({
                variationId: insertedVariation.id,
                attributeId: attrId,
                valueId: valId,
              });
            });
          }
        });

        // 3. Batch inserts (paralelo para máxima velocidade)
        await Promise.all([
          allVariationImages.length > 0
            ? tx.insert(productImages).values(allVariationImages)
            : Promise.resolve(),
          allVariationFiles.length > 0
            ? tx.insert(files).values(allVariationFiles)
            : Promise.resolve(),
          allVariationAttrs.length > 0
            ? tx.insert(variationAttributeValues).values(allVariationAttrs)
            : Promise.resolve(),
        ]);
      }

      // Insert files if provided (for the main product)
      if (validated.files && validated.files.length > 0) {
        const fileData = validated.files.map(file => ({
          productId: insertedProduct.id,
          name: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.fileSize,
          path: file.r2Key,
        }));

        await tx.insert(files).values(fileData);
      }

      // Persist product_attributes if provided
      const attrsPayload = (
        validated as unknown as { attributes?: { attributeId: string; valueIds: string[] }[] }
      ).attributes;
      if (attrsPayload && Array.isArray(attrsPayload)) {
        const toInsert = attrsPayload.map(a => ({
          productId: insertedProduct.id,
          attributeId:
            a.attributeId && a.attributeId.startsWith('local-')
              ? localAttrIdToReal[a.attributeId] || a.attributeId
              : a.attributeId,
        }));
        if (toInsert.length > 0) {
          await tx.insert(productAttributes).values(toInsert).execute();
        }
      }

      // Enfileirar job de tradução (rápido - apenas INSERT)
      await tx.insert(productJobs).values({
        type: 'translate_product',
        payload: JSON.stringify({ productId: insertedProduct.id }),
        status: 'pending',
      });

      // Fetch minimal product data (não buscar files, variações etc - já temos no payload)
      const completeProduct = {
        ...insertedProduct,
        files: [], // Cliente já sabe os files que enviou
        status: insertedProduct.isActive ? 'active' : 'draft',
        digitalProduct: true,
        category: 'digital',
        images: [],
        tags: [],
      };

      return completeProduct;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    // In development it's useful to return a short error message to the client for debugging.
    // Keep the response generic in production.
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal server error', details: errMsg }, { status: 500 });
  }
}
