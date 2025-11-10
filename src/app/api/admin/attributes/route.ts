import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { 
  attributes, 
  attributeValues, 
  variationAttributeValues,
  productVariations,
  productImages,
  files,
} from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { deleteImageFromCloudinary } from '@/lib/cloudinary';
import { deleteFromR2 } from '@/lib/r2-utils';

const createAttributeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  values: z.array(z.object({ value: z.string().min(1), slug: z.string().min(1) })).optional(),
});

const addValueSchema = z.object({
  attributeId: z.string().min(1),
  value: z.string().min(1),
  slug: z.string().min(1),
});

// GET - Buscar todos os atributos com valores
export async function GET() {
  const attrs = await db.select().from(attributes).orderBy(attributes.name).execute();
  const ids = attrs.map(a => a.id);
  const vals = ids.length
    ? await db
        .select()
        .from(attributeValues)
        .where(inArray(attributeValues.attributeId, ids))
        .orderBy(attributeValues.sortOrder)
        .execute()
    : [];

  const byAttr = new Map<string, Array<Record<string, unknown>>>();
  for (const v of vals) {
    const aId = v.attributeId as string;
    if (!byAttr.has(aId)) byAttr.set(aId, []);
    byAttr.get(aId)!.push(v);
  }

  const result = attrs.map(a => ({ ...a, values: byAttr.get(a.id) ?? [] }));
  return NextResponse.json(result);
}

// POST - Criar novo atributo OU adicionar valor a existente
export async function POST(req: Request) {
  const body = await req.json();

  // Se contém attributeId, é para adicionar valor a atributo existente
  if (body.attributeId) {
    const parse = addValueSchema.safeParse(body);
    if (!parse.success) return NextResponse.json({ error: parse.error.format() }, { status: 400 });

    const { attributeId, value, slug } = parse.data;

    // Verificar se valor já existe
    const existing = await db
      .select()
      .from(attributeValues)
      .where(eq(attributeValues.attributeId, attributeId))
      .execute();

    const valueExists = existing.some(v => v.slug === slug);
    if (valueExists) {
      return NextResponse.json(
        { error: 'Este valor já existe para este atributo' },
        { status: 400 }
      );
    }

    // Calcular próximo sortOrder
    const maxSortOrder =
      existing.length > 0 ? Math.max(...existing.map(v => v.sortOrder || 0)) : -1;

    // Inserir novo valor com sortOrder
    const [inserted] = await db
      .insert(attributeValues)
      .values({
        attributeId,
        value,
        slug,
        sortOrder: maxSortOrder + 1,
      })
      .returning();

    return NextResponse.json({ ok: true, value: inserted });
  }

  // Criar novo atributo
  const parse = createAttributeSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: parse.error.format() }, { status: 400 });

  const { name, slug, values } = parse.data;

  // Verificar se atributo já existe
  const existingAttr = await db
    .select()
    .from(attributes)
    .where(eq(attributes.slug, slug))
    .execute();

  if (existingAttr.length > 0) {
    return NextResponse.json(
      { error: 'Atributo com este nome já existe', existingId: existingAttr[0].id },
      { status: 400 }
    );
  }

  const [inserted] = await db.insert(attributes).values({ name, slug }).returning();

  let insertedValues: (typeof attributeValues.$inferSelect)[] = [];
  if (values && values.length) {
    // Adicionar sortOrder sequencial aos valores iniciais
    const toInsert = values.map((v, index) => ({
      attributeId: inserted.id,
      value: v.value,
      slug: v.slug,
      sortOrder: index,
    }));
    insertedValues = await db.insert(attributeValues).values(toInsert).returning();
  }

  // Retornar atributo completo com valores
  return NextResponse.json({
    id: inserted.id,
    name: inserted.name,
    slug: inserted.slug,
    values: insertedValues,
  });
}

// DELETE - Deletar atributo completo OU valor individual
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const attributeId = searchParams.get('attributeId');
    const valueId = searchParams.get('valueId');

    // Caso 1: Deletar valor individual
    if (valueId) {
      // IMPORTANTE: Antes de deletar o valor, precisamos deletar as variações que o usam
      // 1. Encontrar todas as variações que usam esse valor
      const variationsUsingValue = await db
        .select({ variationId: variationAttributeValues.variationId })
        .from(variationAttributeValues)
        .where(eq(variationAttributeValues.valueId, valueId))
        .execute();

      const variationIds = [...new Set(variationsUsingValue.map(v => v.variationId))];

      // 2. Para cada variação, deletar imagens, arquivos e a variação
      for (const varId of variationIds) {
        // 2a. Buscar e deletar imagens do Cloudinary + DB
        const images = await db
          .select()
          .from(productImages)
          .where(eq(productImages.variationId, varId))
          .execute();

        for (const img of images) {
          // Deletar do Cloudinary se tiver cloudinaryId
          if (img.cloudinaryId) {
            try {
              await deleteImageFromCloudinary(img.cloudinaryId);
            } catch (err) {
              console.error('Erro ao deletar imagem do Cloudinary:', err);
            }
          }
          // Deletar do DB
          await db.delete(productImages).where(eq(productImages.id, img.id));
        }

        // 2b. Buscar e deletar arquivos do R2 + DB
        const filesData = await db
          .select()
          .from(files)
          .where(eq(files.variationId, varId))
          .execute();

        for (const file of filesData) {
          // Deletar do R2
          if (file.path) {
            try {
              await deleteFromR2(file.path);
            } catch (err) {
              console.error('Erro ao deletar arquivo do R2:', err);
            }
          }
          // Deletar do DB
          await db.delete(files).where(eq(files.id, file.id));
        }

        // 2c. Deletar a variação (cascade vai deletar variationAttributeValues)
        await db.delete(productVariations).where(eq(productVariations.id, varId));
      }

      // 3. Agora deletar o valor do atributo
      const deleted = await db
        .delete(attributeValues)
        .where(eq(attributeValues.id, valueId))
        .returning();

      if (deleted.length === 0) {
        return NextResponse.json({ error: 'Valor não encontrado' }, { status: 404 });
      }

      return NextResponse.json({ 
        ok: true, 
        message: 'Valor deletado com sucesso',
        deletedVariations: variationIds.length,
      });
    }

    // Caso 2: Deletar atributo completo (e todos os valores)
    if (attributeId) {
      // Buscar todos os valores deste atributo
      const attrValues = await db
        .select()
        .from(attributeValues)
        .where(eq(attributeValues.attributeId, attributeId))
        .execute();

      // Para cada valor, executar a limpeza completa
      for (const value of attrValues) {
        // Reusar a lógica de deletar valor individual
        const variationsUsingValue = await db
          .select({ variationId: variationAttributeValues.variationId })
          .from(variationAttributeValues)
          .where(eq(variationAttributeValues.valueId, value.id))
          .execute();

        const variationIds = [...new Set(variationsUsingValue.map(v => v.variationId))];

        for (const varId of variationIds) {
          // Deletar imagens
          const images = await db
            .select()
            .from(productImages)
            .where(eq(productImages.variationId, varId))
            .execute();

          for (const img of images) {
            if (img.cloudinaryId) {
              try {
                await deleteImageFromCloudinary(img.cloudinaryId);
              } catch (err) {
                console.error('Erro ao deletar imagem:', err);
              }
            }
            await db.delete(productImages).where(eq(productImages.id, img.id));
          }

          // Deletar arquivos
          const filesData = await db
            .select()
            .from(files)
            .where(eq(files.variationId, varId))
            .execute();

          for (const file of filesData) {
            if (file.path) {
              try {
                await deleteFromR2(file.path);
              } catch (err) {
                console.error('Erro ao deletar arquivo:', err);
              }
            }
            await db.delete(files).where(eq(files.id, file.id));
          }

          // Deletar variação
          await db.delete(productVariations).where(eq(productVariations.id, varId));
        }
      }

      // Deletar todos os valores do atributo
      await db
        .delete(attributeValues)
        .where(eq(attributeValues.attributeId, attributeId))
        .execute();

      // Depois deletar o atributo
      const deleted = await db.delete(attributes).where(eq(attributes.id, attributeId)).returning();

      if (deleted.length === 0) {
        return NextResponse.json({ error: 'Atributo não encontrado' }, { status: 404 });
      }

      return NextResponse.json({ ok: true, message: 'Atributo deletado com sucesso' });
    }

    return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}
