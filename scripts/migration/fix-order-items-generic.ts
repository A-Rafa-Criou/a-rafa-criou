/**
 * Script para criar items genéricos para pedidos importados do WordPress
 * que não têm correspondência de produtos no banco atual
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { orders, orderItems, products } from '../../src/lib/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';
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
    console.error('❌ Uso: npx tsx fix-order-items-generic.ts <caminho-do-csv>');
    process.exit(1);
  }

  console.log('\n🚀 Iniciando criação de items genéricos...\n');

  // 1. Buscar ou criar produto genérico
  console.log('📦 Verificando produto genérico...');
  let genericProduct = await db
    .select()
    .from(products)
    .where(eq(products.name, 'Produto Importado do WordPress'))
    .limit(1);

  if (genericProduct.length === 0) {
    console.log('✨ Criando produto genérico...');
    const [newProduct] = await db
      .insert(products)
      .values({
        name: 'Produto Importado do WordPress',
        slug: 'produto-importado-wordpress',
        description:
          'Produto importado do antigo sistema WordPress - mantido para histórico de pedidos',
        price: '0',
        currency: 'BRL',
        isActive: false, // Inativo para não aparecer na loja
        stock: 0,
        lowStockThreshold: 0,
      })
      .returning();
    genericProduct = [newProduct];
  }

  const genericProductId = genericProduct[0].id;
  console.log(`✅ Produto genérico: ${genericProductId}`);

  // 2. Ler CSV de items
  console.log('\n📄 Lendo CSV de items...');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const records: OrderItemRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 ${records.length} items encontrados no CSV\n`);

  // 3. Agrupar items por pedido
  const itemsByOrder = new Map<string, OrderItemRow[]>();

  for (const item of records) {
    const orderId = item.order_id;
    if (!itemsByOrder.has(orderId)) {
      itemsByOrder.set(orderId, []);
    }
    itemsByOrder.get(orderId)!.push(item);
  }

  console.log(`📦 ${itemsByOrder.size} pedidos únicos\n`);

  // 4. Processar cada pedido
  let itemsAdded = 0;
  let ordersSkipped = 0;
  let ordersProcessed = 0;

  for (const [wpOrderId, items] of itemsByOrder) {
    ordersProcessed++;
    process.stdout.write(`\r🔄 Processando pedido ${ordersProcessed}/${itemsByOrder.size}...`);

    // Buscar pedido no banco
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.wpOrderId, parseInt(wpOrderId)))
      .limit(1);

    if (!order) {
      ordersSkipped++;
      continue;
    }

    // Verificar se já tem items
    const existingItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .limit(1);

    if (existingItems.length > 0) {
      continue; // Pular se já tem items
    }

    // Criar items genéricos baseados nos items originais
    for (const item of items) {
      const quantity = parseInt(item.quantity) || 1;
      const unitPrice = (parseFloat(item.line_total) || 0) / quantity;

      await db.insert(orderItems).values({
        orderId: order.id,
        productId: genericProductId,
        variationId: null,
        name: item.product_name, // Nome original do produto WordPress
        quantity,
        price: unitPrice.toFixed(2),
        currency: 'BRL',
        wpItemId: parseInt(item.item_id) || null,
      });

      itemsAdded++;
    }
  }

  console.log('\n\n============================================================');
  console.log('📈 RELATÓRIO DE CRIAÇÃO DE ITEMS GENÉRICOS');
  console.log('============================================================');
  console.log(`Pedidos processados: ${ordersProcessed}`);
  console.log(`✅ Items adicionados:  ${itemsAdded}`);
  console.log(`⏭️  Pedidos pulados:    ${ordersSkipped}`);
  console.log('============================================================');
  console.log('\n✨ Criação concluída!');
  console.log('\n💡 Próximos passos:');
  console.log('   1. Verificar no admin: /admin/pedidos');
  console.log('   2. Os items aparecerão como "Produto Importado do WordPress"');
  console.log('   3. Os valores e quantidades foram preservados\n');

  await client.end();
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
