/**
 * Script para traduzir TODAS as categorias (name e description) para EN e ES
 * Salva nas tabelas category_i18n
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { categories, categoryI18n } from '../src/lib/db/schema';
import { translateCategory, generateSlug } from '../src/lib/deepl';
import { eq } from 'drizzle-orm';

// Carregar .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🌐 Traduzindo TODAS as categorias para EN e ES...\n');

  // Buscar TODAS as categorias
  const allCategories = await db.select().from(categories);

  console.log(`📦 ${allCategories.length} categorias encontradas\n`);

  let translated = 0;
  let skipped = 0;

  for (const category of allCategories) {
    console.log(`\n📂 Categoria: ${category.name} (ID: ${category.id})`);

    // Verificar se já tem traduções
    const existing = await db
      .select()
      .from(categoryI18n)
      .where(eq(categoryI18n.categoryId, category.id));

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
        const enTranslation = await translateCategory(
          { name: category.name, description: category.description },
          'EN'
        );

        const slug = generateSlug(enTranslation.name);

        await db.insert(categoryI18n).values({
          categoryId: category.id,
          locale: 'en',
          name: enTranslation.name,
          description: enTranslation.description || null,
          slug,
        });

        console.log(`     ✅ EN: ${enTranslation.name} (slug: ${slug})`);
        await new Promise(r => setTimeout(r, 500)); // Evitar rate limit
      } catch (error) {
        console.error('     ❌ Erro EN:', error);
      }
    }

    // Traduzir ES
    if (!hasES) {
      console.log('  🇪🇸 Traduzindo para ES...');
      try {
        const esTranslation = await translateCategory(
          { name: category.name, description: category.description },
          'ES'
        );

        const slug = generateSlug(esTranslation.name);

        await db.insert(categoryI18n).values({
          categoryId: category.id,
          locale: 'es',
          name: esTranslation.name,
          description: esTranslation.description || null,
          slug,
        });

        console.log(`     ✅ ES: ${esTranslation.name} (slug: ${slug})`);
        await new Promise(r => setTimeout(r, 500)); // Evitar rate limit
      } catch (error) {
        console.error('     ❌ Erro ES:', error);
      }
    }

    translated++;
  }

  console.log('\n\n✅ CONCLUÍDO!');
  console.log(`   Traduzidas: ${translated}`);
  console.log(`   Puladas: ${skipped}`);
  console.log(`   Total: ${allCategories.length}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
