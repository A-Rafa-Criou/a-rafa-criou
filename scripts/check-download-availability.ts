import 'dotenv/config';
import { db } from '../src/lib/db';
import { orders, orderItems, products, files } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkDownloadAvailability() {
  console.log('🔍 Verificando disponibilidade de downloads...\n');

  // Pegar pedidos completados
  const completedOrders = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.id,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.status, 'completed'))
    .limit(10);

  console.log(`📦 Total de pedidos completados (amostra): ${completedOrders.length}\n`);

  let ordersWithFiles = 0;
  let ordersWithoutFiles = 0;

  for (const order of completedOrders) {
    console.log(`\n📋 Pedido ${order.orderNumber.substring(0, 8)}...`);
    console.log(`   Status: ${order.status}`);

    // Pegar itens do pedido
    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: products.name,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.orderId));

    console.log(`   Itens: ${items.length}`);

    let hasFiles = false;

    for (const item of items) {
      // Verificar se produto tem arquivo
      const productFiles = await db.select().from(files).where(eq(files.productId, item.productId));

      if (productFiles.length > 0) {
        console.log(`   ✅ "${item.productName}" - TEM arquivo`);
        hasFiles = true;
      } else {
        console.log(`   ❌ "${item.productName}" - SEM arquivo`);
      }
    }

    if (hasFiles) {
      ordersWithFiles++;
      console.log(`   🟢 BOTÃO DE DOWNLOAD DEVE APARECER`);
    } else {
      ordersWithoutFiles++;
      console.log(`   🔴 BOTÃO DE DOWNLOAD NÃO APARECERÁ`);
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   Pedidos COM arquivos disponíveis: ${ordersWithFiles}`);
  console.log(`   Pedidos SEM arquivos disponíveis: ${ordersWithoutFiles}`);
  console.log(`\n✅ Verificação concluída!`);
}

checkDownloadAvailability().catch(console.error);
