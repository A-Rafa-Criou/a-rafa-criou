/**
 * Script para importar items dos pedidos WordPress APENAS COM NOMES
 * Não cria produtos, apenas registra os nomes históricos para você adicionar manualmente depois
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { orders, orderItems } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

interface OrderItemRow {
  item_id: string;
  order_id: string;
  product_name: string;
  quantity: string;
  line_subtotal: string;
  line_total: string;
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('❌ Uso: npx tsx import-order-items-names-only.ts <caminho-do-csv>');
    process.exit(1);
  }

  console.log('\n🚀 Importando items dos pedidos (apenas nomes)...\n');

  // Ler CSV de items
  console.log('📄 Lendo CSV de items...');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const records: OrderItemRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 ${records.length} items encontrados no CSV\n`);

  // Agrupar items por pedido
  const itemsByOrder = new Map<string, OrderItemRow[]>();

  for (const item of records) {
    const orderId = item.order_id;
    if (!itemsByOrder.has(orderId)) {
      itemsByOrder.set(orderId, []);
    }
    itemsByOrder.get(orderId)!.push(item);
  }

  console.log(`📦 ${itemsByOrder.size} pedidos únicos\n`);

  // Processar cada pedido
  let itemsAdded = 0;
  let ordersSkipped = 0;
  let ordersProcessed = 0;
  let ordersNotFound = 0;

  for (const [wpOrderId, items] of itemsByOrder) {
    ordersProcessed++;

    if (ordersProcessed % 50 === 0) {
      process.stdout.write(`\r🔄 [${ordersProcessed}/${itemsByOrder.size}] Processando...`);
    }

    // Buscar pedido no banco
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.wpOrderId, parseInt(wpOrderId)))
      .limit(1);

    if (!order) {
      ordersNotFound++;
      continue;
    }

    // Verificar se já tem items
    const existingItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .limit(1);

    if (existingItems.length > 0) {
      ordersSkipped++;
      continue;
    }

    // Criar items APENAS COM NOME (sem produto)
    for (const item of items) {
      const quantity = parseInt(item.quantity) || 1;
      const lineTotal = parseFloat(item.line_total) || 0;
      const unitPrice = lineTotal / quantity;

      await db.insert(orderItems).values({
        orderId: order.id,
        productId: null, // SEM PRODUTO - apenas nome histórico
        variationId: null,
        name: item.product_name.trim(), // Nome original do WordPress
        quantity,
        price: unitPrice.toFixed(2),
        total: lineTotal.toFixed(2),
        wpItemId: parseInt(item.item_id) || null,
      });

      itemsAdded++;
    }
  }

  console.log('\n\n============================================================');
  console.log('📈 RELATÓRIO DE IMPORTAÇÃO DE ITEMS');
  console.log('============================================================');
  console.log(`Pedidos processados:  ${ordersProcessed}`);
  console.log(`✅ Items adicionados:  ${itemsAdded}`);
  console.log(`⏭️  Pedidos pulados:    ${ordersSkipped} (já tinham items)`);
  console.log(`❌ Pedidos não encontr: ${ordersNotFound}`);
  console.log('============================================================');
  console.log('\n✨ Importação concluída!');
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('   1. Acesse /admin/pedidos');
  console.log('   2. Você verá a quantidade de items e os NOMES dos produtos');
  console.log('   3. Items aparecem SEM produto vinculado (productId = null)');
  console.log('   4. Você pode adicionar os produtos manualmente depois\n');

  await client.end();
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
