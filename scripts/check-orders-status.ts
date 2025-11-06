import { db } from '../src/lib/db/index.js';
import { orders } from '../src/lib/db/schema.js';
import { sql } from 'drizzle-orm';

async function checkOrdersStatus() {
  console.log('\n📊 VERIFICANDO STATUS DOS PEDIDOS\n');

  // Contar por status
  const allOrders = await db.select().from(orders);
  
  const statusMap = new Map<string, number>();
  allOrders.forEach((order) => {
    const count = statusMap.get(order.status) || 0;
    statusMap.set(order.status, count + 1);
  });

  console.log('Status dos pedidos:');
  statusMap.forEach((count, status) => {
    console.log(`   ${status}: ${count} pedidos`);
  });

  // Buscar alguns pedidos de exemplo
  const sampleOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      email: orders.email,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .limit(5);

  console.log('\n📦 Amostra de 5 pedidos:');
  sampleOrders.forEach((order) => {
    console.log(`   - ID: ${order.id}`);
    console.log(`     Status: ${order.status}`);
    console.log(`     Email: ${order.email}`);
    console.log(`     Total: R$ ${order.total}`);
    console.log('');
  });

  process.exit(0);
}

checkOrdersStatus().catch((err) => {
  console.error('Erro:', err);
  process.exit(1);
});
