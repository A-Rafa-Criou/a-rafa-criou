import 'dotenv/config';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { sql, count, isNotNull, desc } from 'drizzle-orm';

async function checkOrders() {
  console.log('🔍 Verificando pedidos no banco...\n');

  // Contar total de pedidos
  const [totalResult] = await db.select({ count: count() }).from(orders);
  const total = totalResult?.count || 0;
  console.log(`📊 Total de pedidos: ${total}\n`);

  // Contar pedidos com wpOrderId
  const [wpResult] = await db
    .select({ count: count() })
    .from(orders)
    .where(isNotNull(orders.wpOrderId));
  const wpCount = wpResult?.count || 0;
  console.log(`📦 Pedidos com wp_order_id: ${wpCount}\n`);

  // Mostrar alguns pedidos
  const samples = await db
    .select({
      id: orders.id,
      wpOrderId: orders.wpOrderId,
      email: orders.email,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  console.log('📋 Últimos 5 pedidos:');
  samples.forEach(row => {
    console.log(`   • WP #${row.wpOrderId || 'NULL'} - ${row.email} - R$ ${row.total}`);
  });

  console.log('\n✨ Análise concluída!\n');
}

checkOrders().catch(console.error);
