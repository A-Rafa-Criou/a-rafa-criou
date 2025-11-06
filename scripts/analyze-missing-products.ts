import 'dotenv/config';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../src/lib/db';
import { products } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

interface CsvRow {
  product_id: string;
  product_name: string;
  post_type: string;
  parent_product_id: string;
  downloadable_files_json: string;
}

async function analyzeMissingProducts() {
  console.log('🔍 Analisando produtos faltantes...\n');

  // 1. Ler CSV
  let csvContent = readFileSync('data/test/downloadable-files.csv', 'utf-8');
  if (csvContent.charCodeAt(0) === 0xfeff) {
    csvContent = csvContent.substring(1);
  }

  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvRow[];

  // 2. Extrair IDs de produtos pai únicos
  const parentIds = new Set<number>();
  
  for (const row of rows) {
    const wpParentId = parseInt(row.parent_product_id);
    if (!isNaN(wpParentId) && wpParentId > 0) {
      parentIds.add(wpParentId);
    }
  }

  console.log(`📊 Total de produtos pai únicos no CSV: ${parentIds.size}\n`);

  // 3. Verificar quais existem no banco
  const missingIds: number[] = [];
  const existingIds: number[] = [];

  for (const wpId of Array.from(parentIds).sort((a, b) => a - b)) {
    const [product] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.wpProductId, wpId))
      .limit(1);

    if (product) {
      existingIds.push(wpId);
    } else {
      missingIds.push(wpId);
    }
  }

  console.log(`✅ Produtos encontrados: ${existingIds.length}`);
  console.log(`❌ Produtos faltantes: ${missingIds.length}\n`);

  if (missingIds.length > 0) {
    console.log('📋 IDs faltantes (primeiros 20):');
    missingIds.slice(0, 20).forEach(id => {
      console.log(`   - WP #${id}`);
    });
  }

  // 4. Verificar quantos registros do CSV teriam produto se importássemos os faltantes
  let couldImport = 0;
  
  for (const row of rows) {
    const wpParentId = parseInt(row.parent_product_id);
    if (existingIds.includes(wpParentId)) {
      couldImport++;
    }
  }

  console.log(`\n📊 Estatísticas:`);
  console.log(`   Total de registros no CSV: ${rows.length}`);
  console.log(`   Poderiam ser importados agora: ${couldImport} (${((couldImport/rows.length)*100).toFixed(1)}%)`);
  console.log(`   Faltando produto pai: ${rows.length - couldImport} (${(((rows.length - couldImport)/rows.length)*100).toFixed(1)}%)`);
}

analyzeMissingProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
