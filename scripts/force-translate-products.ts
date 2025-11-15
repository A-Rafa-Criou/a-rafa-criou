/**
 * Script para FORÇAR tradução de TODOS os produtos (ignora verificação de traduções existentes)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { products, productI18n } from '../src/lib/db/schema';
import { translateProduct, generateSlug } from '../src/lib/deepl';
import { eq } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🌐 FORÇANDO tradução de TODOS os produtos...\n');

  const allProducts = await db.select().from(products).where(eq(products.isActive, true));

  console.log(`📦 ${allProducts.length} produtos encontrados\n`);

  let translated = 0;
  let errors = 0;

  for (const product of allProducts) {
    console.log(`\n📦 Produto: ${product.name}`);

    // Deletar traduções antigas (se existirem)
    await db.delete(productI18n).where(eq(productI18n.productId, product.id));

    // Traduzir EN
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

      const enSlug = generateSlug(enTranslation.name);

      await db.insert(productI18n).values({
        productId: product.id,
        locale: 'en',
        name: enTranslation.name,
        description: enTranslation.description || null,
        shortDescription: enTranslation.shortDescription || null,
        slug: enSlug,
      });

      console.log(`     ✅ EN: ${enTranslation.name}`);
      await new Promise(r => setTimeout(r, 600));
    } catch (error) {
      console.error('     ❌ Erro EN:', error);
      errors++;
    }

    // Traduzir ES
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

      const esSlug = generateSlug(esTranslation.name);

      await db.insert(productI18n).values({
        productId: product.id,
        locale: 'es',
        name: esTranslation.name,
        description: esTranslation.description || null,
        shortDescription: esTranslation.shortDescription || null,
        slug: esSlug,
      });

      console.log(`     ✅ ES: ${esTranslation.name}`);
      await new Promise(r => setTimeout(r, 600));
    } catch (error) {
      console.error('     ❌ Erro ES:', error);
      errors++;
    }

    translated++;
  }

  console.log('\n\n✅ CONCLUÍDO!');
  console.log(`   Traduzidos: ${translated}`);
  console.log(`   Erros: ${errors}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
