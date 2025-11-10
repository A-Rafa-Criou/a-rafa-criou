import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { attributeValues } from '@/lib/db/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: { attributeId: string } }
) {
  try {
    const { attributeId } = params;
    const body = await request.json();
    const { value, description } = body;

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    // Generate slug
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Insert new value
    const [newValue] = await db
      .insert(attributeValues)
      .values({
        attributeId,
        value: value.trim(),
        slug,
        description: description || null,
      })
      .returning();

    return NextResponse.json(newValue, { status: 201 });
  } catch (error) {
    console.error('Error adding attribute value:', error);
    return NextResponse.json(
      { error: 'Failed to add attribute value' },
      { status: 500 }
    );
  }
}
