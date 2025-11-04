import 'dotenv/config';
import { db } from '../../src/lib/db';
import { products } from '../../src/lib/db/schema';
import { asc } from 'drizzle-orm';

async function checkProducts() {
  console.log('🔍 Verificando produtos...\n');

  const prods = await db
    .select({
      id: products.id,
      wpProductId: products.wpProductId,
      slug: products.slug,
    })
    .from(products)
    .orderBy(asc(products.wpProductId));

  console.log(`Total produtos: ${prods.length}\n`);

  console.log('📋 Primeiros 10 produtos:');
  prods.slice(0, 10).forEach(p => {
    console.log(`  WP #${p.wpProductId} → ${p.slug}`);
  });

  console.log('\n📋 Últimos 10 produtos:');
  prods.slice(-10).forEach(p => {
    console.log(`  WP #${p.wpProductId} → ${p.slug}`);
  });

  // Pegar alguns IDs do CSV que não foram encontrados
  const notFoundIds = [12873, 7833, 12871, 12233, 7966, 11362, 8898, 9479];
  console.log('\n🔍 Procurando alguns IDs que não foram encontrados:');
  for (const wpId of notFoundIds) {
    const found = prods.find(p => p.wpProductId === wpId);
    if (found) {
      console.log(`  ✅ WP #${wpId} → ${found.slug}`);
    } else {
      console.log(`  ❌ WP #${wpId} não está no banco`);
    }
  }

  process.exit(0);
}

checkProducts().catch(console.error);
