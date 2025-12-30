import { db } from './index';
import { eq, and, inArray, lte, gte, desc } from 'drizzle-orm';
import {
  products,
  productVariations,
  productImages,
  categories,
  attributes,
  attributeValues,
  variationAttributeValues,
  files,
  productI18n,
  categoryI18n,
  productVariationI18n,
  promotions,
  promotionVariations,
  promotionProducts,
} from './schema';

// 🔥 OTIMIZAÇÃO: Cache de promoções ativas em memória (5 minutos)
let promotionsCache: {
  variationPromotions: Map<string, typeof promotions.$inferSelect>;
  productPromotions: Map<string, typeof promotions.$inferSelect>;
  globalPromotion: typeof promotions.$inferSelect | null;
  timestamp: number;
} | null = null;

const PROMOTIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getActivePromotions() {
  const now = Date.now();

  // Retornar cache se ainda válido
  if (promotionsCache && now - promotionsCache.timestamp < PROMOTIONS_CACHE_TTL) {
    console.log('🔍 [CACHE] Usando promoções do cache');
    return promotionsCache;
  }

  console.log('🔍 [DB] Buscando promoções ativas do banco...');

  // Data/hora atual em Brasília
  const nowDate = new Date();

  // 1️⃣ Buscar promoções GLOBAIS (appliesTo = 'all')
  const globalPromotions = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.appliesTo, 'all'),
        eq(promotions.isActive, true),
        lte(promotions.startDate, nowDate),
        gte(promotions.endDate, nowDate)
      )
    )
    .orderBy(desc(promotions.discountValue))
    .limit(1);

  const globalPromotion = globalPromotions.length > 0 ? globalPromotions[0] : null;
  console.log('🔍 [DB] Promoção global:', globalPromotion ? globalPromotion.name : 'Nenhuma');

  // 2️⃣ Buscar promoções de PRODUTOS ESPECÍFICOS
  const productPromotionsData = await db
    .select({
      productId: promotionProducts.productId,
      id: promotions.id,
      name: promotions.name,
      discountType: promotions.discountType,
      discountValue: promotions.discountValue,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
      appliesTo: promotions.appliesTo,
      isActive: promotions.isActive,
    })
    .from(promotions)
    .innerJoin(promotionProducts, eq(promotions.id, promotionProducts.promotionId))
    .where(
      and(
        eq(promotions.isActive, true),
        lte(promotions.startDate, nowDate),
        gte(promotions.endDate, nowDate)
      )
    );

  const productPromotionsMap = new Map<string, typeof promotions.$inferSelect>();
  productPromotionsData.forEach(p => {
    productPromotionsMap.set(p.productId, p as unknown as typeof promotions.$inferSelect);
  });
  console.log('🔍 [DB] Promoções de produtos:', productPromotionsMap.size);

  // 3️⃣ Buscar promoções de VARIAÇÕES ESPECÍFICAS
  const variationPromotionsData = await db
    .select({
      variationId: promotionVariations.variationId,
      id: promotions.id,
      name: promotions.name,
      discountType: promotions.discountType,
      discountValue: promotions.discountValue,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
      appliesTo: promotions.appliesTo,
      isActive: promotions.isActive,
    })
    .from(promotions)
    .innerJoin(promotionVariations, eq(promotions.id, promotionVariations.promotionId))
    .where(
      and(
        eq(promotions.isActive, true),
        lte(promotions.startDate, nowDate),
        gte(promotions.endDate, nowDate)
      )
    );

  const variationPromotionsMap = new Map<string, typeof promotions.$inferSelect>();
  variationPromotionsData.forEach(v => {
    variationPromotionsMap.set(v.variationId, v as unknown as typeof promotions.$inferSelect);
  });
  console.log('🔍 [DB] Promoções de variações:', variationPromotionsMap.size);

  // Atualizar cache
  promotionsCache = {
    variationPromotions: variationPromotionsMap,
    productPromotions: productPromotionsMap,
    globalPromotion,
    timestamp: now,
  };

  return promotionsCache;
}

function calculatePromotionalPrice(basePrice: number, promotion?: typeof promotions.$inferSelect) {
  if (!promotion) {
    return {
      finalPrice: basePrice,
      originalPrice: basePrice,
      hasPromotion: false,
      discount: 0,
      promotion: undefined,
    };
  }

  let discount = 0;
  if (promotion.discountType === 'percentage') {
    discount = (basePrice * Number(promotion.discountValue)) / 100;
  } else {
    discount = Number(promotion.discountValue);
  }

  const finalPrice = Math.max(0, basePrice - discount);

  // Limpar nome da promoção removendo data/hora
  const cleanPromotionName = (name: string) => {
    return name.replace(/\s*[-–—:]\s*\d{1,2}\/\d{1,2}[\s\S]*$/i, '').trim();
  };

  return {
    finalPrice,
    originalPrice: basePrice,
    hasPromotion: true,
    discount,
    promotion: {
      id: promotion.id,
      name: cleanPromotionName(promotion.name),
      discountType: promotion.discountType as 'fixed' | 'percentage',
      discountValue: Number(promotion.discountValue),
      startDate: promotion.startDate,
      endDate: promotion.endDate,
    },
  };
}

export async function getProductBySlug(slug: string, locale: string = 'pt') {
  // 🔥 OTIMIZAÇÃO: Buscar produto por slug PT ou slug traduzido
  let translatedResult = await db
    .select({
      product: products,
      translation: productI18n,
    })
    .from(products)
    .leftJoin(
      productI18n,
      and(eq(productI18n.productId, products.id), eq(productI18n.locale, locale))
    )
    .where(eq(products.slug, slug))
    .limit(1);

  // Se não encontrou, tentar buscar pelo slug traduzido
  if (translatedResult.length === 0 && locale !== 'pt') {
    const translatedProductResult = await db
      .select({
        product: products,
        translation: productI18n,
      })
      .from(productI18n)
      .innerJoin(products, eq(products.id, productI18n.productId))
      .where(and(eq(productI18n.slug, slug), eq(productI18n.locale, locale)))
      .limit(1);

    if (translatedProductResult.length > 0) {
      translatedResult = translatedProductResult;
    }
  }

  if (translatedResult.length === 0) return null;

  const { product, translation } = translatedResult[0];
  if (!product) return null;

  // Usar dados traduzidos se disponíveis
  const productName = translation?.name || product.name;
  let productDescription = product.description || '';
  if (translation?.description && translation.description.trim() !== '') {
    productDescription = translation.description;
  } else if (locale !== 'pt') {
    const originalHasHtml = product.description && /<[^>]+>/.test(product.description);
    if (originalHasHtml) {
      productDescription = product.description || '';
    }
  }
  const productShortDescription = translation?.shortDescription || product.shortDescription || '';

  // 🔥 OTIMIZAÇÃO: Buscar categoria com tradução em 1 query
  let category = null;
  if (product.categoryId) {
    const catResult = await db
      .select({
        category: categories,
        translation: categoryI18n,
      })
      .from(categories)
      .leftJoin(
        categoryI18n,
        and(eq(categoryI18n.categoryId, categories.id), eq(categoryI18n.locale, locale))
      )
      .where(eq(categories.id, product.categoryId))
      .limit(1);

    if (catResult.length > 0) {
      const catTranslation = catResult[0].translation;
      category = catTranslation?.name || catResult[0].category?.name || null;
    }
  }

  // 🔥 OTIMIZAÇÃO: Buscar variações com traduções em 1 query - APENAS ATIVAS
  const variationsRaw = await db
    .select({
      variation: productVariations,
      translation: productVariationI18n,
    })
    .from(productVariations)
    .leftJoin(
      productVariationI18n,
      and(
        eq(productVariationI18n.variationId, productVariations.id),
        eq(productVariationI18n.locale, locale)
      )
    )
    .where(and(eq(productVariations.productId, product.id), eq(productVariations.isActive, true)))
    .orderBy(productVariations.sortOrder);

  const variations = variationsRaw.map(v => ({
    ...v.variation,
    translatedName: v.translation?.name || v.variation.name,
  }));

  const variationIds = variations.map(v => v.id);

  if (variationIds.length === 0) {
    // Produto sem variações - retornar básico
    const imagesResult = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id));

    const images =
      imagesResult.length > 0 ? imagesResult.map(img => img.url || '/file.svg') : ['/file.svg'];

    return {
      id: product.id,
      name: productName,
      slug: product.slug,
      description: productShortDescription,
      longDescription: productDescription,
      basePrice: 0,
      originalPrice: 0,
      hasPromotion: false,
      category: category || '',
      tags: [],
      images,
      variations: [],
    };
  }

  // 🔥 OTIMIZAÇÃO CRÍTICA: Buscar TODOS os dados relacionados em BATCH (4 queries fixas)
  const [allMappings, allValues, allAttrs, allFiles, allVariationImages, promotionsMap] =
    await Promise.all([
      // 1. Todos mappings de atributos (1 query com inArray)
      db
        .select()
        .from(variationAttributeValues)
        .where(inArray(variationAttributeValues.variationId, variationIds)),

      // 2. Todos valores de atributos (1 query)
      db.select().from(attributeValues),

      // 3. Todos atributos (1 query)
      db.select().from(attributes),

      // 4. Todos arquivos (1 query com inArray)
      db.select().from(files).where(inArray(files.variationId, variationIds)),

      // 5. Todas imagens das variações (1 query com inArray)
      db.select().from(productImages).where(inArray(productImages.variationId, variationIds)),

      // 6. Promoções ativas (cache em memória)
      getActivePromotions(),
    ]);

  const { variationPromotions, productPromotions, globalPromotion } = promotionsMap;

  // 🔥 Criar mapas para acesso O(1)
  const valuesMap = new Map(allValues.map(v => [v.id, v]));
  const attrsMap = new Map(allAttrs.map(a => [a.id, a]));
  const filesMap = new Map<string, typeof allFiles>();
  const imagesMap = new Map<string, typeof allVariationImages>();

  allFiles.forEach(f => {
    if (!f.variationId) return;
    if (!filesMap.has(f.variationId)) filesMap.set(f.variationId, []);
    filesMap.get(f.variationId)!.push(f);
  });

  allVariationImages.forEach(img => {
    if (!img.variationId) return;
    if (!imagesMap.has(img.variationId)) imagesMap.set(img.variationId, []);
    imagesMap.get(img.variationId)!.push(img);
  });

  // 🔥 Montar variações (tudo em memória - SEM queries extras)
  const variationsWithAttributes = variations.map(v => {
    const mappings = allMappings.filter(m => m.variationId === v.id);
    const valueDetails = mappings.map(m => {
      const val = valuesMap.get(m.valueId);
      const attr = attrsMap.get(m.attributeId);
      return {
        attributeId: m.attributeId,
        attributeName: attr?.name || null,
        valueId: m.valueId,
        value: val?.value || null,
        description: val?.description || null,
        sortOrder: val?.sortOrder || 0,
      };
    });

    const variationFiles = filesMap.get(v.id) || [];
    const variationImagesResult = imagesMap.get(v.id) || [];
    const variationImages = variationImagesResult.map(img => img.url || '/file.svg');

    // 🔥 Calcular promoção usando cache (Prioridade: variação > produto > global)
    const basePrice = Number(v.price);
    const promotion = 
      variationPromotions.get(v.id) || 
      productPromotions.get(product.id) || 
      globalPromotion || undefined;
    const priceInfo = calculatePromotionalPrice(basePrice, promotion);

    return {
      id: v.id,
      name: v.translatedName,
      price: priceInfo.finalPrice,
      originalPrice: priceInfo.originalPrice,
      hasPromotion: priceInfo.hasPromotion,
      discount: priceInfo.discount,
      promotion: priceInfo.promotion,
      description: v.slug,
      downloadLimit: 10,
      fileSize: '-',
      attributeValues: valueDetails,
      files: variationFiles.map(f => ({ id: f.id, path: f.path, name: f.name })),
      images: variationImages.length > 0 ? variationImages : undefined,
    };
  });

  // Buscar imagens principais do produto
  const imagesResult = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id));

  const images =
    imagesResult.length > 0 ? imagesResult.map(img => img.url || '/file.svg') : ['/file.svg'];

  // Calcular preços mínimos
  const basePrice =
    variationsWithAttributes.length > 0
      ? Math.min(...variationsWithAttributes.map(v => Number(v.price)))
      : 0;

  const originalPrice =
    variationsWithAttributes.length > 0
      ? Math.min(...variationsWithAttributes.map(v => Number(v.originalPrice)))
      : 0;

  const hasPromotion = variationsWithAttributes.some(v => v.hasPromotion);

  return {
    id: product.id,
    name: productName,
    slug: product.slug,
    description: productShortDescription,
    longDescription: productDescription,
    basePrice,
    originalPrice,
    hasPromotion,
    fileType: (product.fileType === 'png' ? 'png' : 'pdf') as 'pdf' | 'png',
    category: category || '',
    tags: [],
    images,
    variations: variationsWithAttributes,
  };
}
