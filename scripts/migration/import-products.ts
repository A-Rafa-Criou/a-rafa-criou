/**
 * Script de Importação de Produtos do WordPress
 *
 * Importa produtos do WooCommerce para o Next.js
 *
 * Uso:
 *   npx tsx scripts/migration/import-products.ts [caminho-csv]
 */

import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

interface WordPressProduct {
  product_id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  created_at: string;
  price: string;
  sale_price?: string;
  sku?: string;
  stock_status?: string;
  categories?: string; // Pipe-separated: "Cat1|Cat2"
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function importProducts(csvPath: string = 'data/test/test-produtos.csv') {
  console.log('🚀 Iniciando importação de produtos...\n');
  console.log(`📂 Arquivo: ${csvPath}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo não encontrado: ${csvPath}`);
    console.log('\n💡 Dica: Exporte os produtos do WordPress primeiro!');
    console.log('   Consulte: EXPORTAR_WORDPRESS.md\n');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: WordPressProduct[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Total de produtos no CSV: ${records.length}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: { name: string; error: string }[] = [];

  // Buscar ou criar categoria padrão
  let defaultCategory = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, 'geral'))
    .limit(1);

  if (defaultCategory.length === 0) {
    console.log('📁 Criando categoria padrão "Geral"...');
    const [newCat] = await db
      .insert(categories)
      .values({
        id: crypto.randomUUID(),
        name: 'Geral',
        slug: 'geral',
        description: 'Categoria padrão para produtos importados',
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    defaultCategory = [newCat];
  }

  for (const [index, product] of records.entries()) {
    try {
      if (!product.name) {
        console.log(`⏭️  [${index + 1}/${records.length}] Nome vazio - pulando`);
        skipped++;
        continue;
      }

      // Gerar slug único
      let slug = product.slug || generateSlug(product.name);

      // Verificar se slug já existe
      const existingBySlug = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (existingBySlug.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }

      // Calcular preço final
      const price =
        product.sale_price && parseFloat(product.sale_price) > 0
          ? product.sale_price
          : product.price;

      // Inserir produto
      await db.insert(products).values({
        id: crypto.randomUUID(),
        name: product.name.trim(),
        slug,
        description: product.description || null,
        shortDescription: product.short_description || null,
        price: price || '0',
        categoryId: defaultCategory[0].id,
        isActive: product.stock_status !== 'outofstock',
        isFeatured: false,
        createdAt: product.created_at ? new Date(product.created_at) : new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ [${index + 1}/${records.length}] Importado: ${product.name}`);
      success++;
    } catch (error) {
      const err = error as Error;
      console.error(`❌ [${index + 1}/${records.length}] Erro: ${product.name}`, err.message);
      errors++;
      errorList.push({
        name: product.name,
        error: err.message,
      });
    }
  }

  // Relatório
  console.log('\n' + '='.repeat(60));
  console.log('📈 RELATÓRIO DE IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`Total no CSV:     ${records.length}`);
  console.log(`✅ Importados:    ${success} (${Math.round((success / records.length) * 100)}%)`);
  console.log(`⏭️  Pulados:       ${skipped} (${Math.round((skipped / records.length) * 100)}%)`);
  console.log(`❌ Erros:         ${errors} (${Math.round((errors / records.length) * 100)}%)`);
  console.log('='.repeat(60));

  if (errorList.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    errorList.forEach(({ name, error }) => {
      console.log(`   • ${name}: ${error}`);
    });
  }

  if (success > 0) {
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar no Drizzle Studio: npm run db:studio');
    console.log('   2. Importar variações: npx tsx scripts/migration/import-variations.ts');
  }

  console.log('\n✨ Importação concluída!\n');
}

const csvPath = process.argv[2] || 'data/test/test-produtos.csv';
importProducts(csvPath).catch(console.error);
