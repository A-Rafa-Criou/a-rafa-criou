import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  variationAttributeValues,
  attributes,
  attributeValues,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar atributos da variação
    const variationAttrs = await db
      .select({
        attributeName: attributes.name,
        attributeValue: attributeValues.value,
      })
      .from(variationAttributeValues)
      .innerJoin(attributes, eq(variationAttributeValues.attributeId, attributes.id))
      .innerJoin(attributeValues, eq(variationAttributeValues.valueId, attributeValues.id))
      .where(eq(variationAttributeValues.variationId, id));

    const formattedAttributes = variationAttrs.map(attr => ({
      name: attr.attributeName,
      value: attr.attributeValue,
    }));

    return NextResponse.json({
      attributes: formattedAttributes,
    });
  } catch (error) {
    console.error('Erro ao buscar atributos da variação:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar atributos', attributes: [] },
      { status: 200 } // Retorna 200 com array vazio para não quebrar o frontend
    );
  }
}
