/**
 * Script de Importação de Pedidos do WordPress
 *
 * Importa pedidos e order items do WooCommerce
 *
 * Uso:
 *   npx tsx scripts/migration/import-orders.ts [csv-pedidos] [csv-items]
 */

import { db } from '@/lib/db';
import { orders, orderItems, users, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

interface WordPressOrder {
  order_id: string;
  order_date: string;
  order_status: string;
  updated_at?: string;

  // Cliente
  customer_user_id?: string;
  customer_email: string;
  billing_first_name?: string;
  billing_last_name?: string;

  // Endereço cobrança
  billing_address_1?: string;
  billing_address_2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postcode?: string;
  billing_country?: string;
  billing_phone?: string;
  billing_cpf?: string;

  // Endereço entrega
  shipping_first_name?: string;
  shipping_last_name?: string;
  shipping_address_1?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postcode?: string;
  shipping_country?: string;

  // Valores
  order_total: string;
  order_subtotal?: string;
  order_tax?: string;
  shipping_total?: string;
  discount_total?: string;
  cart_discount?: string;

  // Moeda e cupons
  currency?: string;
  coupon_code?: string;

  // Pagamento
  payment_method?: string;
  payment_method_title?: string;
  transaction_id?: string;
  paid_date?: string;
  mercadopago_payment_id?: string;
  paypal_transaction_id?: string;
  stripe_charge_id?: string;

  // Informações extras
  customer_ip?: string;
  user_agent?: string;
  order_key?: string;
  customer_note?: string;
}

interface WordPressOrderItem {
  item_id: string;
  order_id: string;
  product_name: string;
  product_id: string;
  variation_id?: string;
  quantity: string;
  line_total: string;
  line_subtotal?: string;
  line_tax?: string;
  product_sku?: string;
  variation_data?: string;
  order_status?: string;
  item_type?: string;
}

function mapOrderStatus(wpStatus: string): string {
  const statusMap: Record<string, string> = {
    'wc-completed': 'completed',
    'wc-processing': 'processing',
    'wc-pending': 'pending',
    'wc-on-hold': 'pending',
    'wc-cancelled': 'cancelled',
    'wc-refunded': 'refunded',
    'wc-failed': 'cancelled',
  };
  return statusMap[wpStatus] || 'pending';
}

async function importOrders(
  ordersPath: string = 'data/test/test-pedidos.csv',
  itemsPath: string = 'data/test/test-order-items.csv'
) {
  console.log('🚀 Iniciando importação de pedidos...\n');
  console.log(`📂 Pedidos: ${ordersPath}`);
  console.log(`📂 Items:   ${itemsPath}\n`);

  // Verificar arquivos
  if (!fs.existsSync(ordersPath)) {
    console.error(`❌ Arquivo de pedidos não encontrado: ${ordersPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(itemsPath)) {
    console.error(`❌ Arquivo de items não encontrado: ${itemsPath}`);
    process.exit(1);
  }

  // Ler CSVs com remoção de BOM
  let ordersContent = fs.readFileSync(ordersPath, 'utf-8');
  if (ordersContent.charCodeAt(0) === 0xfeff) {
    ordersContent = ordersContent.substring(1);
    console.log('✅ BOM removido do arquivo de pedidos');
  }

  const wpOrders: WordPressOrder[] = parse(ordersContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  let itemsContent = fs.readFileSync(itemsPath, 'utf-8');
  if (itemsContent.charCodeAt(0) === 0xfeff) {
    itemsContent = itemsContent.substring(1);
    console.log('✅ BOM removido do arquivo de items');
  }

  const wpItems: WordPressOrderItem[] = parse(itemsContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`📊 Total de pedidos: ${wpOrders.length}`);
  console.log(`📊 Total de items:   ${wpItems.length}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: { orderId: string; error: string }[] = [];

  for (const [index, wpOrder] of wpOrders.entries()) {
    try {
      // Verificar se o pedido já existe
      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.wpOrderId, parseInt(wpOrder.order_id)))
        .limit(1);

      if (existingOrder.length > 0) {
        console.log(
          `⏭️  [${index + 1}/${wpOrders.length}] Pedido #${wpOrder.order_id} já existe no banco`
        );
        skipped++;
        continue;
      }

      // Buscar usuário pelo email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, wpOrder.customer_email.toLowerCase()))
        .limit(1);

      if (!user) {
        console.log(
          `⏭️  [${index + 1}/${wpOrders.length}] Usuário não encontrado: ${wpOrder.customer_email}`
        );
        skipped++;
        continue;
      }

      // Calcular subtotal dos itens
      const orderItemsForThisOrder = wpItems.filter(item => item.order_id === wpOrder.order_id);

      const calculatedSubtotal = orderItemsForThisOrder.reduce(
        (sum, item) => sum + parseFloat(item.line_total || '0'),
        0
      );

      // Usar valores do CSV ou calcular
      const subtotal = wpOrder.order_subtotal
        ? parseFloat(wpOrder.order_subtotal)
        : calculatedSubtotal;

      const total = wpOrder.order_total ? parseFloat(wpOrder.order_total) : calculatedSubtotal;

      const discountAmount = wpOrder.discount_total || wpOrder.cart_discount || '0';

      // Criar ou buscar pedido existente
      const wpOrderId = wpOrder.order_id ? parseInt(wpOrder.order_id, 10) : null;

      // Verificar se pedido já existe
      let order;
      if (wpOrderId) {
        const [existingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.wpOrderId, wpOrderId))
          .limit(1);

        if (existingOrder) {
          console.log(
            `⏭️  [${index + 1}/${wpOrders.length}] Pedido WP #${wpOrderId} já existe, apenas importando items faltantes...`
          );
          order = existingOrder;
          
          // Pular para importar apenas os items
          let itemsCreated = 0;
          const orderItemsForThisOrder = wpItems.filter(
            item => item.order_id === wpOrder.order_id
          );

          for (const item of orderItemsForThisOrder) {
            try {
              // Validar product_id
              if (!item.product_id || item.product_id === '0' || item.product_id === 'undefined') {
                continue;
              }

              // Parse WordPress item_id
              const wpItemId = parseInt(item.item_id);
              if (isNaN(wpItemId)) {
                continue;
              }

              // Check if item already exists
              const [existingItem] = await db
                .select()
                .from(orderItems)
                .where(eq(orderItems.wpItemId, wpItemId))
                .limit(1);

              if (existingItem) {
                continue;
              }

              // Buscar produto pelo wpProductId
              const wpProductId = parseInt(item.product_id);
              if (isNaN(wpProductId)) {
                continue;
              }

              const [product] = await db
                .select()
                .from(products)
                .where(eq(products.wpProductId, wpProductId))
                .limit(1);

              if (!product) {
                console.log(`   ⚠️ Produto WP #${wpProductId} não encontrado: ${item.product_name}`);
                continue;
              }

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
                createdAt: new Date(wpOrder.order_date),
              });

              itemsCreated++;
            } catch (itemError) {
              const err = itemError as Error;
              console.log(`   ⚠️ Erro ao criar item: ${err.message}`);
            }
          }

          console.log(
            `✅ [${index + 1}/${wpOrders.length}] Pedido #${wpOrder.order_id} → ${itemsCreated} items adicionados`
          );
          success++;
          continue; // Próximo pedido
        }
      }

      // Determinar paymentId baseado no gateway
      let paymentId: string | null = null;
      if (wpOrder.mercadopago_payment_id) {
        paymentId = wpOrder.mercadopago_payment_id;
      } else if (wpOrder.paypal_transaction_id) {
        paymentId = wpOrder.paypal_transaction_id;
      } else if (wpOrder.stripe_charge_id) {
        paymentId = wpOrder.stripe_charge_id;
      } else if (wpOrder.transaction_id) {
        paymentId = wpOrder.transaction_id;
      }

      [order] = await db
        .insert(orders)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          email: wpOrder.customer_email.toLowerCase(),
          status: mapOrderStatus(wpOrder.order_status),
          subtotal: subtotal.toFixed(2),
          discountAmount: parseFloat(discountAmount).toFixed(2),
          total: total.toFixed(2),
          currency: wpOrder.currency || 'BRL',
          paymentProvider: wpOrder.payment_method || 'unknown',
          paymentId: paymentId,
          paymentStatus: wpOrder.order_status === 'wc-completed' ? 'paid' : 'pending',
          wpOrderId: wpOrderId,
          paidAt: wpOrder.paid_date
            ? new Date(wpOrder.paid_date)
            : wpOrder.order_status === 'wc-completed'
              ? new Date(wpOrder.order_date)
              : null,
          createdAt: new Date(wpOrder.order_date),
          updatedAt: wpOrder.updated_at ? new Date(wpOrder.updated_at) : new Date(),
        })
        .returning();

      // Criar items do pedido
      let itemsCreated = 0;
      for (const item of orderItemsForThisOrder) {
        try {
          // Validar product_id
          if (!item.product_id || item.product_id === '0' || item.product_id === 'undefined') {
            console.log(`   ⚠️ Item sem product_id válido: ${item.product_name}`);
            continue;
          }

          // Parse WordPress item_id (somente para migração)
          const wpItemId = parseInt(item.item_id);
          if (isNaN(wpItemId)) {
            console.log(`   ⚠️ item_id inválido para: ${item.product_name} (${item.item_id})`);
            continue;
          }

          // Check if item already exists (prevent duplicates from re-imports)
          // Nota: novos pedidos do sistema não terão wpItemId, então isso só afeta migração
          const [existingItem] = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.wpItemId, wpItemId))
            .limit(1);

          if (existingItem) {
            console.log(`   ⏭️ Item WP #${wpItemId} já existe, pulando...`);
            itemsCreated++; // Contar como "criado" para não afetar estatísticas
            continue;
          }

          // Buscar produto pelo wpProductId
          const wpProductId = parseInt(item.product_id);
          if (isNaN(wpProductId)) {
            console.log(
              `   ⚠️ product_id inválido para: ${item.product_name} (${item.product_id})`
            );
            continue;
          }

          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.wpProductId, wpProductId))
            .limit(1);

          if (!product) {
            console.log(`   ⚠️ Produto WP #${wpProductId} não encontrado: ${item.product_name}`);
            continue;
          }

          await db.insert(orderItems).values({
            id: crypto.randomUUID(),
            orderId: order.id,
            productId: product.id,
            variationId: null,
            name: item.product_name,
            price: (parseFloat(item.line_total) / parseFloat(item.quantity)).toFixed(2),
            quantity: parseInt(item.quantity) || 1,
            total: item.line_total || '0',
            wpItemId, // Preserve WordPress item_id
            createdAt: new Date(wpOrder.order_date),
          });

          itemsCreated++;
        } catch (itemError) {
          const err = itemError as Error;
          console.log(`   ⚠️ Erro ao criar item "${item.product_name}": ${err.message}`);
        }
      }

      console.log(
        `✅ [${index + 1}/${wpOrders.length}] Pedido #${wpOrder.order_id} → ${itemsCreated} items`
      );
      success++;
    } catch (error) {
      const err = error as Error;
      console.error(
        `❌ [${index + 1}/${wpOrders.length}] Erro no pedido #${wpOrder.order_id}:`,
        err.message
      );
      errors++;
      errorList.push({
        orderId: wpOrder.order_id,
        error: err.message,
      });
    }
  }

  // Relatório
  console.log('\n' + '='.repeat(60));
  console.log('📈 RELATÓRIO DE IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`Total no CSV:     ${wpOrders.length}`);
  console.log(`✅ Importados:    ${success} (${Math.round((success / wpOrders.length) * 100)}%)`);
  console.log(`⏭️  Pulados:       ${skipped} (${Math.round((skipped / wpOrders.length) * 100)}%)`);
  console.log(`❌ Erros:         ${errors} (${Math.round((errors / wpOrders.length) * 100)}%)`);
  console.log('='.repeat(60));

  if (errorList.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    errorList.forEach(({ orderId, error }) => {
      console.log(`   • Pedido #${orderId}: ${error}`);
    });
  }

  if (success > 0) {
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar no Drizzle Studio: npm run db:studio');
    console.log('   2. Importar permissões de download');
  }

  console.log('\n✨ Importação concluída!\n');
}

const ordersPath = process.argv[2] || 'data/test/test-pedidos.csv';
const itemsPath = process.argv[3] || 'data/test/test-order-items.csv';
importOrders(ordersPath, itemsPath).catch(console.error);
