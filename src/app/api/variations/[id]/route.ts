import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getActivePromotionForVariation, calculatePromotionalPrice } from '@/lib/promotions';

// 🔥 Cache alinhado com ISR da página de produto
export const revalidate = 3600; // 1 hora

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

    // ✅ CALCULAR PREÇO COM PROMOÇÃO
    const basePrice = Number(variation.price);
    const promotion = await getActivePromotionForVariation(id);
    const priceInfo = calculatePromotionalPrice(basePrice, promotion);

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
