/**
 * Script para RE-TRADUZIR os 10 produtos mais recentes
 * Usa Google Translate (gratuito) com dicionário customizado
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { products, productI18n } from '../src/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { translateProduct, generateSlug } from '../src/lib/deepl';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🔄 RE-TRADUZINDO os 10 produtos mais recentes...\n');

  // Buscar os 10 produtos mais recentes
  const recentProducts = await db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt))
    .limit(10);

  console.log(`📦 ${recentProducts.length} produtos mais recentes encontrados:\n`);

  recentProducts.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.name}`);
  });

  console.log('\n🌐 Iniciando re-tradução...\n');

  let success = 0;
  let errors = 0;

  for (const product of recentProducts) {
    console.log(`\n📦 ${product.name}`);

    try {
      // DELETAR traduções antigas EN e ES
      await db
        .delete(productI18n)
        .where(
          and(
            eq(productI18n.productId, product.id),
            eq(productI18n.locale, 'en')
          )
        );

      await db
        .delete(productI18n)
        .where(
          and(
            eq(productI18n.productId, product.id),
            eq(productI18n.locale, 'es')
          )
        );

      console.log('  🗑️  Traduções antigas deletadas');

      // Traduzir EN
      console.log('  🇺🇸 Traduzindo para EN...');
      const enTranslation = await translateProduct(
        {
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
        },
        'EN',
        'PT'
      );

      const enSlug = generateSlug(enTranslation.name);

      await db.insert(productI18n).values({
        productId: product.id,
        locale: 'en',
        name: enTranslation.name,
        description: enTranslation.description || null,
        shortDescription: enTranslation.shortDescription || null,
        slug: enSlug,
        seoTitle: enTranslation.name,
        seoDescription: enTranslation.shortDescription || enTranslation.description || null,
      });

      console.log(`     ✅ EN: ${enTranslation.name}`);

      // Traduzir ES (com dicionário customizado aplicado automaticamente)
      console.log('  🇪🇸 Traduzindo para ES...');
      const esTranslation = await translateProduct(
        {
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
        },
        'ES',
        'PT'
      );

      const esSlug = generateSlug(esTranslation.name);

      await db.insert(productI18n).values({
        productId: product.id,
        locale: 'es',
        name: esTranslation.name,
        description: esTranslation.description || null,
        shortDescription: esTranslation.shortDescription || null,
        slug: esSlug,
        seoTitle: esTranslation.name,
        seoDescription: esTranslation.shortDescription || esTranslation.description || null,
      });

      console.log(`     ✅ ES: ${esTranslation.name}`);

      success++;

      // Delay para evitar rate limit do Google
      await new Promise(r => setTimeout(r, 1500));
    } catch (error) {
      console.error(`     ❌ Erro ao traduzir: ${error}`);
      errors++;
    }
  }

  console.log('\n\n✅ CONCLUÍDO!');
  console.log(`   Re-traduzidos com sucesso: ${success}`);
  console.log(`   Erros: ${errors}`);
  console.log(`   Total processado: ${recentProducts.length}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
