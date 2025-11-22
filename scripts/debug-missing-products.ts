/**
 * Script: Encontrar order_items sem produto (produto deletado/não criado)
 */

import { db } from '@/lib/db';
import { orderItems, products, orders } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';

async function findItemsWithoutProduct() {
  console.log('🔍 Buscando order_items cujo produto NÃO existe...\n');

  // Query para encontrar order_items onde o produto foi deletado/não existe
  const itemsWithoutProduct = await db
    .select({
      itemId: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      itemName: orderItems.name,
      itemPrice: orderItems.price,
      orderEmail: orders.email,
      paymentProvider: orders.paymentProvider,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .where(isNull(products.id)) // Produto não existe
    .limit(50);

  console.log(`📊 Encontrados ${itemsWithoutProduct.length} order_items SEM produto:\n`);
  
  itemsWithoutProduct.forEach((item, index) => {
    const hasName = item.itemName ? '✅ TEM order_item.name' : '❌ SEM NOME';
    
    console.log(`${index + 1}. ${hasName}`);
    console.log(`   Order ID: ${item.orderId?.slice(0, 8)}`);
    console.log(`   Product ID: ${item.productId} (produto não existe)`);
    console.log(`   order_items.name: "${item.itemName || 'NULL'}"`);
    console.log(`   Email: ${item.orderEmail}`);
    console.log(`   Payment: ${item.paymentProvider}`);
    console.log('');
  });

  // Estatísticas
  const withName = itemsWithoutProduct.filter(i => i.itemName).length;
  const withoutName = itemsWithoutProduct.filter(i => !i.itemName).length;
  const wordpress = itemsWithoutProduct.filter(i => i.paymentProvider === 'wordpress_migrated').length;

  console.log('\n📈 Resumo:');
  console.log(`Total sem produto: ${itemsWithoutProduct.length}`);
  console.log(`✅ Com order_item.name: ${withName}`);
  console.log(`❌ Sem nome: ${withoutName}`);
  console.log(`📦 Migrados do WordPress: ${wordpress}`);

  if (withName > 0) {
    console.log('\n✅ CORREÇÃO APLICADA:');
    console.log('   A API agora usa: product?.name || item.name');
    console.log('   Esses produtos vão aparecer no admin!');
  }

  if (withoutName > 0) {
    console.log('\n⚠️  PROBLEMA:');
    console.log(`   ${withoutName} items não têm nome no order_item.`);
    console.log('   Esses NÃO vão aparecer no admin.');
  }
}

findItemsWithoutProduct()
  .then(() => {
    console.log('\n✅ Análise concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
