/**
 * Script para listar TODAS as traduções ES e identificar possíveis problemas
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { products, productI18n } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('📋 LISTANDO TODAS as traduções ES...\n');

  const allProducts = await db
    .select({
      ptName: products.name,
      esName: productI18n.name,
      productId: products.id,
    })
    .from(products)
    .leftJoin(productI18n, eq(products.id, productI18n.productId))
    .where(eq(productI18n.locale, 'es'));

  console.log(`Total: ${allProducts.length} produtos\n`);

  // Termos que devem estar em espanhol
  const termsToCheck = [
    { pt: 'BROADCASTING', es: 'BROADCASTING' }, // mantém em inglês
    { pt: 'INDICADORES', es: 'ACOMODADORES' },
    { pt: 'PIONEIROS', es: 'PRECURSORES' },
    { pt: 'PIONEIRO', es: 'PRECURSOR' },
    { pt: 'PIONEIRA', es: 'PRECURSORA' },
    { pt: 'SERVOS', es: 'SIERVOS' },
    { pt: 'PAPÉIS', es: 'PAPELES' },
    { pt: 'PLAQUINHAS', es: 'PLAQUITAS' },
    { pt: 'PORTA CANETA', es: 'PORTA BOLÍGRAFO' },
  ];

  let issues = 0;

  for (const product of allProducts) {
    const ptUpper = product.ptName.toUpperCase();
    const esUpper = product.esName.toUpperCase();

    // Verificar termos problemáticos
    for (const term of termsToCheck) {
      if (ptUpper.includes(term.pt)) {
        if (!esUpper.includes(term.es)) {
          console.log(`⚠️ ${product.ptName}`);
          console.log(`   ES: ${product.esName}`);
          console.log(`   Esperado conter: "${term.es}"\n`);
          issues++;
        }
      }
    }
  }

  if (issues === 0) {
    console.log('✅ Todas as traduções parecem corretas!');
  } else {
    console.log(`\n❌ ${issues} possível(is) problema(s) encontrado(s)`);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
