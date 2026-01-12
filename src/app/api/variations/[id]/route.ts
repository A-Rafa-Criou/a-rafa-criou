import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getActivePromotions,
  calculatePromotionalPrice as calculatePrice,
} from '@/lib/db/products';

// 🔥 Cache reduzido para detectar mudanças de promoção mais rápido
export const revalidate = 300; // 5 minutos

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Buscar variação
    const [variation] = await db
      .select()
      .from(productVariations)
      .where(eq(productVariations.id, id))
      .limit(1);

    if (!variation) {
      return NextResponse.json({ error: 'Variação não encontrada' }, { status: 404 });
    }

    // ✅ CALCULAR PREÇO COM PROMOÇÃO USANDO O MESMO SISTEMA DO PRODUTO
    const basePrice = Number(variation.price);
    const promotionsMap = await getActivePromotions();
    const { variationPromotions, productPromotions, globalPromotion } = promotionsMap;

    // Prioridade: variação > produto > global
    const promotion =
      variationPromotions.get(id) ||
      productPromotions.get(variation.productId) ||
      globalPromotion ||
      undefined;

    const priceInfo = calculatePrice(basePrice, promotion);

    // Limpar nome da promoção removendo data/hora
    const cleanPromotionName = (name: string) => {
      return name.replace(/\s*[-–—:]\s*\d{1,2}\/\d{1,2}[\s\S]*$/i, '').trim();
    };

    return NextResponse.json({
      id: variation.id,
      name: variation.name,
      price: priceInfo.finalPrice, // ✅ RETORNAR PREÇO PROMOCIONAL
      originalPrice: priceInfo.originalPrice,
      hasPromotion: priceInfo.hasPromotion,
      promotion: priceInfo.promotion
        ? {
            name: cleanPromotionName(priceInfo.promotion.name),
            discountType: priceInfo.promotion.discountType,
            discountValue: priceInfo.promotion.discountValue,
            startDate: priceInfo.promotion.startDate,
            endDate: priceInfo.promotion.endDate,
          }
        : undefined,
      slug: variation.slug,
      isActive: variation.isActive,
      sortOrder: variation.sortOrder,
    });
  } catch (error) {
    console.error('Erro ao buscar variação:', error);
    return NextResponse.json({ error: 'Erro ao buscar variação' }, { status: 500 });
  }
}
