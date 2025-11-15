/**
 * Script para traduzir TODOS os produtos (name, description, shortDescription) para EN e ES
 * Salva nas tabelas product_i18n
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { products, productI18n } from '../src/lib/db/schema';
import { translateProduct, generateSlug } from '../src/lib/deepl';
import { eq } from 'drizzle-orm';

// Carregar .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🌐 Traduzindo TODOS os produtos para EN e ES...\n');

  // Buscar TODOS os produtos ativos
  const allProducts = await db.select().from(products).where(eq(products.isActive, true));

  console.log(`📦 ${allProducts.length} produtos encontrados\n`);

  let translated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of allProducts) {
    console.log(`\n📦 Produto: ${product.name} (ID: ${product.id})`);

    // Verificar se já tem traduções
    const existing = await db
      .select()
      .from(productI18n)
      .where(eq(productI18n.productId, product.id));

    const hasEN = existing.some(t => t.locale === 'en');
    const hasES = existing.some(t => t.locale === 'es');

    if (hasEN && hasES) {
      console.log('  ✅ Já possui traduções EN e ES - pulando');
      skipped++;
      continue;
    }

    // Traduzir EN
    if (!hasEN) {
      console.log('  🇺🇸 Traduzindo para EN...');
      try {
        const enTranslation = await translateProduct(
          {
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription,
          },
          'EN'
        );

        const slug = generateSlug(enTranslation.name);

        await db.insert(productI18n).values({
          productId: product.id,
          locale: 'en',
          name: enTranslation.name,
          description: enTranslation.description || null,
          shortDescription: enTranslation.shortDescription || null,
          slug,
        });

        console.log(`     ✅ EN: ${enTranslation.name}`);
        await new Promise(r => setTimeout(r, 500)); // Evitar rate limit DeepL
      } catch (error) {
        console.error('     ❌ Erro EN:', error);
        errors++;
      }
    }

    // Traduzir ES
    if (!hasES) {
      console.log('  🇪🇸 Traduzindo para ES...');
      try {
        const esTranslation = await translateProduct(
          {
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription,
          },
          'ES'
        );

        const slug = generateSlug(esTranslation.name);

        await db.insert(productI18n).values({
          productId: product.id,
          locale: 'es',
          name: esTranslation.name,
          description: esTranslation.description || null,
          shortDescription: esTranslation.shortDescription || null,
          slug,
        });

        console.log(`     ✅ ES: ${esTranslation.name}`);
        await new Promise(r => setTimeout(r, 500)); // Evitar rate limit DeepL
      } catch (error) {
        console.error('     ❌ Erro ES:', error);
        errors++;
      }
    }

    translated++;
  }

  console.log('\n\n✅ CONCLUÍDO!');
  console.log(`   Traduzidos: ${translated}`);
  console.log(`   Pulados: ${skipped}`);
  console.log(`   Erros: ${errors}`);
  console.log(`   Total: ${allProducts.length}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
