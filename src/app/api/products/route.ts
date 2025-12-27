import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  products,
  categories,
  productVariations,
  productImages,
  productI18n,
  categoryI18n,
  variationAttributeValues,
  attributeValues,
  attributes,
  productCategories,
  productDisplayOrder,
  promotions,
  promotionProducts,
  promotionVariations,
} from '@/lib/db/schema';
import { cacheGet, getCacheKey } from '@/lib/cache/upstash';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

// 🔥 CACHE ON-DEMAND: Cache infinito, só revalida quando criar/editar/deletar
export const revalidate = 86400; // 24 horas (invalidação sob demanda)
export const dynamic = 'force-dynamic'; // Força rota dinâmica para rate limiting

import { eq, inArray, desc, or, and, asc, ilike, sql, lte, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // 🛡️ RATE LIMITING: Proteger contra DDoS e abuso
  const rateLimitResult = await rateLimitMiddleware(request, RATE_LIMITS.public);
  if (rateLimitResult) return rateLimitResult;

  // 🚀 CACHE REDIS: Pegar parâmetros para gerar chave de cache
  const { searchParams } = new URL(request.url);

  // Suportar offset direto ou página
  const offsetParam = searchParams.get('offset');
  const limit = Math.min(
    parseInt(searchParams.get('limite') || searchParams.get('limit') || '12'),
    50
  );
  const offset =
    offsetParam !== null
      ? parseInt(offsetParam)
      : (parseInt(searchParams.get('pagina') || '1') - 1) * limit;
  const page =
    offsetParam !== null
      ? Math.floor(offset / limit) + 1
      : parseInt(searchParams.get('pagina') || '1');

  const categoria = searchParams.get('categoria') || '';
  const subcategoria = searchParams.get('subcategoria') || '';
  const busca = searchParams.get('q') || searchParams.get('search') || '';
  const ordem = searchParams.get('ordem') || 'recentes';
  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'pt';

  // 🔥 CACHE BUST: Se tiver parâmetro _t, pular cache completamente
  const cacheBuster = searchParams.get('_t');
  const skipCache = !!cacheBuster;

  // Gerar chave de cache única COM OFFSET e subcategoria
  const cacheKey = getCacheKey({
    page,
    limit,
    offset,
    categoria,
    subcategoria,
    busca,
    ordem,
    locale,
  });

  // 🔥 CACHE INFINITO: 24h no Redis, invalidação sob demanda ao criar/editar produto
  const data = skipCache
    ? await fetchProductsLogic(request)
    : await cacheGet(
        cacheKey,
        async () => {
          // LÓGICA ORIGINAL DA API (movida para dentro do cache)
          return await fetchProductsLogic(request);
        },
        86400 // 24 horas - só busca banco quando invalidar cache
      );

  // Headers normais
  return NextResponse.json(data);
}

// Função auxiliar com a lógica original
async function fetchProductsLogic(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get('limite') || searchParams.get('limit') || '24'),
      100
    ); // 🔥 Limite aumentado: padrão 24, máximo 100 produtos por página

    // Suportar tanto offset direto quanto página
    let offset: number;
    const offsetParam = searchParams.get('offset');
    if (offsetParam !== null) {
      offset = parseInt(offsetParam);
    } else {
      const page = parseInt(searchParams.get('pagina') || '1');
      offset = (page - 1) * limit;
    }

    const featured = searchParams.get('featured') === 'true';
    const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
    const categorySlug = searchParams.get('categoria');
    const subcategorySlug = searchParams.get('subcategoria');
    const sortBy = searchParams.get('ordem') || 'recentes';
    const minPrice = searchParams.get('min');
    const maxPrice = searchParams.get('max');

    // Obter locale do cookie ou usar 'pt' como padrão
    const locale = request.cookies.get('NEXT_LOCALE')?.value || 'pt';

    // Montar query base
    const whereClauses = [];

    // Filtro: apenas produtos ativos
    whereClauses.push(eq(products.isActive, true));

    if (featured) {
      whereClauses.push(eq(products.isFeatured, true));
    }

    // 🔥 OTIMIZAÇÃO: Busca simplificada (sem múltiplas queries)
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      whereClauses.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.description, searchTerm),
          ilike(products.shortDescription, searchTerm)
        )
      );
    }

    // Filtro por categoria ou subcategoria
    // IMPORTANTE: Buscar tanto em products.categoryId quanto na tabela productCategories
    if (subcategorySlug && subcategorySlug !== 'todas') {
      // Buscar apenas pela subcategoria
      const categoryResult = await db
        .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
        .from(categories)
        .where(eq(categories.slug, subcategorySlug))
        .limit(1);

      if (categoryResult.length > 0) {
        const categoryId = categoryResult[0].id;
        // Buscar produtos que têm esta categoria na tabela de junção OU no categoryId direto
        const productsInCategory = await db
          .select({ productId: productCategories.productId })
          .from(productCategories)
          .where(eq(productCategories.categoryId, categoryId));

        const productIds = productsInCategory.map(p => p.productId);

        if (productIds.length > 0) {
          whereClauses.push(
            or(eq(products.categoryId, categoryId), inArray(products.id, productIds))
          );
        } else {
          // Se não tem produtos na tabela de junção, buscar apenas por categoryId
          whereClauses.push(eq(products.categoryId, categoryId));
        }
      }
    } else if (categorySlug && categorySlug !== 'todas') {
      // Buscar pela categoria (incluindo suas subcategorias)
      const categoryResult = await db
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);

      if (categoryResult.length > 0) {
        const categoryId = categoryResult[0].id;
        const isSubcategory = categoryResult[0].parentId !== null;

        if (isSubcategory) {
          // Se a categoria em si é uma subcategoria
          const productsInCategory = await db
            .select({ productId: productCategories.productId })
            .from(productCategories)
            .where(eq(productCategories.categoryId, categoryId));

          const productIds = productsInCategory.map(p => p.productId);

          if (productIds.length > 0) {
            whereClauses.push(
              or(eq(products.categoryId, categoryId), inArray(products.id, productIds))
            );
          } else {
            whereClauses.push(eq(products.categoryId, categoryId));
          }
        } else {
          // Se é categoria pai, incluir ela + todas suas subcategorias
          const subcategories = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.parentId, categoryId));

          const categoryIds = [categoryId, ...subcategories.map(sub => sub.id)];

          // Buscar produtos que têm qualquer uma dessas categorias
          const productsInCategories = await db
            .select({ productId: productCategories.productId })
            .from(productCategories)
            .where(inArray(productCategories.categoryId, categoryIds));

          const productIds = productsInCategories.map(p => p.productId);

          if (productIds.length > 0) {
            whereClauses.push(
              or(inArray(products.categoryId, categoryIds), inArray(products.id, productIds))
            );
          } else {
            whereClauses.push(inArray(products.categoryId, categoryIds));
          }
        }
      }
    }

    const whereClause =
      whereClauses.length > 0
        ? whereClauses.length === 1
          ? whereClauses[0]
          : and(...whereClauses)
        : undefined;

    // 🔥 OTIMIZAÇÃO CRÍTICA: Contar ANTES de buscar dados completos
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause);

    const totalCount = countResult[0]?.count || 0;

    // Se não há resultados, retornar imediatamente
    if (totalCount === 0) {
      return NextResponse.json({
        products: [],
        pagination: {
          total: 0,
          limit,
          offset: 0,
          hasMore: false,
        },
      });
    }

    // Definir ordenação
    let orderByClause;
    switch (sortBy) {
      case 'antigos':
        orderByClause = asc(products.createdAt);
        break;
      case 'nome-asc':
        orderByClause = asc(products.name);
        break;
      case 'nome-desc':
        orderByClause = desc(products.name);
        break;
      default:
        // Ordem padrão: usar displayOrder customizado, depois createdAt DESC
        orderByClause = null; // Será tratado abaixo com LEFT JOIN
        break;
    }

    // 🔥 OTIMIZAÇÃO: Buscar produtos COM paginação ANTES de buscar relacionamentos
    let dbProductsRaw;

    if (orderByClause) {
      // Ordenação específica (nome, antigos) - não usar displayOrder
      dbProductsRaw = await db
        .select({
          product: products,
          translation: productI18n,
          displayOrder: productDisplayOrder.displayOrder,
        })
        .from(products)
        .leftJoin(
          productI18n,
          and(eq(productI18n.productId, products.id), eq(productI18n.locale, locale))
        )
        .leftJoin(productDisplayOrder, eq(products.id, productDisplayOrder.productId))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);
    } else {
      // Ordenação padrão: displayOrder customizado + createdAt DESC
      dbProductsRaw = await db
        .select({
          product: products,
          translation: productI18n,
          displayOrder: productDisplayOrder.displayOrder,
        })
        .from(products)
        .leftJoin(
          productI18n,
          and(eq(productI18n.productId, products.id), eq(productI18n.locale, locale))
        )
        .leftJoin(productDisplayOrder, eq(products.id, productDisplayOrder.productId))
        .where(whereClause)
        .orderBy(sql`${productDisplayOrder.displayOrder} ASC NULLS LAST`, desc(products.createdAt))
        .limit(limit)
        .offset(offset);
    }

    // Usar dados traduzidos quando disponíveis
    const dbProducts = dbProductsRaw.map(({ product, translation }) => ({
      ...product,
      name: translation?.name || product.name,
      description:
        translation?.description && translation.description.trim() !== ''
          ? translation.description
          : product.description || '',
      shortDescription: translation?.shortDescription || product.shortDescription,
    }));

    const productIds = dbProducts.map(p => p.id);

    // 🔥 OTIMIZAÇÃO: Buscar variações ativas com preços E attributeValues
    const activeVariations = await db
      .select({
        id: productVariations.id,
        productId: productVariations.productId,
        name: productVariations.name,
        price: productVariations.price,
        isActive: productVariations.isActive,
      })
      .from(productVariations)
      .where(
        and(inArray(productVariations.productId, productIds), eq(productVariations.isActive, true))
      );

    // Buscar attributeValues para cada variação
    const variationIds = activeVariations.map(v => v.id);
    let attributeValuesData: Array<{
      variationId: string;
      attributeId: string;
      attributeName: string;
      valueId: string;
      value: string;
    }> = [];

    if (variationIds.length > 0) {
      attributeValuesData = await db
        .select({
          variationId: variationAttributeValues.variationId,
          attributeId: variationAttributeValues.attributeId,
          attributeName: attributes.name,
          valueId: variationAttributeValues.valueId,
          value: attributeValues.value,
        })
        .from(variationAttributeValues)
        .innerJoin(attributes, eq(variationAttributeValues.attributeId, attributes.id))
        .innerJoin(attributeValues, eq(variationAttributeValues.valueId, attributeValues.id))
        .where(inArray(variationAttributeValues.variationId, variationIds));
    }

    // Criar mapa de attributeValues por variação
    const attributeValuesMap = new Map<
      string,
      Array<{ attributeId: string; attributeName: string; valueId: string; value: string }>
    >();
    attributeValuesData.forEach(attr => {
      if (!attributeValuesMap.has(attr.variationId)) {
        attributeValuesMap.set(attr.variationId, []);
      }
      attributeValuesMap.get(attr.variationId)!.push({
        attributeId: attr.attributeId,
        attributeName: attr.attributeName,
        valueId: attr.valueId,
        value: attr.value,
      });
    });

    // Criar mapa de variações por produto COM attributeValues
    const variationsMap = new Map<
      string,
      Array<{
        id: string;
        name: string;
        price: number;
        isActive: boolean;
        attributeValues?: Array<{
          attributeId: string;
          attributeName: string;
          valueId: string;
          value: string;
        }>;
      }>
    >();
    activeVariations.forEach(v => {
      if (!variationsMap.has(v.productId!)) {
        variationsMap.set(v.productId!, []);
      }
      variationsMap.get(v.productId!)!.push({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        isActive: v.isActive,
        attributeValues: attributeValuesMap.get(v.id) || [],
      });
    });

    // 🔥 OTIMIZAÇÃO: SINGLE QUERY para buscar variações COM preço mínimo JÁ CALCULADO
    const variationsWithMinPrice = await db
      .select({
        productId: productVariations.productId,
        minPrice: sql<number>`MIN(CAST(${productVariations.price} AS DECIMAL))`,
        hasVariations: sql<boolean>`COUNT(*) > 0`,
      })
      .from(productVariations)
      .where(
        and(inArray(productVariations.productId, productIds), eq(productVariations.isActive, true))
      )
      .groupBy(productVariations.productId);

    const minPricesMap = new Map(
      variationsWithMinPrice.map(v => [v.productId!, Number(v.minPrice) || 0])
    );

    // 🔥 OTIMIZAÇÃO: Buscar APENAS imagens principais (não todas as imagens)
    const mainImages = await db
      .select()
      .from(productImages)
      .where(
        and(
          inArray(productImages.productId, productIds),
          or(eq(productImages.isMain, true), sql`${productImages.sortOrder} = 0`)
        )
      );

    const mainImagesMap = new Map(mainImages.map(img => [img.productId!, img]));

    // 🔥 OTIMIZAÇÃO: Buscar categorias de uma vez
    const categoryIds = dbProducts.map(p => p.categoryId).filter((id): id is string => !!id);
    const categoriesMap: Record<string, { id: string; name: string; slug: string }> = {};

    if (categoryIds.length > 0) {
      const catsRaw = await db
        .select({
          category: categories,
          translation: categoryI18n,
        })
        .from(categories)
        .leftJoin(
          categoryI18n,
          and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, locale))
        )
        .where(inArray(categories.id, categoryIds));

      catsRaw.forEach(({ category, translation }) => {
        categoriesMap[category.id] = {
          id: category.id,
          name: translation?.name || category.name,
          slug: translation?.slug || category.slug,
        };
      });
    }

    // 🔥 BUSCAR PROMOÇÕES ATIVAS para produtos e variações
    const now = new Date();

    // Buscar promoções globais (applies_to = 'all')
    const globalPromotions = await db
      .select({
        id: promotions.id,
        name: promotions.name,
        discountType: promotions.discountType,
        discountValue: promotions.discountValue,
      })
      .from(promotions)
      .where(
        and(
          eq(promotions.appliesTo, 'all'),
          eq(promotions.isActive, true),
          lte(promotions.startDate, now),
          gte(promotions.endDate, now)
        )
      )
      .orderBy(desc(promotions.discountValue))
      .limit(1);

    const globalPromotion = globalPromotions.length > 0 ? globalPromotions[0] : null;

    // Buscar promoções específicas de produtos
    const productPromotionsData =
      productIds.length > 0
        ? await db
            .select({
              productId: promotionProducts.productId,
              id: promotions.id,
              name: promotions.name,
              discountType: promotions.discountType,
              discountValue: promotions.discountValue,
            })
            .from(promotions)
            .innerJoin(promotionProducts, eq(promotions.id, promotionProducts.promotionId))
            .where(
              and(
                inArray(promotionProducts.productId, productIds),
                eq(promotions.isActive, true),
                lte(promotions.startDate, now),
                gte(promotions.endDate, now)
              )
            )
            .orderBy(desc(promotions.discountValue))
        : [];

    const productPromotionsMap = new Map(
      productPromotionsData.map(p => [
        p.productId,
        {
          id: p.id,
          name: p.name,
          discountType: p.discountType as 'percentage' | 'fixed',
          discountValue: Number(p.discountValue),
        },
      ])
    );

    // Buscar promoções específicas de variações
    const variationPromotionsData =
      variationIds.length > 0
        ? await db
            .select({
              variationId: promotionVariations.variationId,
              id: promotions.id,
              name: promotions.name,
              discountType: promotions.discountType,
              discountValue: promotions.discountValue,
            })
            .from(promotions)
            .innerJoin(promotionVariations, eq(promotions.id, promotionVariations.promotionId))
            .where(
              and(
                inArray(promotionVariations.variationId, variationIds),
                eq(promotions.isActive, true),
                lte(promotions.startDate, now),
                gte(promotions.endDate, now)
              )
            )
            .orderBy(desc(promotions.discountValue))
        : [];

    const variationPromotionsMap = new Map(
      variationPromotionsData.map(v => [
        v.variationId,
        {
          id: v.id,
          name: v.name,
          discountType: v.discountType as 'percentage' | 'fixed',
          discountValue: Number(v.discountValue),
        },
      ])
    );

    // Função auxiliar para calcular preço com promoção
    const calculatePromotionalPrice = (
      originalPrice: number,
      promotion: { discountType: 'percentage' | 'fixed'; discountValue: number } | null
    ) => {
      if (!promotion) return { finalPrice: originalPrice, discount: 0 };

      if (promotion.discountType === 'percentage') {
        const discount = (originalPrice * promotion.discountValue) / 100;
        return {
          finalPrice: Math.max(0, originalPrice - discount),
          discount: Math.round(discount * 100) / 100,
        };
      } else {
        return {
          finalPrice: Math.max(0, originalPrice - promotion.discountValue),
          discount: promotion.discountValue,
        };
      }
    };

    // 🔥 OTIMIZAÇÃO: Montar resposta COM variações para cálculo de faixa de preço
    let productsOut = dbProducts.map(p => {
      const minPrice = minPricesMap.get(p.id) || 0;
      const mainImageObj = mainImagesMap.get(p.id);
      const productVariationsRaw = variationsMap.get(p.id) || [];

      // Aplicar promoções às variações
      const productVariationsWithPromotions = productVariationsRaw.map(v => {
        // Prioridade: promoção de variação > promoção de produto > promoção global
        const promotion =
          variationPromotionsMap.get(v.id) || productPromotionsMap.get(p.id) || globalPromotion;
        const { finalPrice, discount } = calculatePromotionalPrice(
          v.price,
          promotion as { discountType: 'percentage' | 'fixed'; discountValue: number } | null
        );

        // Limpar nome da promoção removendo data/hora
        const cleanPromotionName = (name: string) => {
          return name.replace(/\s*[-–—:]\s*\d{1,2}\/\d{1,2}[\s\S]*$/i, '').trim();
        };

        return {
          ...v,
          originalPrice: promotion ? v.price : undefined,
          price: finalPrice,
          hasPromotion: !!promotion,
          discount,
          promotion: promotion
            ? {
                id: promotion.id,
                name: cleanPromotionName(promotion.name),
                discountType: promotion.discountType,
                discountValue: promotion.discountValue,
              }
            : undefined,
        };
      });

      // Calcular preço mínimo com promoções aplicadas
      const minPromotionalPrice =
        productVariationsWithPromotions.length > 0
          ? Math.min(...productVariationsWithPromotions.map(v => v.price))
          : minPrice;

      // Verificar se alguma variação tem promoção
      const hasAnyPromotion = productVariationsWithPromotions.some(v => v.hasPromotion);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        price: minPromotionalPrice,
        originalPrice: hasAnyPromotion ? minPrice : undefined,
        hasPromotion: hasAnyPromotion,
        priceDisplay: `R$ ${minPromotionalPrice.toFixed(2).replace('.', ',')}`,
        categoryId: p.categoryId,
        category: p.categoryId ? categoriesMap[p.categoryId] || null : null,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt,
        variations: productVariationsWithPromotions, // ✅ Retornar variações com promoções
        mainImage: mainImageObj
          ? {
              data: mainImageObj.url,
              alt: mainImageObj.alt || p.name,
            }
          : null,
        images: mainImageObj
          ? [
              {
                data: mainImageObj.url,
                alt: mainImageObj.alt || p.name,
              },
            ]
          : [],
      };
    });

    // Filtrar por faixa de preço
    if (minPrice) {
      productsOut = productsOut.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
      productsOut = productsOut.filter(p => p.price <= Number(maxPrice));
    }

    // Ordenar por preço se necessário
    if (sortBy === 'preco-asc') {
      productsOut.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'preco-desc') {
      productsOut.sort((a, b) => b.price - a.price);
    }

    return {
      products: productsOut,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    };
  } catch (error) {
    console.error('❌ ERRO COMPLETO na API de produtos:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    throw error; // Re-throw para o cache handler tratar
  }
}
