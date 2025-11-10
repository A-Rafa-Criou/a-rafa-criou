import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attributeValues } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { attributeId: string } }
) {
  try {
    const body = await request.json();
    const { orderedValueIds } = body;

    if (!Array.isArray(orderedValueIds)) {
      return NextResponse.json(
        { error: 'orderedValueIds must be an array' },
        { status: 400 }
      );
    }

    // Atualizar sortOrder de cada valor
    await Promise.all(
      orderedValueIds.map((valueId: string, index: number) =>
        db
          .update(attributeValues)
          .set({ sortOrder: index })
          .where(eq(attributeValues.id, valueId))
      )
    );

    return NextResponse.json({ ok: true, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating attribute values order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
