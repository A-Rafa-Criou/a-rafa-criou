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
  productI18n,
  productDisplayOrder,
} from '@/lib/db/schema';
import {
  productAttributes,
  variationAttributeValues,
  attributes,
  attributeValues,
} from '@/lib/db/schema';
import {
  eq,
  desc,
  or,
  and,
  ilike,
  isNull,
  inArray,
  count,
  getTableColumns,
  sql,
} from 'drizzle-orm';
import { generateSlug } from '@/lib/deepl';
import { invalidateProductsCache } from '@/lib/cache-invalidation';

// 🔥 CACHE ON-DEMAND: Cache longo, só revalida quando modificar produtos
export const revalidate = 86400; // 24 horas (invalidação sob demanda)
export const dynamic = 'force-dynamic'; // Dinâmico para dados frescos

const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  slug: z.string().min(1).max(255).optional(), // Slug opcional, será gerado se não fornecido
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().min(0), // ✅ Permite R$ 0,00 para produtos gratuitos
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]), // NOVO: array de categorias
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  fileType: z.enum(['pdf', 'png']).default('pdf'), // NOVO: Tipo de arquivo digital
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
        price: z.number().min(0), // ✅ Permite R$ 0,00 para variações gratuitas
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
              r2Key: z.string().optional(), // Opcional: pode não ter arquivo ainda
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
        r2Key: z.string().optional(), // Opcional: pode não ter arquivo ainda
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

// 🌍 Schema para traduções pré-calculadas do frontend
const translationSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
});

// Extend createProductSchema with optional attributeDefinitions
const createProductSchemaWithDefs = createProductSchema.extend({
  attributeDefinitions: z.array(attributeDefSchema).optional(),
  attributes: z
    .array(z.object({ attributeId: z.string(), valueIds: z.array(z.string()) }))
    .optional(),
  // 🌍 Traduções opcionais (já calculadas no frontend)
  translations: z
    .object({
      en: translationSchema.optional(),
      es: translationSchema.optional(),
    })
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

    // Case-insensitive search - busca apenas por nome e descrição (mais preciso para o usuário)
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm) {
        conditions.push(
          or(
            ilike(products.name, `%${searchTerm}%`),
            ilike(products.description, `%${searchTerm}%`)
          )
        );
      }
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
          // 🔥 CORREÇÃO: Pegar TODOS os produtos, independente da posição da categoria
          const productsWithCategory = await db
            .select({ productId: productCategories.productId })
            .from(productCategories)
            .where(inArray(productCategories.categoryId, categoryIds));

          const productIdsWithCategory = productsWithCategory.map(pc => pc.productId);

          // Também incluir produtos que tenham a categoria no campo legado categoryId
          if (productIdsWithCategory.length > 0) {
            // Produtos com a categoria na tabela junction OU no campo legado
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
          // If no category found by slug, try as categoryId directly
          // Buscar tanto na tabela junction quanto no campo legado
          const productsWithCategoryById = await db
            .select({ productId: productCategories.productId })
            .from(productCategories)
            .where(eq(productCategories.categoryId, category));

          const productIdsById = productsWithCategoryById.map(pc => pc.productId);

          if (productIdsById.length > 0) {
            conditions.push(
              or(inArray(products.id, productIdsById), eq(products.categoryId, category))
            );
          } else {
            conditions.push(eq(products.categoryId, category));
          }
        }
      }
    }

    // Query products with conditions
    type ProductWithOrder = typeof products.$inferSelect & { displayOrder: number | null };
    let allProducts: ProductWithOrder[];
    let totalCount = 0;

    if (conditions.length > 0) {
      // Contar total para paginação usando count() do drizzle
      const countQuery = await db
        .select({ count: count() })
        .from(products)
        .where(and(...conditions));

      totalCount = countQuery[0]?.count || 0;

      // LEFT JOIN com product_display_order para incluir ordem personalizada
      // Usar COALESCE para priorizar produtos com ordem customizada
      const productsWithOrder = await db
        .select({
          ...getTableColumns(products),
          displayOrder: productDisplayOrder.displayOrder,
        })
        .from(products)
        .leftJoin(productDisplayOrder, eq(products.id, productDisplayOrder.productId))
        .where(and(...conditions))
        .orderBy(t => [
          // Produtos COM ordem customizada aparecem PRIMEIRO (ordem crescente 1,2,3...)
          // NULLS LAST garante que produtos sem ordem vão pro final
          sql`${t.displayOrder} ASC NULLS LAST`,
          // Produtos sem ordem customizada (NULL) ordenam por createdAt DESC
          desc(products.createdAt),
        ])
        .limit(limit)
        .offset(offset);

      allProducts = productsWithOrder;
    } else {
      // Contar total para paginação usando count() do drizzle
      const countQuery = await db.select({ count: count() }).from(products);

      totalCount = countQuery[0]?.count || 0;

      // LEFT JOIN com product_display_order para incluir ordem personalizada
      // Usar COALESCE para priorizar produtos com ordem customizada
      const productsWithOrder = await db
        .select({
          ...getTableColumns(products),
          displayOrder: productDisplayOrder.displayOrder,
        })
        .from(products)
        .leftJoin(productDisplayOrder, eq(products.id, productDisplayOrder.productId))
        .orderBy(t => [
          // Produtos COM ordem customizada aparecem PRIMEIRO (ordem crescente 1,2,3...)
          // NULLS LAST garante que produtos sem ordem vão pro final
          sql`${t.displayOrder} ASC NULLS LAST`,
          // Produtos sem ordem customizada (NULL) ordenam por createdAt DESC
          desc(products.createdAt),
        ])
        .limit(limit)
        .offset(offset);

      allProducts = productsWithOrder;
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

    // Cache padrão (ISR de 2min já configurado)
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
    let slug = validatedData.slug || '';

    if (!slug) {
      // Gerar slug a partir do nome (preservando caracteres)
      const baseSlug = validatedData.name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
        .replace(/[^a-z0-9\s\-]/g, '') // Remove caracteres especiais (hífen escapado)
        .replace(/\s+/g, '-') // Espaços → hífens
        .replace(/-+/g, '-') // Remove hífens duplicados
        .replace(/^-+|-+$/g, ''); // Remove hífens no início/fim

      // Se o slug gerado estiver vazio (nome com apenas caracteres especiais/emojis),
      // usar um slug padrão
      slug = baseSlug || 'produto';

      // Adicionar timestamp + random para garantir unicidade (evitar duplicate key)
      const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
      slug = `${slug}-${uniqueSuffix}`;
    }

    // Garantir que slug tenha pelo menos 1 caractere
    if (slug.length === 0) {
      slug = `produto-${Date.now().toString(36)}`;
    }

    // Create product - using all schema fields
    // Normalizar strings vazias para null
    const normalizeString = (val: string | undefined | null) => {
      if (!val || val.trim() === '') return null;
      return val;
    };

    const newProduct = {
      name: validatedData.name,
      slug,
      description: normalizeString(validatedData.description),
      shortDescription: normalizeString(validatedData.shortDescription),
      // price foi removido - agora está apenas nas variações
      categoryId: validatedData.categoryId || null,
      isActive: validatedData.isActive,
      isFeatured: validatedData.isFeatured,
      fileType: validatedData.fileType || 'pdf', // Tipo de arquivo digital
      seoTitle: normalizeString(validatedData.seoTitle) || validatedData.name,
      seoDescription:
        normalizeString(validatedData.seoDescription) ||
        normalizeString(validatedData.shortDescription),
    };

    console.log(
      '[DEBUG] newProduct before insert:',
      JSON.stringify({
        name: newProduct.name,
        slug: newProduct.slug,
        descLength: newProduct.description?.length,
        shortDescLength: newProduct.shortDescription?.length,
        seoDescLength: newProduct.seoDescription?.length,
      })
    );

    // Narrow validated data to the extended schema type
    const validated = validatedData as z.infer<typeof createProductSchemaWithDefs>;

    // Wrap DB operations in a transaction to ensure atomicity
    const result = await db.transaction(async tx => {
      const [insertedProduct] = await tx.insert(products).values(newProduct).returning();

      // ============================================================================
      // ORDENAÇÃO AUTOMÁTICA: Novo produto sempre no topo (displayOrder = 1)
      // ============================================================================
      // 1. Incrementar todos os displayOrder existentes (+1)
      await tx.execute(sql`
        UPDATE product_display_order 
        SET display_order = display_order + 1,
            updated_at = NOW()
      `);

      // 2. Inserir novo produto com displayOrder = 1 (primeiro da lista)
      await tx.insert(productDisplayOrder).values({
        productId: insertedProduct.id,
        displayOrder: 1,
        updatedAt: new Date(),
      });

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
        const imageData = (validatedData.images || []).map(image => ({
          productId: insertedProduct.id,
          cloudinaryId: image.cloudinaryId,
          url: image.url, // ✅ Manter URL original
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
        const variationsToInsert = validatedData.variations.map((variation, index) => ({
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
          sortOrder: index,
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
                url: image.url, // ✅ Manter URL original
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
              // Só adicionar arquivo se tiver r2Key (arquivo foi feito upload)
              if (file.r2Key) {
                allVariationFiles.push({
                  variationId: insertedVariation.id,
                  name: file.filename,
                  originalName: file.originalName,
                  mimeType: file.mimeType,
                  size: file.fileSize,
                  path: file.r2Key,
                });
              }
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
        const fileData = validated.files
          .filter(file => file.r2Key) // Só incluir arquivos que têm r2Key (upload completo)
          .map(file => ({
            productId: insertedProduct.id,
            name: file.filename,
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.fileSize,
            path: file.r2Key!,
          }));

        if (fileData.length > 0) {
          await tx.insert(files).values(fileData);
        }
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

      // 🌍 OTIMIZAÇÃO: Salvar traduções diretas (se fornecidas pelo frontend)
      const translations = (validated as { translations?: { en?: unknown; es?: unknown } })
        .translations;
      if (translations && (translations.en || translations.es)) {
        const i18nInserts: Array<{
          productId: string;
          locale: string;
          name: string;
          slug: string;
          description?: string | null;
          shortDescription?: string | null;
          seoTitle?: string | null;
          seoDescription?: string | null;
        }> = [];

        if (translations.en) {
          const enTrans = translations.en as {
            name?: string;
            description?: string;
            shortDescription?: string;
          };
          i18nInserts.push({
            productId: insertedProduct.id,
            locale: 'en',
            name: enTrans.name || insertedProduct.name,
            slug: generateSlug(enTrans.name || insertedProduct.name),
            description: enTrans.description || null,
            shortDescription: enTrans.shortDescription || null,
            seoTitle: enTrans.name || insertedProduct.name,
            seoDescription: enTrans.description || null,
          });
        }

        if (translations.es) {
          const esTrans = translations.es as {
            name?: string;
            description?: string;
            shortDescription?: string;
          };
          i18nInserts.push({
            productId: insertedProduct.id,
            locale: 'es',
            name: esTrans.name || insertedProduct.name,
            slug: generateSlug(esTrans.name || insertedProduct.name),
            description: esTrans.description || null,
            shortDescription: esTrans.shortDescription || null,
            seoTitle: esTrans.name || insertedProduct.name,
            seoDescription: esTrans.description || null,
          });
        }

        if (i18nInserts.length > 0) {
          await tx.insert(productI18n).values(i18nInserts).onConflictDoNothing();
          console.log(`✅ Traduções diretas salvas: ${i18nInserts.map(i => i.locale).join(', ')}`);
        }
      } else {
        // Fallback: Enfileirar job de tradução (assíncrono via cron)
        await tx.insert(productJobs).values({
          type: 'translate_product',
          payload: JSON.stringify({ productId: insertedProduct.id }),
          status: 'pending',
        });
        console.log('⏳ Job de tradução enfileirado (fallback)');
      }

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

    // 🔥 INVALIDAÇÃO SOB DEMANDA: Limpa cache apenas ao criar/editar/deletar
    try {
      // 1️⃣ Limpa TODOS os produtos no Redis (padrão "products:*")
      await invalidateProductsCache();
      console.log('✅ [CACHE] Redis invalidado - próxima requisição buscará do banco');

      // 2️⃣ VERCEL: Revalidar rotas estáticas (ISR)
      if (process.env.VERCEL) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arafacriou.com.br';

        // Revalidar home e página de produtos
        const revalidateUrls = [
          `${baseUrl}/api/revalidate?path=/`,
          `${baseUrl}/api/revalidate?path=/produtos`,
        ];

        await Promise.allSettled(
          revalidateUrls.map(url =>
            fetch(url, {
              method: 'GET',
              headers: {
                'x-revalidate-secret': process.env.REVALIDATE_SECRET || 'fallback-secret',
              },
            })
          )
        );

        console.log('✅ [ISR] Rotas revalidadas - produtos atualizados na próxima requisição');
      }
    } catch (cacheError) {
      console.error('⚠️ Erro ao invalidar cache:', cacheError);
      // Não bloqueia a resposta se cache falhar
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    // Log completo no servidor
    console.error('[ERROR] Failed to create product:', error);

    // Detectar erro de duplicate key
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('duplicate key') || errMsg.includes('23505')) {
      return NextResponse.json(
        {
          error: 'Duplicate slug',
          details: 'Slug já existe. Tente novamente ou forneça um slug personalizado.',
        },
        { status: 409 }
      );
    }

    // Retornar erro resumido para o cliente
    const shortMsg = errMsg.split('\n')[0];
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: shortMsg.length > 200 ? shortMsg.substring(0, 200) + '...' : shortMsg,
      },
      { status: 500 }
    );
  }
}
