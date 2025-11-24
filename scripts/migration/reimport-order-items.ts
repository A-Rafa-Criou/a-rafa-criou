/**
 * Script de Re-importação de Order Items
 *
 * Adiciona items faltantes aos pedidos existentes usando wp_item_id
 *
 * Uso:
 *   npx tsx scripts/migration/reimport-order-items.ts [csv-items]
 */

import { db } from '@/lib/db';
import { orders, orderItems, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

interface WordPressOrderItem {
  item_id: string;
  order_id: string;
  product_name: string;
  product_id: string;
  variation_id: string;
  quantity: string;
  line_total: string;
  line_subtotal: string;
  line_tax: string;
  product_sku: string;
  variation_data: string;
  order_status: string;
}

async function reimportOrderItems(itemsCsvPath: string) {
  console.log('🚀 Iniciando re-importação de order items...\n');
  console.log(`📂 Items: ${itemsCsvPath}\n`);

  // Ler CSV
  let itemsCsv = fs.readFileSync(itemsCsvPath, 'utf-8');

  // Remover BOM se existir
  if (itemsCsv.charCodeAt(0) === 0xfeff) {
    itemsCsv = itemsCsv.substring(1);
    console.log('✅ BOM removido do arquivo de items');
  }

  const wpItems: WordPressOrderItem[] = parse(itemsCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Total de items no CSV: ${wpItems.length}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: { itemId: string; error: string }[] = [];

  // Agrupar items por order_id
  const itemsByOrder = new Map<string, WordPressOrderItem[]>();
  for (const item of wpItems) {
    if (!itemsByOrder.has(item.order_id)) {
      itemsByOrder.set(item.order_id, []);
    }
    itemsByOrder.get(item.order_id)!.push(item);
  }

  console.log(`📦 Total de pedidos únicos: ${itemsByOrder.size}\n`);
  console.log('='.repeat(60));

  let processedOrders = 0;

  for (const [wpOrderId, items] of itemsByOrder) {
    processedOrders++;

    try {
      // Buscar pedido existente pelo wpOrderId
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.wpOrderId, parseInt(wpOrderId)))
        .limit(1);

      if (!order) {
        console.log(`⏭️  [${processedOrders}/${itemsByOrder.size}] Pedido WP #${wpOrderId} não encontrado no banco`);
        skipped++;
        continue;
      }

      let itemsAdded = 0;

      // Processar cada item
      for (const item of items) {
        try {
          // Validar item_id
          const wpItemId = parseInt(item.item_id);
          if (isNaN(wpItemId)) {
            continue;
          }

          // Verificar se item já existe
          const [existingItem] = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.wpItemId, wpItemId))
            .limit(1);

          if (existingItem) {
            continue; // Item já existe, pular
          }

          // Validar product_id
          if (!item.product_id || item.product_id === '0' || item.product_id === 'undefined') {
            console.log(`   ⚠️ Item #${wpItemId} sem product_id válido`);
            continue;
          }

          // Buscar produto pelo slug ou name (já que não temos wpProductId em products)
          // Vamos tentar pelo nome primeiro
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.name, item.product_name.trim()))
            .limit(1);

          if (!product) {
            console.log(`   ⚠️ Produto "${item.product_name}" não encontrado`);
            continue;
          }

          // Criar order item
          await db.insert(orderItems).values({
            id: crypto.randomUUID(),
            orderId: order.id,
            productId: product.id,
            variationId: null,
            name: item.product_name,
            price: (parseFloat(item.line_total) / parseFloat(item.quantity)).toFixed(2),
            quantity: parseInt(item.quantity) || 1,
            total: item.line_total || '0',
            wpItemId,
            createdAt: order.createdAt,
          });

          itemsAdded++;
        } catch (itemError) {
          const err = itemError as Error;
          console.log(`   ⚠️ Erro no item #${item.item_id}: ${err.message}`);
        }
      }

      if (itemsAdded > 0) {
        console.log(`✅ [${processedOrders}/${itemsByOrder.size}] Pedido #${wpOrderId} → ${itemsAdded} items adicionados`);
        success++;
      }
    } catch (error) {
      const err = error as Error;
      console.error(`❌ [${processedOrders}/${itemsByOrder.size}] Erro no pedido #${wpOrderId}:`, err.message);
      errors++;
      errorList.push({
        itemId: wpOrderId,
        error: err.message,
      });
    }
  }

  // Relatório
  console.log('\n' + '='.repeat(60));
  console.log('📈 RELATÓRIO DE RE-IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`Pedidos processados: ${processedOrders}`);
  console.log(`✅ Items adicionados:  ${success}`);
  console.log(`⏭️  Pulados:            ${skipped}`);
  console.log(`❌ Erros:              ${errors}`);
  console.log('='.repeat(60));

  if (errorList.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    errorList.forEach(({ itemId, error }) => {
      console.log(`   • Pedido #${itemId}: ${error}`);
    });
  }

  console.log('\n✨ Re-importação concluída!\n');
}

const itemsPath = process.argv[2] || 'data/test/order-items-completo.csv';
reimportOrderItems(itemsPath).catch(console.error);
