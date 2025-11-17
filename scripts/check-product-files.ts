import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { files, productVariations } from '../src/lib/db/schema';
import { eq, or } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const productId = '7d35f885-b44d-44ad-ab11-6fcdd17e3b31';
  
  console.log('🔍 Verificando arquivos do produto...\n');
  
  // Buscar variações
  const variations = await db.select().from(productVariations).where(eq(productVariations.productId, productId));
  console.log(`Variações: ${variations.length}`);
  variations.forEach(v => console.log(`  - ${v.name} (ID: ${v.id})`));
  
  // Buscar arquivos do produto
  const productFiles = await db.select().from(files).where(eq(files.productId, productId));
  console.log(`\nArquivos do produto: ${productFiles.length}`);
  productFiles.forEach(f => console.log(`  - ${f.name}`));
  
  // Buscar arquivos das variações
  if (variations.length > 0) {
    for (const variation of variations) {
      const varFiles = await db.select().from(files).where(eq(files.variationId, variation.id));
      console.log(`\nArquivos da variação "${variation.name}": ${varFiles.length}`);
      varFiles.forEach(f => console.log(`  - ${f.name} (r2Key: ${f.path})`));
    }
  }

  process.exit(0);
}

main().catch(console.error);
