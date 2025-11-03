/**
 * Script para RE-traduzir produtos COM preservação de HTML
 * usando DeepL API (PT → EN, PT → ES)
 *
 * Este script ATUALIZA traduções existentes para incluir formatação HTML
 * Uso: npx tsx scripts/retranslate-with-html.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env.local manualmente
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '@/lib/db';
import { products, productI18n } from '@/lib/db/schema';
import { translateProduct, generateSlug } from '@/lib/deepl';
import { eq, and } from 'drizzle-orm';

const TARGET_LOCALES = ['en', 'es'] as const;

async function retranslateWithHtml() {
  console.log('🌍 RE-traduzindo produtos com preservação de HTML...');

  if (!process.env.DEEPL_API_KEY) {
    console.error('❌ DEEPL_API_KEY não encontrada no .env.local');
    console.log('📝 Adicione DEEPL_API_KEY=your-key-here ao .env.local');
    console.log('🔗 Obtenha uma chave em: https://www.deepl.com/pro-api');
    process.exit(1);
  }

  try {
    const allProducts = await db.select().from(products);
    let updated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      // Verificar se produto tem HTML na descrição
      const hasHtml = product.description && /<[^>]+>/.test(product.description);
      
      if (!hasHtml) {
        console.log(`  ⊘ ${product.name} - sem HTML, pulando...`);
        skipped++;
        continue;
      }

      console.log(`\n  → ${product.name} (tem HTML - re-traduzindo)`);

      for (const targetLocale of TARGET_LOCALES) {
        const lang = targetLocale.toUpperCase() as 'EN' | 'ES';

        // Busca tradução existente
        const existing = await db
          .select()
          .from(productI18n)
          .where(and(eq(productI18n.productId, product.id), eq(productI18n.locale, targetLocale)))
          .limit(1);

        // Traduz com preservação de HTML
        const translated = await translateProduct(
          {
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription,
          },
          lang
        );

        if (existing.length > 0) {
          // ATUALIZA tradução existente
          await db
            .update(productI18n)
            .set({
              name: translated.name,
              slug: generateSlug(translated.name),
              description: translated.description,
              shortDescription: translated.shortDescription,
            })
            .where(
              and(eq(productI18n.productId, product.id), eq(productI18n.locale, targetLocale))
            );

          console.log(`    ✓ ${targetLocale.toUpperCase()} ATUALIZADO: ${translated.name}`);
        } else {
          // CRIA nova tradução
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

          console.log(`    ✓ ${targetLocale.toUpperCase()} CRIADO: ${translated.name}`);
        }

        updated++;

        // Rate limit: aguarda 500ms entre traduções
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n✅ Re-tradução concluída!');
    console.log(`📊 Resumo:`);
    console.log(`   - ${updated} traduções atualizadas/criadas`);
    console.log(`   - ${skipped} produtos sem HTML (pulados)`);
  } catch (error) {
    console.error('❌ Erro durante re-tradução:', error);
    process.exit(1);
  }
}

retranslateWithHtml()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
