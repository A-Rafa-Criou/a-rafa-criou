/**
 * Script de Importação APENAS de Pedidos (sem items)
 *
 * Importa pedidos do WooCommerce sem criar order items
 *
 * Uso:
 *   npx tsx scripts/migration/import-orders-only.ts [csv-pedidos]
 */

import { db } from '@/lib/db';
import { orders, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

interface WordPressOrder {
  order_id: string;
  order_date: string;
  order_status: string;
  updated_at?: string;
  customer_email: string;
  order_total: string;
  order_subtotal?: string;
  discount_total?: string;
  cart_discount?: string;
  currency?: string;
  coupon_code?: string;
  payment_method?: string;
  paid_date?: string;
  mercadopago_payment_id?: string;
  paypal_transaction_id?: string;
  stripe_charge_id?: string;
  transaction_id?: string;
}

function mapOrderStatus(wpStatus: string): string {
  const statusMap: Record<string, string> = {
    'wc-completed': 'completed',
    'wc-processing': 'processing',
    'wc-pending': 'pending',
    'wc-on-hold': 'pending',
    'wc-cancelled': 'cancelled',
    'wc-refunded': 'refunded',
    'wc-failed': 'failed',
    paid: 'completed',
    pending: 'pending',
    processing: 'processing',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    failed: 'failed',
  };

  return statusMap[wpStatus] || 'pending';
}

async function importOrdersOnly(ordersCsvPath: string) {
  console.log('🚀 Iniciando importação de pedidos (sem items)...\n');
  console.log(`📂 Pedidos: ${ordersCsvPath}\n`);

  // Ler CSV
  let ordersCsv = fs.readFileSync(ordersCsvPath, 'utf-8');

  // Remover BOM se existir
  if (ordersCsv.charCodeAt(0) === 0xfeff) {
    ordersCsv = ordersCsv.substring(1);
    console.log('✅ BOM removido do arquivo');
  }

  const wpOrders: WordPressOrder[] = parse(ordersCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Total de pedidos: ${wpOrders.length}\n`);
  console.log('='.repeat(60));

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: { orderId: string; error: string }[] = [];

  for (const [index, wpOrder] of wpOrders.entries()) {
    try {
      // Verificar se pedido já existe
      const wpOrderId = parseInt(wpOrder.order_id);
      if (!isNaN(wpOrderId)) {
        const [existingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.wpOrderId, wpOrderId))
          .limit(1);

        if (existingOrder) {
          console.log(`⏭️  [${index + 1}/${wpOrders.length}] Pedido WP #${wpOrderId} já existe`);
          skipped++;
          continue;
        }
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

      // Valores
      const subtotal = wpOrder.order_subtotal
        ? parseFloat(wpOrder.order_subtotal)
        : parseFloat(wpOrder.order_total);
      const total = parseFloat(wpOrder.order_total);
      const discountAmount = wpOrder.discount_total || wpOrder.cart_discount || '0';

      // Determinar paymentId
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

      // Criar pedido
      await db.insert(orders).values({
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
        wpOrderId: !isNaN(wpOrderId) ? wpOrderId : null,
        paidAt: wpOrder.paid_date
          ? new Date(wpOrder.paid_date)
          : wpOrder.order_status === 'wc-completed'
            ? new Date(wpOrder.order_date)
            : null,
        createdAt: new Date(wpOrder.order_date),
        updatedAt: wpOrder.updated_at ? new Date(wpOrder.updated_at) : new Date(),
      });

      console.log(`✅ [${index + 1}/${wpOrders.length}] Pedido #${wpOrder.order_id} criado`);
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

  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('   1. Rodar: npx tsx scripts/migration/reimport-order-items.ts');
  console.log('   2. Verificar no admin: /admin/pedidos');

  console.log('\n✨ Importação concluída!\n');
}

const ordersPath = process.argv[2] || 'data/test/pedidos-completo.csv';
importOrdersOnly(ordersPath).catch(console.error);
