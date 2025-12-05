/**
 * API para salvar nova ordem dos produtos após drag-and-drop
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { productDisplayOrder } from '@/lib/db/schema';
import { z } from 'zod';

const reorderSchema = z.object({
  products: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().positive(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação de admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { products: productsOrder } = reorderSchema.parse(body);

    console.log(`💾 Salvando nova ordem para ${productsOrder.length} produtos`);

    // Salvar ordem usando upsert (INSERT ... ON CONFLICT UPDATE)
    for (const item of productsOrder) {
      await db
        .insert(productDisplayOrder)
        .values({
          productId: item.id,
          displayOrder: item.displayOrder,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: productDisplayOrder.productId,
          set: {
            displayOrder: item.displayOrder,
            updatedAt: new Date(),
          },
        });
    }

    console.log('✅ Ordem salva com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Ordem dos produtos atualizada com sucesso',
      count: productsOrder.length,
    });
  } catch (error) {
    console.error('❌ Erro ao salvar ordem:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Erro ao salvar ordem dos produtos' }, { status: 500 });
  }
}
