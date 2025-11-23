/**
 * Script: Corrigir nomes de produtos em order_items
 *
 * Atualiza order_items que não têm o campo "name" preenchido,
 * buscando o nome do produto na tabela products.
 */

import { db } from '@/lib/db';
import { orderItems, products } from '@/lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';

async function fixOrderItemsNames() {
  console.log('🔍 Buscando order_items sem nome...');

  // Buscar todos os order_items sem nome ou com nome vazio
  const itemsWithoutName = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      name: orderItems.name,
    })
    .from(orderItems)
    .where(or(isNull(orderItems.name), eq(orderItems.name, '')));

  console.log(`📊 Encontrados: ${itemsWithoutName.length} itens sem nome`);

  if (itemsWithoutName.length === 0) {
    console.log('✅ Todos os itens já têm nome!');
    return;
  }

  let fixed = 0;
  let notFound = 0;

  for (const item of itemsWithoutName) {
    try {
      // Buscar nome do produto
      const [product] = await db
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!product) {
        console.warn(`⚠️  Produto não encontrado: ${item.productId}`);
        notFound++;
        continue;
      }

      // Atualizar order_item com o nome do produto
      await db.update(orderItems).set({ name: product.name }).where(eq(orderItems.id, item.id));

      fixed++;
      console.log(`✅ Corrigido: ${product.name}`);
    } catch (error) {
      console.error(`❌ Erro ao corrigir item ${item.id}:`, error);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`✅ Corrigidos: ${fixed}`);
  console.log(`⚠️  Não encontrados: ${notFound}`);
}

fixOrderItemsNames()
  .then(() => {
    console.log('✅ Concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
