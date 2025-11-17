import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { productI18n, products } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

async function checkTranslations() {
  console.log('🔍 Verificando traduções ES no banco...\n');

  // Buscar produtos específicos
  const productSlugs = [
    'lembrancinha-para-os-indicadores',
    'lembrancinha-televiso-broadcasting',
    'lembrancinha-para-os-irmaos-do-audio-e-video',
    'lembrancinha-para-limpeza-do-salo-do-reino',
  ];

  for (const slug of productSlugs) {
    const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);

    if (product) {
      const translations = await db
        .select()
        .from(productI18n)
        .where(eq(productI18n.productId, product.id));

      console.log(`\n📦 ${product.name}`);
      console.log(`   Slug PT: ${product.slug}`);

      const esTranslation = translations.find(t => t.locale === 'es');
      if (esTranslation) {
        console.log(`   ✅ ES: ${esTranslation.name}`);
        console.log(`   Slug ES: ${esTranslation.slug}`);
      } else {
        console.log(`   ❌ Sem tradução ES`);
      }
    } else {
      console.log(`\n❌ Produto não encontrado: ${slug}`);
    }
  }

  process.exit(0);
}

checkTranslations().catch(console.error);
