#!/usr/bin/env node
/**
 * Script para verificar contagem de produtos no banco
 */
import { db } from '../src/lib/db/index.js';
import { products } from '../src/lib/db/schema.js';
import { count, eq } from 'drizzle-orm';

async function checkProductsCount() {
  console.log('🔍 Verificando produtos no banco...\n');

  // Total de produtos
  const totalResult = await db.select({ count: count() }).from(products);
  const total = totalResult[0]?.count || 0;

  // Produtos ativos
  const activeResult = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.isActive, true));
  const active = activeResult[0]?.count || 0;

  // Produtos inativos
  const inactiveResult = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.isActive, false));
  const inactive = inactiveResult[0]?.count || 0;

  console.log('📊 Resultado:');
  console.log(`   Total de produtos: ${total}`);
  console.log(`   ✅ Ativos: ${active}`);
  console.log(`   ❌ Inativos: ${inactive}`);
  console.log('');

  // Listar últimos 5 produtos criados
  console.log('📝 Últimos 5 produtos criados:');
  const latestProducts = await db
    .select({
      id: products.id,
      name: products.name,
      isActive: products.isActive,
      createdAt: products.createdAt,
    })
    .from(products)
    .orderBy(products.createdAt)
    .limit(5);

  latestProducts.forEach((p, i) => {
    const status = p.isActive ? '✅' : '❌';
    console.log(`   ${i + 1}. ${status} ${p.name} (${p.createdAt})`);
  });

  process.exit(0);
}

checkProductsCount().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
