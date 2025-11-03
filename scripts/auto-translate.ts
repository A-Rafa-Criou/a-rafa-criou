/**
 * Script para traduzir automaticamente produtos, categorias e variações
 * usando DeepL API (PT → EN, PT → ES)
 *
 * Uso: npx tsx scripts/auto-translate.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env.local manualmente
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import {
  products,
  categories,
  productVariations,
  productI18n,
  categoryI18n,
  productVariationI18n,
} from '@/lib/db/schema';
import { translateProduct, translateCategory, translateVariation, generateSlug } from '@/lib/deepl';
import { eq, and } from 'drizzle-orm';

const TARGET_LOCALES = ['en', 'es'] as const;

async function autoTranslateAll() {
  console.log('🌍 Iniciando tradução automática com DeepL...');

  if (!process.env.DEEPL_API_KEY) {
    console.error('❌ DEEPL_API_KEY não encontrada no .env.local');
    console.log('📝 Adicione DEEPL_API_KEY=your-key-here ao .env.local');
    console.log('🔗 Obtenha uma chave em: https://www.deepl.com/pro-api');
    process.exit(1);
  }

  try {
    // 1. Traduzir categorias
    console.log('\n📦 Traduzindo categorias...');
    const allCategories = await db.select().from(categories);

    for (const category of allCategories) {
      console.log(`  → ${category.name}`);

      for (const targetLocale of TARGET_LOCALES) {
        const lang = targetLocale.toUpperCase() as 'EN' | 'ES';

        // Verifica se já existe tradução
        const existing = await db
          .select()
          .from(categoryI18n)
          .where(
            and(eq(categoryI18n.categoryId, category.id), eq(categoryI18n.locale, targetLocale))
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(`    ✓ ${targetLocale.toUpperCase()} já traduzido, pulando...`);
          continue;
        }

        const translated = await translateCategory(
          {
            name: category.name,
            description: category.description,
          },
          lang
        );

        await db.insert(categoryI18n).values({
          categoryId: category.id,
          locale: targetLocale,
          name: translated.name,
          description: translated.description,
          slug: generateSlug(translated.name),
          seoTitle: null,
          seoDescription: null,
        });

        console.log(`    ✓ ${targetLocale.toUpperCase()}: ${translated.name}`);
      }
    }

    // 2. Traduzir produtos
    console.log('\n📦 Traduzindo produtos...');
    const allProducts = await db.select().from(products);

    for (const product of allProducts) {
      console.log(`  → ${product.name}`);

      for (const targetLocale of TARGET_LOCALES) {
        const lang = targetLocale.toUpperCase() as 'EN' | 'ES';

        // Verifica se já existe tradução
        const existing = await db
          .select()
          .from(productI18n)
          .where(and(eq(productI18n.productId, product.id), eq(productI18n.locale, targetLocale)))
          .limit(1);

        if (existing.length > 0) {
          console.log(`    ✓ ${targetLocale.toUpperCase()} já traduzido, pulando...`);
          continue;
        }

        const translated = await translateProduct(
          {
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription,
          },
          lang
        );

        await db.insert(productI18n).values({
          productId: product.id,
          locale: targetLocale,
          name: translated.name,
          slug: generateSlug(translated.name),
          description: translated.description,
          shortDescription: translated.shortDescription,
          seoTitle: null,
          seoDescription: null,
        });

        console.log(`    ✓ ${targetLocale.toUpperCase()}: ${translated.name}`);

        // Rate limit: aguarda 500ms entre traduções para não exceder limites da API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Traduzir variações
    console.log('\n📦 Traduzindo variações de produtos...');
    const allVariations = await db.select().from(productVariations);

    for (const variation of allVariations) {
      console.log(`  → ${variation.name}`);

      for (const targetLocale of TARGET_LOCALES) {
        const lang = targetLocale.toUpperCase() as 'EN' | 'ES';

        // Verifica se já existe tradução
        const existing = await db
          .select()
          .from(productVariationI18n)
          .where(
            and(
              eq(productVariationI18n.variationId, variation.id),
              eq(productVariationI18n.locale, targetLocale)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(`    ✓ ${targetLocale.toUpperCase()} já traduzido, pulando...`);
          continue;
        }

        const translated = await translateVariation({ name: variation.name }, lang);

        await db.insert(productVariationI18n).values({
          variationId: variation.id,
          locale: targetLocale,
          name: translated.name,
          slug: generateSlug(translated.name),
        });

        console.log(`    ✓ ${targetLocale.toUpperCase()}: ${translated.name}`);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n✅ Tradução automática concluída!');
    console.log(`📊 Resumo:`);
    console.log(`   - ${allCategories.length} categorias traduzidas`);
    console.log(`   - ${allProducts.length} produtos traduzidos`);
    console.log(`   - ${allVariations.length} variações traduzidas`);
  } catch (error) {
    console.error('❌ Erro durante tradução automática:', error);
    process.exit(1);
  }
}

autoTranslateAll()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
