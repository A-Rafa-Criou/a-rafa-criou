import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  products,
  files,
  productImages,
  productVariations,
  categories,
  productI18n,
  productVariationI18n,
  productCategories,
} from '@/lib/db/schema';
import {
  productAttributes,
  variationAttributeValues,
  attributes,
  attributeValues,
} from '@/lib/db/schema';
import { eq, desc, or, and, ilike, isNull, inArray } from 'drizzle-orm';
import { translateProduct, translateVariation, generateSlug } from '@/lib/deepl';

// Cache de 5 minutos com stale-while-revalidate
export const revalidate = 300;

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
    // REMOVIDO: Paginação limitada - agora retorna TODOS os produtos
    // para evitar problemas de "não mostra todos"
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Aumentar drasticamente
    const offset = 0; // Sempre começar do início

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

    // Category filter - check both slug and categoryId
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
          conditions.push(eq(products.categoryId, categoryRecord[0].id));
        } else {
          // If no category found by slug, try as categoryId
          conditions.push(eq(products.categoryId, category));
        }
      }
    }

    // Query products with conditions
    let allProducts;

    if (conditions.length > 0) {
      allProducts = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
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
        total: allProducts.length,
      },
    });

    // Cache agressivo com stale-while-revalidate
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

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

    // Generate base slug from name (ou usar o slug enviado se estiver editando)
    const baseSlug =
      validatedData.slug ||
      validatedData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();

    // Ensure unique slug by checking database and incrementing if needed
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (existingProduct.length === 0) {
        break; // Slug is unique
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

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
        console.log(`✅ Produto vinculado a ${validated.categoryIds.length} categoria(s)`);
      }

      // If client provided attributeDefinitions (local-created attributes), create them first and build maps
      const localAttrDefs = validated.attributeDefinitions || [];
      const localAttrIdToReal: Record<string, string> = {};
      const localValIdToReal: Record<string, string> = {};

      if (Array.isArray(localAttrDefs) && localAttrDefs.length > 0) {
        for (const def of localAttrDefs) {
          const attrSlug = def.name.toLowerCase().replace(/\s+/g, '-');

          // Verificar se o atributo já existe
          const existingAttr = await tx
            .select()
            .from(attributes)
            .where(eq(attributes.slug, attrSlug))
            .limit(1);

          let attributeId: string;

          if (existingAttr.length > 0) {
            // Reutilizar atributo existente
            attributeId = existingAttr[0].id;
          } else {
            // Criar novo atributo
            const [createdAttr] = await tx
              .insert(attributes)
              .values({
                name: def.name,
                slug: attrSlug,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            attributeId = createdAttr.id;
          }

          localAttrIdToReal[def.id] = attributeId;

          // Processar valores do atributo
          if (Array.isArray(def.values)) {
            for (const val of def.values) {
              const valSlug = val.value.toLowerCase().replace(/\s+/g, '-');

              // Verificar se o valor já existe para este atributo
              const existingVal = await tx
                .select()
                .from(attributeValues)
                .where(
                  and(
                    eq(attributeValues.attributeId, attributeId),
                    eq(attributeValues.slug, valSlug)
                  )
                )
                .limit(1);

              let valueId: string;

              if (existingVal.length > 0) {
                // Reutilizar valor existente
                valueId = existingVal[0].id;
              } else {
                // Criar novo valor
                const [createdVal] = await tx
                  .insert(attributeValues)
                  .values({
                    attributeId: attributeId,
                    value: val.value,
                    slug: valSlug,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .returning();
                valueId = createdVal.id;
              }

              localValIdToReal[val.id] = valueId;
            }
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

      // Insert variations if provided
      if (validatedData.variations && validatedData.variations.length > 0) {
        for (const variation of validatedData.variations) {
          // Generate slug for variation
          const variationSlug = variation.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();

          const [insertedVariation] = await tx
            .insert(productVariations)
            .values({
              productId: insertedProduct.id,
              name: variation.name,
              slug: variationSlug,
              price: variation.price.toString(),
              isActive: variation.isActive,
            })
            .returning();

          // Insert variation images if provided
          if (variation.images && variation.images.length > 0) {
            const variationImageData = variation.images.map(image => ({
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
            }));

            await tx.insert(productImages).values(variationImageData);
          }

          // Insert variation files if provided
          if (variation.files && variation.files.length > 0) {
            const variationFileData = variation.files.map(file => ({
              variationId: insertedVariation.id,
              name: file.filename,
              originalName: file.originalName,
              mimeType: file.mimeType,
              size: file.fileSize,
              path: file.r2Key, // Use r2Key directly (already includes full path from R2 upload)
              r2Key: file.r2Key,
            }));

            await tx.insert(files).values(variationFileData);
          }

          // Persist variation attribute values mapping if provided
          if (
            variation.attributeValues &&
            Array.isArray(variation.attributeValues) &&
            variation.attributeValues.length > 0
          ) {
            const vamp = variation.attributeValues.map(
              (av: { attributeId: string; valueId: string }) => {
                let attrId = av.attributeId;
                let valId = av.valueId;
                if (attrId && attrId.startsWith('local-') && localAttrIdToReal[attrId])
                  attrId = localAttrIdToReal[attrId];
                if (valId && valId.startsWith('local-') && localValIdToReal[valId])
                  valId = localValIdToReal[valId];
                return {
                  variationId: insertedVariation.id,
                  attributeId: attrId,
                  valueId: valId,
                };
              }
            );
            if (vamp.length > 0) {
              await tx.insert(variationAttributeValues).values(vamp).execute();
            }
          }
        }
      }

      // Insert files if provided (for the main product)
      if (validated.files && validated.files.length > 0) {
        const fileData = validated.files.map(file => ({
          productId: insertedProduct.id,
          name: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.fileSize,
          path: file.r2Key, // Use r2Key directly (already includes full path from R2 upload)
          r2Key: file.r2Key,
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

      // Fetch the complete product with files
      const productFiles = await tx
        .select()
        .from(files)
        .where(eq(files.productId, insertedProduct.id));

      // ✅ AUTO-TRADUÇÃO: Criar registros i18n para PT, EN e ES
      // 1. Inserir PT (fonte)
      await tx
        .insert(productI18n)
        .values({
          productId: insertedProduct.id,
          locale: 'pt',
          name: insertedProduct.name,
          slug: slug, // Usar o slug gerado
          description: insertedProduct.description,
          shortDescription: insertedProduct.shortDescription,
          seoTitle: insertedProduct.seoTitle,
          seoDescription: insertedProduct.seoDescription,
        })
        .onConflictDoNothing();

      // 2. Traduzir e inserir EN/ES em paralelo (apenas se DEEPL_API_KEY estiver configurada)
      if (process.env.DEEPL_API_KEY) {
        try {
          // Traduzir EN e ES em paralelo
          const [enTranslation, esTranslation] = await Promise.all([
            translateProduct(
              {
                name: insertedProduct.name,
                description: insertedProduct.description,
                shortDescription: insertedProduct.shortDescription,
              },
              'EN',
              'PT'
            ),
            translateProduct(
              {
                name: insertedProduct.name,
                description: insertedProduct.description,
                shortDescription: insertedProduct.shortDescription,
              },
              'ES',
              'PT'
            ),
          ]);

          // Inserir EN e ES em batch
          await tx
            .insert(productI18n)
            .values([
              {
                productId: insertedProduct.id,
                locale: 'en',
                name: enTranslation.name,
                slug: generateSlug(enTranslation.name),
                description: enTranslation.description,
                shortDescription: enTranslation.shortDescription,
                seoTitle: enTranslation.name,
                seoDescription: enTranslation.description,
              },
              {
                productId: insertedProduct.id,
                locale: 'es',
                name: esTranslation.name,
                slug: generateSlug(esTranslation.name),
                description: esTranslation.description,
                shortDescription: esTranslation.shortDescription,
                seoTitle: esTranslation.name,
                seoDescription: esTranslation.description,
              },
            ])
            .onConflictDoNothing();

          console.log(`✅ Produto "${insertedProduct.name}" traduzido para EN/ES automaticamente`);
        } catch (error) {
          console.error('⚠️ Erro ao auto-traduzir produto:', error);
          // Não falhar a criação do produto, apenas logar o erro
        }
      }

      // 3. AUTO-TRADUZIR VARIAÇÕES (se houver)
      if (validated.variations && validated.variations.length > 0 && process.env.DEEPL_API_KEY) {
        try {
          // Buscar variações criadas
          const createdVariations = await tx
            .select()
            .from(productVariations)
            .where(eq(productVariations.productId, insertedProduct.id));

          // Traduzir todas as variações em paralelo
          const allTranslations = await Promise.all(
            createdVariations.flatMap(variation => [
              // EN
              translateVariation({ name: variation.name }, 'EN', 'PT').then(enVarTranslation => ({
                variationId: variation.id,
                locale: 'en' as const,
                name: enVarTranslation.name,
                slug: generateSlug(enVarTranslation.name),
              })),
              // ES
              translateVariation({ name: variation.name }, 'ES', 'PT').then(esVarTranslation => ({
                variationId: variation.id,
                locale: 'es' as const,
                name: esVarTranslation.name,
                slug: generateSlug(esVarTranslation.name),
              })),
            ])
          );

          // Inserir PT + traduções em batch
          const allI18nRecords = [
            // PT (sem tradução, usa dados originais)
            ...createdVariations.map(variation => ({
              variationId: variation.id,
              locale: 'pt' as const,
              name: variation.name,
              slug: variation.slug,
            })),
            // EN + ES (já traduzidos)
            ...allTranslations,
          ];

          if (allI18nRecords.length > 0) {
            await tx.insert(productVariationI18n).values(allI18nRecords).onConflictDoNothing();
          }

          console.log(`✅ ${createdVariations.length} variações traduzidas automaticamente`);
        } catch (error) {
          console.error('⚠️ Erro ao auto-traduzir variações:', error);
        }
      }

      const completeProduct = {
        ...insertedProduct,
        files: productFiles,
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
