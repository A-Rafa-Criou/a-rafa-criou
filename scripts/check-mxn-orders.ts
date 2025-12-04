/**
 * Script para verificar pedidos em MXN e seus valores
 */

import { db } from '../src/lib/db/index';
import { orders } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkMXNOrders() {
  console.log('\n🔍 Verificando pedidos em MXN...\n');

  try {
    const mxnOrders = await db.select().from(orders).where(eq(orders.currency, 'MXN')).limit(5);

    if (mxnOrders.length === 0) {
      console.log('❌ Nenhum pedido encontrado em MXN\n');
      return;
    }

    console.log(`✅ Encontrados ${mxnOrders.length} pedido(s) em MXN:\n`);

    mxnOrders.forEach((order, index) => {
      console.log(`Pedido ${index + 1}:`);
      console.log(`  ID: ${order.id}`);
      console.log(`  Email: ${order.email || 'N/A'}`);
      console.log(`  Total: ${order.total}`);
      console.log(`  Subtotal: ${order.subtotal}`);
      console.log(`  Currency: ${order.currency}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Criado em: ${order.createdAt}`);
      console.log(`  Payment ID: ${order.paymentId || 'N/A'}\n`);
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
  }
}

checkMXNOrders().then(() => process.exit(0));
