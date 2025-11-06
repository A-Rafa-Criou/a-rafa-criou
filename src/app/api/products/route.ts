import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  products,
  categories,
  productVariations,
  productImages,
  variationAttributeValues,
  attributes,
  attributeValues,
  productI18n,
  categoryI18n,
} from '@/lib/db/schema';

// Cache de 1 hora para produtos, mas rota dinâmica
export const revalidate = 3600;
export const dynamic = 'force-dynamic'; // Necessário porque usa searchParams

type VariationDb = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: string | number;
  isActive: boolean;
  sortOrder: number;
};

type AttributeValueDb = {
  variationId: string;
  attributeId: string;
  attributeName: string | null;
  valueId: string;
  value: string | null;
};

type ImageDb = {
  id: string;
  productId: string;
  variationId?: string;
  cloudinaryId: string;
  url: string;
  alt?: string;
  isMain?: boolean;
};
import { eq, inArray, desc, like, or, and, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limite') || searchParams.get('limit') || '12');
    const page = parseInt(searchParams.get('pagina') || '1');
    const offset = (page - 1) * limit;
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

    if (searchQuery && searchQuery.trim()) {
      whereClauses.push(
        or(
          like(products.name, `%${searchQuery}%`),
          like(products.description, `%${searchQuery}%`),
          like(products.shortDescription, `%${searchQuery}%`)
        )
      );
    }

    // Filtro por faixa de preço (filtrar após buscar variações)
    const filterByPrice = minPrice || maxPrice;

    // Filtro por categoria (slug)
    if (categorySlug && categorySlug !== 'todas') {
      // Buscar ID da categoria pelo slug
      const categoryResult = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);
      
      if (categoryResult.length > 0) {
        whereClauses.push(eq(products.categoryId, categoryResult[0].id));
      }
    }

    const whereClause =
      whereClauses.length > 0
        ? whereClauses.length === 1
          ? whereClauses[0]
          : and(...whereClauses)
        : undefined;

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
      case 'preco-asc':
      case 'preco-desc':
        // Para ordenar por preço, vamos fazer depois (após calcular preços das variações)
        orderByClause = desc(products.createdAt);
        break;
      case 'recentes':
      default:
        orderByClause = desc(products.createdAt);
        break;
    }

    // Buscar produtos do banco com traduções
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
      .orderBy(orderByClause);

    // Usar dados traduzidos quando disponíveis
    const dbProducts = dbProductsRaw.map(({ product, translation }) => ({
      ...product,
      name: translation?.name || product.name,
      // Para descrição: se houver tradução E não for vazia, usar tradução
      description:
        translation?.description && translation.description.trim() !== ''
          ? translation.description
          : product.description || '',
      shortDescription: translation?.shortDescription || product.shortDescription,
    }));

    // Buscar variações de todos os produtos retornados
    const productIds = dbProducts.map(p => p.id);
    let allVariations: VariationDb[] = [];
    let allVariationAttributes: AttributeValueDb[] = [];

    if (productIds.length > 0) {
      const rawVariations = await db
        .select()
        .from(productVariations)
        .where(inArray(productVariations.productId, productIds));
      allVariations = rawVariations.map(v => ({
        id: v.id,
        productId: v.productId!,
        name: v.name,
        slug: v.slug,
        price: v.price,
        isActive: v.isActive,
        sortOrder: v.sortOrder ?? 0,
      }));

      // Buscar attributeValues das variações
      const variationIds = allVariations.map(v => v.id);
      if (variationIds.length > 0) {
        const rawAttrValues = await db
          .select({
            variationId: variationAttributeValues.variationId,
            attributeId: variationAttributeValues.attributeId,
            attributeName: attributes.name,
            valueId: variationAttributeValues.valueId,
            value: attributeValues.value,
          })
          .from(variationAttributeValues)
          .leftJoin(attributes, eq(variationAttributeValues.attributeId, attributes.id))
          .leftJoin(attributeValues, eq(variationAttributeValues.valueId, attributeValues.id))
          .where(inArray(variationAttributeValues.variationId, variationIds));

        allVariationAttributes = rawAttrValues.map(attr => ({
          variationId: attr.variationId!,
          attributeId: attr.attributeId!,
          attributeName: attr.attributeName,
          valueId: attr.valueId!,
          value: attr.value,
        }));
      }
    }

    // Buscar todas as imagens de todos os produtos
    let allImages: ImageDb[] = [];
    if (productIds.length > 0) {
      const rawImages = await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds));
      allImages = rawImages.map(img => ({
        id: img.id,
        productId: img.productId!,
        variationId: img.variationId || undefined,
        cloudinaryId: img.cloudinaryId,
        url: img.url,
        alt: img.alt || undefined,
        isMain: !!img.isMain,
      }));
    }

    // Buscar categorias com traduções para mapear nome
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

    // Adaptar formato para o frontend
    let productsOut = dbProducts.map(p => {
      // Variações deste produto
      const variations = allVariations
        .filter(v => v.productId === p.id)
        .map(v => {
          // Buscar attributeValues desta variação
          const varAttrs = allVariationAttributes.filter(attr => attr.variationId === v.id);

          // Buscar imagens desta variação
          const variationImages = allImages.filter(img => img.variationId === v.id);

          return {
            id: v.id,
            name: v.name,
            slug: v.slug,
            price: Number(v.price),
            isActive: v.isActive,
            sortOrder: v.sortOrder,
            images: variationImages.map(img => img.url), // URLs das imagens da variação
            attributeValues: varAttrs.map(attr => ({
              attributeId: attr.attributeId,
              attributeName: attr.attributeName,
              valueId: attr.valueId,
              value: attr.value,
            })),
          };
        });

      // Calcular preço mínimo das variações ativas
      const activeVariations = variations.filter(v => v.isActive);
      const minVariationPrice = activeVariations.length > 0
        ? Math.min(...activeVariations.map(v => v.price))
        : 0;

      // Todas as imagens deste produto
      const images = allImages.filter(img => img.productId === p.id);
      // Imagem principal: prioriza isMain, senão pega a primeira
      const mainImageObj = images.find(img => img.isMain) || images[0];

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        price: minVariationPrice,
        priceDisplay: `R$ ${minVariationPrice.toFixed(2).replace('.', ',')}`,
        categoryId: p.categoryId,
        category: p.categoryId ? categoriesMap[p.categoryId] || null : null,
        isFeatured: p.isFeatured,
        createdAt: p.createdAt,
        variations,
        mainImage: mainImageObj
          ? {
              data: mainImageObj.url, // URL do Cloudinary (compatibilidade com frontend existente)
              alt: mainImageObj.alt || p.name,
            }
          : null,
        images: images.map(img => ({
          data: img.url, // URL do Cloudinary
          alt: img.alt || p.name,
        })),
      };
    });

    // Filtrar por faixa de preço (após calcular preços)
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

    // Total e paginação
    const totalFiltered = productsOut.length;
    productsOut = productsOut.slice(offset, offset + limit);

    return NextResponse.json({
      products: productsOut,
      pagination: {
        total: totalFiltered,
        limit,
        offset,
        hasMore: offset + limit < totalFiltered,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
