import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { promotions, promotionProducts, promotionVariations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const promotionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().positive('Valor deve ser positivo').optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  isActive: z.boolean().optional(),
  appliesTo: z.enum(['all', 'specific']).optional(),
  productIds: z.array(z.string()).optional(),
  variationIds: z.array(z.string()).optional(),
});

// GET - Buscar promoção específica
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const [promotion] = await db.select().from(promotions).where(eq(promotions.id, id));

    if (!promotion) {
      return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 });
    }

    // Buscar produtos e variações associadas
    const products = await db
      .select({ productId: promotionProducts.productId })
      .from(promotionProducts)
      .where(eq(promotionProducts.promotionId, id));

    const variations = await db
      .select({ variationId: promotionVariations.variationId })
      .from(promotionVariations)
      .where(eq(promotionVariations.promotionId, id));

    return NextResponse.json({
      ...promotion,
      productIds: products.map(p => p.productId),
      variationIds: variations.map(v => v.variationId),
    });
  } catch (error) {
    console.error('Erro ao buscar promoção:', error);
    return NextResponse.json({ error: 'Erro ao buscar promoção' }, { status: 500 });
  }
}

// PUT - Atualizar promoção
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = promotionSchema.parse(body);

    // Atualizar a promoção
    const updateData: Record<string, unknown> = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.discountType) updateData.discountType = validatedData.discountType;
    if (validatedData.discountValue)
      updateData.discountValue = validatedData.discountValue.toString();
    if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate) updateData.endDate = new Date(validatedData.endDate);
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.appliesTo) updateData.appliesTo = validatedData.appliesTo;

    await db.update(promotions).set(updateData).where(eq(promotions.id, id));

    // Se mudou para específica ou atualizou produtos/variações, recriar associações
    if (
      validatedData.appliesTo === 'specific' ||
      validatedData.productIds ||
      validatedData.variationIds
    ) {
      // Remover associações antigas
      await db.delete(promotionProducts).where(eq(promotionProducts.promotionId, id));
      await db.delete(promotionVariations).where(eq(promotionVariations.promotionId, id));

      // Criar novas associações
      if (validatedData.productIds && validatedData.productIds.length > 0) {
        await db.insert(promotionProducts).values(
          validatedData.productIds.map(productId => ({
            promotionId: id,
            productId,
          }))
        );
      }

      if (validatedData.variationIds && validatedData.variationIds.length > 0) {
        await db.insert(promotionVariations).values(
          validatedData.variationIds.map(variationId => ({
            promotionId: id,
            variationId,
          }))
        );
      }
    }

    return NextResponse.json({ message: 'Promoção atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar promoção:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Erro ao atualizar promoção' }, { status: 500 });
  }
}

// DELETE - Remover promoção
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Deletar promoção (cascata vai remover associações)
    await db.delete(promotions).where(eq(promotions.id, id));

    return NextResponse.json({ message: 'Promoção removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover promoção:', error);
    return NextResponse.json({ error: 'Erro ao remover promoção' }, { status: 500 });
  }
}
