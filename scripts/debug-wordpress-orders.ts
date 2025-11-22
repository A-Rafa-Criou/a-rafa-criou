/**
 * Script de Debug: Verificar order_items de pedidos migrados do WordPress
 */

import { db } from '@/lib/db';
import { orderItems, products, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function debugWordPressMigration() {
  console.log('🔍 Buscando pedidos migrados do WordPress...\n');

  // Buscar order_items de pedidos WordPress
  const items = await db
    .select({
      itemId: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      itemName: orderItems.name, // Nome salvo no order_item
      itemPrice: orderItems.price,
      productName: products.name, // Nome do produto (se existir)
      orderEmail: orders.email,
      paymentProvider: orders.paymentProvider,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.paymentProvider, 'wordpress_migrated'))
    .limit(30);

  console.log(`📊 Encontrados ${items.length} order_items de pedidos WordPress:\n`);
  
  items.forEach((item, index) => {
    const status = item.productName 
      ? '✅ Produto existe' 
      : item.itemName 
        ? '⚠️  Produto NÃO existe (usando order_item.name)'
        : '❌ SEM NOME NENHUM';

    console.log(`${index + 1}. ${status}`);
    console.log(`   Order ID: ${item.orderId?.slice(0, 8)}`);
    console.log(`   Product ID: ${item.productId}`);
    console.log(`   order_items.name: "${item.itemName || 'NULL'}"`);
    console.log(`   products.name: "${item.productName || 'NULL'}"`);
    console.log(`   Email: ${item.orderEmail}`);
    console.log(`   Payment: ${item.paymentProvider}`);
    console.log('');
  });

  // Estatísticas
  const withProduct = items.filter(i => i.productName).length;
  const withItemNameOnly = items.filter(i => !i.productName && i.itemName).length;
  const noName = items.filter(i => !i.productName && !i.itemName).length;

  console.log(`\n📈 Estatísticas (${items.length} items WordPress):`);
  console.log(`✅ Com produto existente: ${withProduct} (${((withProduct/items.length)*100).toFixed(1)}%)`);
  console.log(`⚠️  Produto não existe mas tem order_item.name: ${withItemNameOnly} (${((withItemNameOnly/items.length)*100).toFixed(1)}%)`);
  console.log(`❌ Sem nome algum: ${noName} (${((noName/items.length)*100).toFixed(1)}%)`);

  // Verificar se a API está retornando corretamente
  if (withItemNameOnly > 0) {
    console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
    console.log(`   ${withItemNameOnly} produtos foram deletados ou não criados.`);
    console.log('   O campo order_items.name está preenchido ✅');
    console.log('   A API deve usar: product?.name || item.name');
  }
}

debugWordPressMigration()
  .then(() => {
    console.log('\n✅ Debug concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
