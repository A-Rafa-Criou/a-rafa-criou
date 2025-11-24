/**
 * Script para verificar e criar permissões de download
 * para pedidos completados que não têm permissões
 *
 * Uso:
 * - npx tsx scripts/check-download-permissions.ts
 * - Adicione --fix para criar permissões automaticamente
 */

import { db } from '@/lib/db';
import { orders, orderItems, downloadPermissions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');

async function checkDownloadPermissions() {
  console.log('🔍 Verificando permissões de download...\n');

  // 1. Buscar todos os pedidos completados
  const completedOrders = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.status, 'completed'));

  console.log(`📦 Pedidos completados: ${completedOrders.length}`);

  // 2. Buscar permissões existentes
  const existingPermissions = await db
    .select({
      orderItemId: downloadPermissions.orderItemId,
      orderId: downloadPermissions.orderId,
      productId: downloadPermissions.productId,
      userId: downloadPermissions.userId,
    })
    .from(downloadPermissions);

  console.log(`🔑 Permissões existentes: ${existingPermissions.length}`);

  // 3. Identificar itens sem permissão
  const itemsWithoutPermission: Array<{
    orderItemId: string;
    orderId: string;
    productId: string;
    userId: string | null;
  }> = [];

  for (const order of completedOrders) {
    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    for (const item of orderItemsList) {
      // Pular items históricos sem produto vinculado
      if (!item.productId) {
        console.log(`   ⏭️  Pulando item histórico sem produto: ${item.name}`);
        continue;
      }

      const hasPermission = existingPermissions.some(
        p => p.orderItemId === item.id && p.orderId === order.id
      );

      if (!hasPermission) {
        itemsWithoutPermission.push({
          orderItemId: item.id,
          orderId: order.id,
          productId: item.productId,
          userId: order.userId,
        });
      }
    }
  }

  console.log(`\n⚠️  Itens SEM permissão: ${itemsWithoutPermission.length}\n`);

  if (itemsWithoutPermission.length === 0) {
    console.log('✅ Todas as permissões estão corretas!\n');
    return;
  }

  // Mostrar detalhes
  console.log('📋 Detalhes dos itens sem permissão:');
  for (const item of itemsWithoutPermission.slice(0, 10)) {
    console.log(
      `   - Order: ${item.orderId.substring(0, 8)}... | Product: ${item.productId.substring(0, 8)}...`
    );
  }
  if (itemsWithoutPermission.length > 10) {
    console.log(`   ... e mais ${itemsWithoutPermission.length - 10} itens`);
  }

  if (shouldFix) {
    console.log('\n🔧 Criando permissões de download...\n');

    let created = 0;
    for (const item of itemsWithoutPermission) {
      try {
        await db.insert(downloadPermissions).values({
          orderId: item.orderId,
          productId: item.productId,
          userId: item.userId!,
          orderItemId: item.orderItemId,
          downloadsRemaining: null, // Ilimitado
          accessGrantedAt: new Date(),
          accessExpiresAt: null, // Nunca expira
          downloadLimit: 10, // Limite de 10 downloads
          downloadCount: 0,
          watermarkEnabled: true,
          watermarkText: null,
        });
        created++;
        console.log(`   ✅ Permissão criada para item ${item.orderItemId.substring(0, 8)}...`);
      } catch (error) {
        console.error(
          `   ❌ Erro ao criar permissão para item ${item.orderItemId}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(`\n✅ ${created} permissão(ões) criada(s) com sucesso!`);
    console.log('💡 Os usuários agora podem acessar seus downloads em /conta/downloads\n');
  } else {
    console.log('\n💡 Execute com --fix para criar as permissões automaticamente:');
    console.log('   npx tsx scripts/check-download-permissions.ts --fix\n');
  }
}

checkDownloadPermissions()
  .then(() => {
    console.log('✅ Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
