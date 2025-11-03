import { db } from './index';
import { eq, and } from 'drizzle-orm';
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
} from './schema';

export async function getProductBySlug(slug: string, locale: string = 'pt') {
  // Busca produto principal com tradução
  // Tenta primeiro buscar pela tradução, depois fallback para slug original
  const translatedResult = await db
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

  if (translatedResult.length === 0) return null;

  const { product, translation } = translatedResult[0];
  if (!product) return null;

  // Usar dados traduzidos se disponíveis, senão fallback para original
  const productName = translation?.name || product.name;
  const productDescription = translation?.description || product.description || '';
  const productShortDescription = translation?.shortDescription || product.shortDescription || '';

  // Busca categoria com tradução
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

  // Busca variações do produto com traduções
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
    .where(eq(productVariations.productId, product.id));

  const variations = variationsRaw.map(v => ({
    ...v.variation,
    translatedName: v.translation?.name || v.variation.name,
  }));

  const variationIds = variations.map(v => v.id);

  // Busca TODOS os dados de uma vez (otimização N+1 → 4 queries fixas)
  const [allMappings, allValues, allAttrs, allFiles, allVariationImages] = await Promise.all([
    // 1. Todos os mappings de atributos para estas variações
    variationIds.length > 0
      ? Promise.all(
          variationIds.map(vId =>
            db
              .select()
              .from(variationAttributeValues)
              .where(eq(variationAttributeValues.variationId, vId))
          )
        ).then(results => results.flat())
      : Promise.resolve([]),

    // 2. Todos os valores de atributos
    db.select().from(attributeValues),

    // 3. Todos os atributos
    db.select().from(attributes),

    // 4. Todos os arquivos destas variações
    variationIds.length > 0
      ? Promise.all(
          variationIds.map(vId => db.select().from(files).where(eq(files.variationId, vId)))
        ).then(r => r.flat())
      : Promise.resolve([]),

    // 5. Todas as imagens das variações
    variationIds.length > 0
      ? Promise.all(
          variationIds.map(vId =>
            db.select().from(productImages).where(eq(productImages.variationId, vId))
          )
        ).then(r => r.flat())
      : Promise.resolve([]),
  ]);

  // Mapeia em objetos para acesso rápido O(1)
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

  // Monta variações com seus atributos (agora tudo em memória, sem queries extras)
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
      };
    });

    const variationFiles = filesMap.get(v.id) || [];
    const variationImagesResult = imagesMap.get(v.id) || [];

    const variationImages = variationImagesResult.map(img => {
      // Retornar URL do Cloudinary diretamente
      return img.url || '/file.svg';
    });

    return {
      id: v.id,
      name: v.translatedName, // Usar nome traduzido
      price: Number(v.price),
      description: v.slug,
      downloadLimit: 10,
      fileSize: '-',
      attributeValues: valueDetails,
      files: variationFiles.map(f => ({ id: f.id, path: f.path, name: f.name })),
      images: variationImages.length > 0 ? variationImages : undefined,
    };
  });

  // Busca imagens principais do produto (1 query)
  const imagesResult = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id));

  const images =
    imagesResult.length > 0
      ? imagesResult.map(img => {
          // Retornar URL do Cloudinary diretamente
          return img.url || '/file.svg';
        })
      : ['/file.svg'];

  return {
    id: product.id,
    name: productName, // Usar nome traduzido
    slug: product.slug,
    description: productShortDescription, // Usar descrição traduzida
    longDescription: productDescription, // Usar descrição longa traduzida
    basePrice: Number(product.price),
    category: category || '',
    tags: [],
    images,
    variations: variationsWithAttributes,
  };
}
