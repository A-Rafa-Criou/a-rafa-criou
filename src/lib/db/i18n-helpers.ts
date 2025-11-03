import { db } from './index';
import {
  products,
  productI18n,
  productVariations,
  productVariationI18n,
  attributes,
  attributeI18n,
  attributeValues,
  attributeValueI18n,
  categories,
  categoryI18n,
} from './schema';
import { eq, and } from 'drizzle-orm';

/**
 * Busca um produto com tradução para o locale especificado
 * Fallback para o produto original se a tradução não existir
 */
export async function getProductWithTranslation(productId: string, locale: string = 'pt') {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);

  if (!product) return null;

  // Se for português, retorna direto
  if (locale === 'pt') {
    return product;
  }

  // Busca tradução
  const [translation] = await db
    .select()
    .from(productI18n)
    .where(and(eq(productI18n.productId, productId), eq(productI18n.locale, locale)))
    .limit(1);

  // Se tiver tradução, mescla com os dados originais
  if (translation) {
    return {
      ...product,
      name: translation.name,
      slug: translation.slug,
      description: translation.description,
      shortDescription: translation.shortDescription,
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
    };
  }

  // Fallback para o produto original
  return product;
}

/**
 * Busca uma variação com tradução
 */
export async function getVariationWithTranslation(variationId: string, locale: string = 'pt') {
  const [variation] = await db
    .select()
    .from(productVariations)
    .where(eq(productVariations.id, variationId))
    .limit(1);

  if (!variation) return null;

  if (locale === 'pt') {
    return variation;
  }

  const [translation] = await db
    .select()
    .from(productVariationI18n)
    .where(
      and(
        eq(productVariationI18n.variationId, variationId),
        eq(productVariationI18n.locale, locale)
      )
    )
    .limit(1);

  if (translation) {
    return {
      ...variation,
      name: translation.name,
      slug: translation.slug,
    };
  }

  return variation;
}

/**
 * Busca um atributo com tradução
 */
export async function getAttributeWithTranslation(attributeId: string, locale: string = 'pt') {
  const [attribute] = await db
    .select()
    .from(attributes)
    .where(eq(attributes.id, attributeId))
    .limit(1);

  if (!attribute) return null;

  if (locale === 'pt') {
    return attribute;
  }

  const [translation] = await db
    .select()
    .from(attributeI18n)
    .where(and(eq(attributeI18n.attributeId, attributeId), eq(attributeI18n.locale, locale)))
    .limit(1);

  if (translation) {
    return {
      ...attribute,
      name: translation.name,
      slug: translation.slug,
    };
  }

  return attribute;
}

/**
 * Busca um valor de atributo com tradução
 */
export async function getAttributeValueWithTranslation(valueId: string, locale: string = 'pt') {
  const [value] = await db
    .select()
    .from(attributeValues)
    .where(eq(attributeValues.id, valueId))
    .limit(1);

  if (!value) return null;

  if (locale === 'pt') {
    return value;
  }

  const [translation] = await db
    .select()
    .from(attributeValueI18n)
    .where(and(eq(attributeValueI18n.valueId, valueId), eq(attributeValueI18n.locale, locale)))
    .limit(1);

  if (translation) {
    return {
      ...value,
      value: translation.value,
      slug: translation.slug,
    };
  }

  return value;
}

/**
 * Busca uma categoria com tradução
 */
export async function getCategoryWithTranslation(categoryId: string, locale: string = 'pt') {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (!category) return null;

  if (locale === 'pt') {
    return category;
  }

  const [translation] = await db
    .select()
    .from(categoryI18n)
    .where(and(eq(categoryI18n.categoryId, categoryId), eq(categoryI18n.locale, locale)))
    .limit(1);

  if (translation) {
    return {
      ...category,
      name: translation.name,
      slug: translation.slug,
      description: translation.description,
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
    };
  }

  return category;
}

/**
 * Busca múltiplos produtos com tradução
 */
export async function getProductsWithTranslation(productIds: string[], locale: string = 'pt') {
  const productsData = await db
    .select()
    .from(products)
    .where(eq(products.id, productIds.length > 0 ? productIds[0] : ''));

  if (locale === 'pt') {
    return productsData;
  }

  const translations = await db.select().from(productI18n).where(eq(productI18n.locale, locale));

  const translationMap = new Map(translations.map(t => [t.productId, t]));

  return productsData.map(product => {
    const translation = translationMap.get(product.id);
    if (translation) {
      return {
        ...product,
        name: translation.name,
        slug: translation.slug,
        description: translation.description,
        shortDescription: translation.shortDescription,
        seoTitle: translation.seoTitle,
        seoDescription: translation.seoDescription,
      };
    }
    return product;
  });
}

/**
 * Tipo helper para atributo traduzido
 */
export type TranslatedAttribute = {
  id: string;
  name: string;
  value: string;
};

/**
 * Traduz um array de atributos (como os do carrinho)
 */
export async function translateAttributes(
  attributes: Array<{ name: string; value: string }>,
  locale: string = 'pt'
): Promise<TranslatedAttribute[]> {
  if (locale === 'pt' || attributes.length === 0) {
    return attributes.map((attr, idx) => ({
      id: `${idx}`,
      name: attr.name,
      value: attr.value,
    }));
  }

  try {
    // Busca todos os atributos e valores traduzidos de uma vez
    const [attrTranslations, valueTranslations] = await Promise.all([
      db.select().from(attributeI18n).where(eq(attributeI18n.locale, locale)),
      db.select().from(attributeValueI18n).where(eq(attributeValueI18n.locale, locale)),
    ]);

    // Cria mapas para lookup rápido
    const attrMap = new Map(attrTranslations.map(t => [t.name, t.name]));
    const valueMap = new Map(valueTranslations.map(t => [t.value, t.value]));

    return attributes.map((attr, idx) => ({
      id: `${idx}`,
      name: attrMap.get(attr.name) || attr.name,
      value: valueMap.get(attr.value) || attr.value,
    }));
  } catch (error) {
    // Fallback: retorna em português se as tabelas não existirem
    console.warn('Translation tables not found, using fallback:', error);
    return attributes.map((attr, idx) => ({
      id: `${idx}`,
      name: attr.name,
      value: attr.value,
    }));
  }
}
