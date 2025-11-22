/**
 * Script de Debug: Verificar order_items e seus nomes
 */

import { db } from '@/lib/db';
import { orderItems, products, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function debugOrderItems() {
  console.log('🔍 Buscando order_items...\n');

  // Buscar 20 order_items com detalhes
  const items = await db
    .select({
      itemId: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      itemName: orderItems.name, // Nome salvo no order_item
      itemPrice: orderItems.price,
      productName: products.name, // Nome do produto (se existir)
      orderEmail: orders.email,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .limit(20);

  console.log('📊 Primeiros 20 order_items:\n');

  items.forEach((item, index) => {
    const status = item.productName
      ? '✅ Produto existe'
      : item.itemName
        ? '⚠️  Produto não existe (usando order_item.name)'
        : '❌ SEM NOME';

    console.log(`${index + 1}. ${status}`);
    console.log(`   Order ID: ${item.orderId?.slice(0, 8)}`);
    console.log(`   Product ID: ${item.productId}`);
    console.log(`   order_items.name: "${item.itemName || 'NULL'}"`);
    console.log(`   products.name: "${item.productName || 'NULL'}"`);
    console.log(`   Email: ${item.orderEmail}`);
    console.log('');
  });

  // Estatísticas
  const withProduct = items.filter(i => i.productName).length;
  const withItemName = items.filter(i => !i.productName && i.itemName).length;
  const noName = items.filter(i => !i.productName && !i.itemName).length;

  console.log('\n📈 Estatísticas (amostra de 20):');
  console.log(`✅ Com produto existente: ${withProduct}`);
  console.log(`⚠️  Produto deletado (com order_item.name): ${withItemName}`);
  console.log(`❌ Sem nome algum: ${noName}`);
}

debugOrderItems()
  .then(() => {
    console.log('\n✅ Debug concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
