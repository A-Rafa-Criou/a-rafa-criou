import { db } from '@/lib/db';
import { promotions, promotionProducts, promotionVariations } from '@/lib/db/schema';
import { eq, and, lte, gte, desc } from 'drizzle-orm';
import { getBrazilianTime } from '@/lib/brazilian-time';

export interface ActivePromotion {
  id: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: Date;
  endDate: Date;
}

export interface PriceWithPromotion {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  hasPromotion: boolean;
  promotion?: ActivePromotion;
}

/**
 * Busca a melhor promoção ativa para um produto
 */
export async function getActivePromotionForProduct(
  productId: string
): Promise<ActivePromotion | null> {
  const now = getBrazilianTime();

  // Buscar promoções aplicáveis ao produto específico
  const productPromotions = await db
    .select({
      id: promotions.id,
      name: promotions.name,
      discountType: promotions.discountType,
      discountValue: promotions.discountValue,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
    })
    .from(promotions)
    .innerJoin(promotionProducts, eq(promotions.id, promotionProducts.promotionId))
    .where(
      and(
        eq(promotionProducts.productId, productId),
        eq(promotions.isActive, true),
        lte(promotions.startDate, now),
        gte(promotions.endDate, now)
      )
    )
    .orderBy(desc(promotions.discountValue))
    .limit(1);

  if (productPromotions.length > 0) {
    const promo = productPromotions[0];
    return {
      ...promo,
      discountValue: Number(promo.discountValue),
      discountType: promo.discountType as 'percentage' | 'fixed',
    };
  }

  // Buscar promoções globais (applies_to = 'all')
  const globalPromotions = await db
    .select({
      id: promotions.id,
      name: promotions.name,
      discountType: promotions.discountType,
      discountValue: promotions.discountValue,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
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

  if (globalPromotions.length > 0) {
    const promo = globalPromotions[0];
    return {
      ...promo,
      discountValue: Number(promo.discountValue),
      discountType: promo.discountType as 'percentage' | 'fixed',
    };
  }

  return null;
}

/**
 * Busca a melhor promoção ativa para uma variação
 */
export async function getActivePromotionForVariation(
  variationId: string
): Promise<ActivePromotion | null> {
  const now = getBrazilianTime();

  // Buscar promoções aplicáveis à variação específica
  const variationPromotions = await db
    .select({
      id: promotions.id,
      name: promotions.name,
      discountType: promotions.discountType,
      discountValue: promotions.discountValue,
      startDate: promotions.startDate,
      endDate: promotions.endDate,
    })
    .from(promotions)
    .innerJoin(promotionVariations, eq(promotions.id, promotionVariations.promotionId))
    .where(
      and(
        eq(promotionVariations.variationId, variationId),
        eq(promotions.isActive, true),
        lte(promotions.startDate, now),
        gte(promotions.endDate, now)
      )
    )
    .orderBy(desc(promotions.discountValue))
    .limit(1);

  if (variationPromotions.length > 0) {
    const promo = variationPromotions[0];
    return {
      ...promo,
      discountValue: Number(promo.discountValue),
      discountType: promo.discountType as 'percentage' | 'fixed',
    };
  }

  return null;
}

/**
 * Calcula o preço final com promoção aplicada
 */
export function calculatePromotionalPrice(
  originalPrice: number,
  promotion: ActivePromotion | null
): PriceWithPromotion {
  if (!promotion) {
    return {
      originalPrice,
      finalPrice: originalPrice,
      discount: 0,
      hasPromotion: false,
    };
  }

  let discount = 0;
  let finalPrice = originalPrice;

  if (promotion.discountType === 'percentage') {
    discount = (originalPrice * Number(promotion.discountValue)) / 100;
    finalPrice = originalPrice - discount;
  } else if (promotion.discountType === 'fixed') {
    discount = Number(promotion.discountValue);
    finalPrice = Math.max(0, originalPrice - discount);
  }

  return {
    originalPrice,
    finalPrice: Math.round(finalPrice * 100) / 100, // Arredondar para 2 decimais
    discount: Math.round(discount * 100) / 100,
    hasPromotion: true,
    promotion,
  };
}

/**
 * Calcula preço com promoção para um produto
 */
export async function getProductPriceWithPromotion(
  productId: string,
  basePrice: number
): Promise<PriceWithPromotion> {
  const promotion = await getActivePromotionForProduct(productId);
  return calculatePromotionalPrice(basePrice, promotion);
}

/**
 * Calcula preço com promoção para uma variação
 */
export async function getVariationPriceWithPromotion(
  variationId: string,
  basePrice: number
): Promise<PriceWithPromotion> {
  const promotion = await getActivePromotionForVariation(variationId);
  return calculatePromotionalPrice(basePrice, promotion);
}

/**
 * Converte preço para moeda específica com promoção aplicada
 */
export async function convertPriceWithPromotion(
  price: number,
  fromCurrency: string,
  toCurrency: string,
  promotion: ActivePromotion | null
): Promise<PriceWithPromotion> {
  // Aplicar promoção primeiro
  const priceWithPromo = calculatePromotionalPrice(price, promotion);

  // Se não precisa converter, retornar direto
  if (fromCurrency === toCurrency) {
    return priceWithPromo;
  }

  // Taxas de conversão fixas (você pode implementar API de conversão dinâmica)
  const rates: Record<string, Record<string, number>> = {
    BRL: { USD: 0.2, EUR: 0.18 },
    USD: { BRL: 5.0, EUR: 0.92 },
    EUR: { BRL: 5.5, USD: 1.09 },
  };

  const rate = rates[fromCurrency]?.[toCurrency] ?? 1;

  return {
    originalPrice: priceWithPromo.originalPrice * rate,
    finalPrice: Math.round(priceWithPromo.finalPrice * rate * 100) / 100,
    discount: priceWithPromo.discount * rate,
    hasPromotion: priceWithPromo.hasPromotion,
    promotion: priceWithPromo.promotion,
  };
}
