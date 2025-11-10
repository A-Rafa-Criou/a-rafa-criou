import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { promotions, promotionProducts, promotionVariations } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

// Schema de validação
const promotionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive('Valor deve ser positivo'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  isActive: z.boolean().default(true),
  appliesTo: z.enum(['all', 'specific']),
  productIds: z.array(z.string()).optional(),
  variationIds: z.array(z.string()).optional(),
});

// GET - Listar todas as promoções
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const allPromotions = await db.select().from(promotions).orderBy(desc(promotions.createdAt));

    // Para cada promoção, buscar produtos e variações associadas
    const promotionsWithDetails = await Promise.all(
      allPromotions.map(async promo => {
        const products = await db
          .select({ productId: promotionProducts.productId })
          .from(promotionProducts)
          .where(eq(promotionProducts.promotionId, promo.id));

        const variations = await db
          .select({ variationId: promotionVariations.variationId })
          .from(promotionVariations)
          .where(eq(promotionVariations.promotionId, promo.id));

        return {
          ...promo,
          productIds: products.map(p => p.productId),
          variationIds: variations.map(v => v.variationId),
        };
      })
    );

    return NextResponse.json(promotionsWithDetails);
  } catch (error) {
    console.error('Erro ao buscar promoções:', error);
    return NextResponse.json({ error: 'Erro ao buscar promoções' }, { status: 500 });
  }
}

// POST - Criar nova promoção
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = promotionSchema.parse(body);

    // Criar a promoção
    const [newPromotion] = await db
      .insert(promotions)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        discountType: validatedData.discountType,
        discountValue: validatedData.discountValue.toString(),
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        isActive: validatedData.isActive,
        appliesTo: validatedData.appliesTo,
      })
      .returning();

    // Se for específica, associar produtos e variações
    if (validatedData.appliesTo === 'specific') {
      if (validatedData.productIds && validatedData.productIds.length > 0) {
        await db.insert(promotionProducts).values(
          validatedData.productIds.map(productId => ({
            promotionId: newPromotion.id,
            productId,
          }))
        );
      }

      if (validatedData.variationIds && validatedData.variationIds.length > 0) {
        await db.insert(promotionVariations).values(
          validatedData.variationIds.map(variationId => ({
            promotionId: newPromotion.id,
            variationId,
          }))
        );
      }
    }

    return NextResponse.json(
      { message: 'Promoção criada com sucesso', promotion: newPromotion },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar promoção:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Erro ao criar promoção' }, { status: 500 });
  }
}
