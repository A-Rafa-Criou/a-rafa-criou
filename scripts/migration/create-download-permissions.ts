import 'dotenv/config';
import { db } from '../../src/lib/db';
import { orders, orderItems, downloadPermissions, products } from '../../src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function createDownloadPermissions() {
  console.log('🔑 Criando permissões de download...\n');

  // Buscar todos os pedidos completados
  const completedOrders = await db
    .select()
    .from(orders)
    .where(inArray(orders.status, ['completed', 'processing']));

  console.log(`📦 Pedidos completados/processando: ${completedOrders.length}`);

  // Buscar todos os items desses pedidos
  const orderIds = completedOrders.map((o) => o.id);
  
  if (orderIds.length === 0) {
    console.log('❌ Nenhum pedido encontrado.');
    process.exit(0);
  }

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      order: {
        id: orders.id,
        userId: orders.userId,
        wpOrderId: orders.wpOrderId,
        createdAt: orders.createdAt,
      },
      product: {
        id: products.id,
        wpProductId: products.wpProductId,
        slug: products.slug,
      },
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(inArray(orderItems.orderId, orderIds));

  console.log(`📋 Items em pedidos completados: ${items.length}\n`);

  // Verificar permissões já existentes
  const existingPermissions = await db.select().from(downloadPermissions);
  console.log(`🔑 Permissões já existentes: ${existingPermissions.length}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  console.log('\n🔄 Criando permissões...\n');

  for (const item of items) {
    try {
      // Verificar se já existe permissão para este item
      const existing = existingPermissions.find(
        (p) =>
          p.orderId === item.orderId &&
          p.productId === item.productId &&
          p.orderItemId === item.id
      );

      if (existing) {
        skipped++;
        continue;
      }

      // Criar permissão com downloads ilimitados e sem expiração
      await db.insert(downloadPermissions).values({
        orderId: item.orderId,
        productId: item.productId,
        userId: item.order.userId,
        orderItemId: item.id,
        downloadsRemaining: null, // null = ilimitado
        accessGrantedAt: item.order.createdAt,
        accessExpiresAt: null, // null = nunca expira
        wpOrderId: item.order.wpOrderId,
        wpProductId: item.product.wpProductId,
      });

      created++;

      if (created % 100 === 0) {
        console.log(`  ✅ Criadas: ${created}...`);
      }
    } catch (error) {
      errors++;
      console.error(`  ❌ Erro ao criar permissão para item ${item.id}:`, error);
    }
  }

  console.log('\n============================================================');
  console.log('📈 RELATÓRIO DE CRIAÇÃO DE PERMISSÕES');
  console.log('============================================================');
  console.log(`Total de items:   ${items.length}`);
  console.log(`✅ Criadas:        ${created} (${((created / items.length) * 100).toFixed(1)}%)`);
  console.log(`⏭️  Já existiam:    ${skipped} (${((skipped / items.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Erros:          ${errors} (${((errors / items.length) * 100).toFixed(1)}%)`);
  console.log('============================================================');

  // Verificar resultado final
  const finalCount = await db.select().from(downloadPermissions);
  console.log(`\n🎉 Total de permissões no banco: ${finalCount.length}`);

  process.exit(0);
}

createDownloadPermissions().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
