import 'dotenv/config';
import { db } from '../src/lib/db';
import { orders, users } from '../src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

async function checkOrderOwnership() {
  console.log('🔍 Verificando ownership dos pedidos...\n');

  // 1. Pedidos com userId NULL
  const ordersWithoutUserId = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(sql`${orders.userId} IS NULL`);

  console.log(`📊 Pedidos sem userId (NULL): ${ordersWithoutUserId[0]?.count || 0}`);

  // 2. Pedidos com userId preenchido
  const ordersWithUserId = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(sql`${orders.userId} IS NOT NULL`);

  console.log(`📊 Pedidos com userId: ${ordersWithUserId[0]?.count || 0}`);

  // 3. Amostra de pedidos completed para verificar userId
  const sampleCompletedOrders = await db
    .select({
      id: orders.id,
      email: orders.email,
      userId: orders.userId,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.status, 'completed'))
    .limit(10);

  console.log('\n📦 Amostra de 10 pedidos "completed":');
  for (const order of sampleCompletedOrders) {
    console.log(`   - Email: ${order.email}`);
    console.log(`     userId: ${order.userId || 'NULL'}`);
    console.log(`     Status: ${order.status}`);
    console.log(`     Total: R$ ${parseFloat(order.total.toString()).toFixed(2)}`);
    console.log('');
  }

  // 4. Verificar se existem usuários com esses emails
  console.log('🔍 Verificando se usuários existem para os emails dos pedidos...\n');

  for (const order of sampleCompletedOrders.slice(0, 5)) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.email, order.email))
      .limit(1);

    if (user) {
      console.log(`✅ Email: ${order.email}`);
      console.log(`   User ID no DB: ${user.id}`);
      console.log(`   User ID no pedido: ${order.userId || 'NULL'}`);
      console.log(`   Match: ${user.id === order.userId ? '✅ SIM' : '❌ NÃO'}`);
      console.log('');
    } else {
      console.log(`❌ Email ${order.email} - Usuário NÃO EXISTE`);
      console.log('');
    }
  }

  // 5. Estatísticas de correspondência
  const mismatchQuery = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT o.id) as total_orders,
      COUNT(DISTINCT CASE 
        WHEN o."userId" IS NOT NULL AND u.id IS NOT NULL AND o."userId" = u.id 
        THEN o.id 
      END) as matching_orders,
      COUNT(DISTINCT CASE 
        WHEN o."userId" IS NULL AND u.id IS NOT NULL 
        THEN o.id 
      END) as null_userId_with_user_exists,
      COUNT(DISTINCT CASE 
        WHEN o."userId" IS NOT NULL AND u.id IS NOT NULL AND o."userId" != u.id 
        THEN o.id 
      END) as mismatched_orders
    FROM orders o
    LEFT JOIN users u ON o.email = u.email
    WHERE o.status = 'completed'
  `);

  console.log('\n📊 Estatísticas de ownership (pedidos completed):');
  const stats = mismatchQuery[0] as Record<string, unknown>;
  console.log(`   Total de pedidos completed: ${stats?.total_orders || 0}`);
  console.log(`   Pedidos com userId correto: ${stats?.matching_orders || 0}`);
  console.log(
    `   Pedidos com userId NULL (mas usuário existe): ${stats?.null_userid_with_user_exists || 0}`
  );
  console.log(`   Pedidos com userId INCORRETO: ${stats?.mismatched_orders || 0}`);

  console.log('\n✅ Análise concluída!');
}

checkOrderOwnership()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
