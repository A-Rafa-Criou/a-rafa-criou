import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  products,
  categories,
  productVariations,
  productImages,
  productI18n,
  categoryI18n,
} from '@/lib/db/schema';
import { cacheGet, getCacheKey } from '@/lib/cache/upstash';
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit';

// 🔥 OTIMIZAÇÃO CRÍTICA: ISR com revalidação de 1 hora (produtos novos aparecem rápido)
export const revalidate = 3600; // 1 hora (balanço entre performance e atualização)
export const dynamic = 'force-dynamic'; // Força rota dinâmica para rate limiting funcionar

import { eq, inArray, desc, or, and, asc, ilike, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // 🛡️ RATE LIMITING: Proteger contra DDoS e abuso
  const rateLimitResult = await rateLimitMiddleware(request, RATE_LIMITS.public);
  if (rateLimitResult) return rateLimitResult;

  // 🚀 CACHE REDIS: Pegar parâmetros para gerar chave de cache
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('pagina') || '1');
  const limit = Math.min(
    parseInt(searchParams.get('limite') || searchParams.get('limit') || '12'),
    50
  );
  const categoria = searchParams.get('categoria') || '';
  const busca = searchParams.get('q') || searchParams.get('search') || '';
  const ordem = searchParams.get('ordem') || 'recentes';
  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'pt';

  // Gerar chave de cache única
  const cacheKey = getCacheKey({ page, limit, categoria, busca, ordem, locale });

  // Envolver tudo em cache (Redis ou execução direta)
  return NextResponse.json(
    await cacheGet(
      cacheKey,
      async () => {
        // LÓGICA ORIGINAL DA API (movida para dentro do cache)
        return await fetchProductsLogic(request);
      },
      600 // 10 minutos de cache no Redis (aumento de 5min para 10min)
    )
  );
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

    // Filtro por categoria
    if (categorySlug && categorySlug !== 'todas') {
      const categoryResult = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);

      if (categoryResult.length > 0) {
        const categoryId = categoryResult[0].id;
        const subcategories = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.parentId, categoryId));

        const categoryIds = [categoryId, ...subcategories.map(sub => sub.id)];
        whereClauses.push(inArray(products.categoryId, categoryIds));
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
        orderByClause = desc(products.createdAt);
        break;
    }

    // 🔥 OTIMIZAÇÃO: Buscar produtos COM paginação ANTES de buscar relacionamentos
    const dbProductsRaw = await db
      .select({
        product: products,
        translation: productI18n,
      })
      .from(products)
      .leftJoin(
        productI18n,
        and(eq(productI18n.productId, products.id), eq(productI18n.locale, locale))
      )
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

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

    // 🔥 OTIMIZAÇÃO: Montar resposta SEM buscar TODAS as variações/atributos
    let productsOut = dbProducts.map(p => {
      const minPrice = minPricesMap.get(p.id) || 0;
      const mainImageObj = mainImagesMap.get(p.id);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        price: minPrice,
        originalPrice: minPrice, // 🔥 TODO: Buscar promoções em batch depois
        hasPromotion: false,
        priceDisplay: `R$ ${minPrice.toFixed(2).replace('.', ',')}`,
        categoryId: p.categoryId,
        category: p.categoryId ? categoriesMap[p.categoryId] || null : null,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt,
        variations: [], // 🔥 Não buscar variações detalhadas aqui
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
