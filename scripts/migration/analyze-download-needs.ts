/**
 * Verificar necessidade de importar downloads
 * 
 * Como todos os produtos já foram comprados através de pedidos,
 * podemos criar as permissões de download automaticamente
 * baseado nos order_items existentes.
 */

import { db } from '../../src/lib/db';
import { orders, products, orderItems, downloadPermissions } from '../../src/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

async function analyzeDownloadNeeds() {
  console.log('\n🔍 Analisando necessidade de downloads...\n');

  // 1. Contar pedidos completados
  const completedOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.status, 'completed'));

  console.log(`📦 Pedidos completados: ${completedOrders.length}`);

  // 2. Contar produtos digitais
  const digitalProducts = await db
    .select()
    .from(products)
    .where(isNotNull(products.wpProductId));

  console.log(`📄 Produtos no banco: ${digitalProducts.length}`);

  // 3. Contar items de pedidos completados
  const completedOrderIds = completedOrders.map(o => o.id);
  
  let totalItems = 0;
  for (const orderId of completedOrderIds) {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    totalItems += items.length;
  }

  console.log(`📋 Items em pedidos completados: ${totalItems}`);

  // 4. Verificar se já existem permissões
  const existingPermissions = await db.select().from(downloadPermissions);
  
  console.log(`🔑 Permissões já criadas: ${existingPermissions.length}`);

  console.log('\n💡 CONCLUSÃO:\n');
  
  if (existingPermissions.length === 0) {
    console.log('Nenhuma permissão existe ainda.');
    console.log('\n📋 OPÇÕES:\n');
    console.log('1️⃣  Exportar do WordPress (recomendado se tiver dados históricos)');
    console.log('   → Garante dados exatos (downloads restantes, expirações)');
    console.log('   → Use: scripts/migration/export-downloads-permissions-simple.sql\n');
    console.log('2️⃣  Criar automaticamente baseado em order_items');
    console.log('   → Mais rápido, todos terão download ilimitado');
    console.log('   → Use: npx tsx scripts/migration/create-download-permissions.ts\n');
  } else {
    console.log(`✅ Já existem ${existingPermissions.length} permissões no banco.`);
  }

  process.exit(0);
}

analyzeDownloadNeeds().catch(console.error);
