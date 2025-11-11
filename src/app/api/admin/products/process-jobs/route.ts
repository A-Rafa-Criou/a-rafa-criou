import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  productJobs,
  products,
  productI18n,
  productVariations,
  productVariationI18n,
} from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { translateProduct, translateVariation, generateSlug } from '@/lib/deepl';

// Processar jobs pendentes (traduzir produtos)
export async function POST() {
  try {
    // limitar número de jobs por execução para evitar timeouts
    const MAX_JOBS = 3;

    // Buscar jobs pendentes em ordem de criação
    const jobs = await db
      .select()
      .from(productJobs)
      .where(eq(productJobs.status, 'pending'))
      .orderBy(asc(productJobs.createdAt))
      .limit(MAX_JOBS);

    if (jobs.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;

    for (const job of jobs) {
      // Tentar claim do job: atualizar status para processing (optimistic)
      const [updated] = await db
        .update(productJobs)
        .set({ status: 'processing' })
        .where(eq(productJobs.id, job.id))
        .returning();

      if (!updated) continue; // já processado por outro worker

      try {
        const payload = JSON.parse(job.payload || '{}');

        if (job.type === 'translate_product' && payload.productId) {
          const productId = payload.productId;

          // Buscar produto e variações
          const [p] = await db.select().from(products).where(eq(products.id, productId));
          if (!p) throw new Error('Produto não encontrado: ' + productId);

          // Traduzir para EN e ES (paralelo)
          const [en, es] = await Promise.all([
            translateProduct(
              {
                name: p.name,
                description: p.description || null,
                shortDescription: p.shortDescription || null,
              },
              'EN',
              'PT'
            ),
            translateProduct(
              {
                name: p.name,
                description: p.description || null,
                shortDescription: p.shortDescription || null,
              },
              'ES',
              'PT'
            ),
          ]);

          // Inserir i18n em batch (EN + ES)
          await db
            .insert(productI18n)
            .values([
              {
                productId,
                locale: 'en',
                name: en.name,
                slug: generateSlug(en.name),
                description: en.description,
                shortDescription: en.shortDescription,
                seoTitle: en.name,
                seoDescription: en.description,
              },
              {
                productId,
                locale: 'es',
                name: es.name,
                slug: generateSlug(es.name),
                description: es.description,
                shortDescription: es.shortDescription,
                seoTitle: es.name,
                seoDescription: es.description,
              },
            ])
            .onConflictDoNothing();

          // Traduzir variações
          const variations = await db
            .select()
            .from(productVariations)
            .where(eq(productVariations.productId, productId));
          if (variations && variations.length > 0) {
            const varI18n: { variationId: string; locale: string; name: string; slug: string }[] =
              [];
            for (const v of variations) {
              const [ven, ves] = await Promise.all([
                translateVariation({ name: v.name }, 'EN', 'PT'),
                translateVariation({ name: v.name }, 'ES', 'PT'),
              ]);

              varI18n.push({
                variationId: v.id,
                locale: 'en',
                name: ven.name,
                slug: generateSlug(ven.name),
              });
              varI18n.push({
                variationId: v.id,
                locale: 'es',
                name: ves.name,
                slug: generateSlug(ves.name),
              });
            }

            if (varI18n.length > 0) {
              await db.insert(productVariationI18n).values(varI18n).onConflictDoNothing();
            }
          }
        }

        // marcar job como done
        await db
          .update(productJobs)
          .set({ status: 'done', updatedAt: new Date() })
          .where(eq(productJobs.id, job.id));
        processed++;
      } catch (err) {
        console.error('Erro processando job', job.id, err);
        // incrementar attempts e marcar failed
        await db
          .update(productJobs)
          .set({
            status: 'failed',
            attempts: (job.attempts || 0) + 1,
            error: String(err),
            updatedAt: new Date(),
          })
          .where(eq(productJobs.id, job.id));
      }
    }

    return NextResponse.json({ processed });
  } catch (error) {
    console.error('Erro ao processar jobs:', error);
    return NextResponse.json({ error: 'Erro ao processar jobs' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
