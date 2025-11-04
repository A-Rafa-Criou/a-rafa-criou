/**
 * Script de Importação de Downloads/Permissões do WordPress
 * 
 * Importa permissões de download de produtos digitais do WooCommerce
 * para permitir que clientes façam re-download dos PDFs comprados
 * 
 * Uso:
 *   npx tsx scripts/migration/import-downloads.ts [caminho-csv]
 */

import { db } from '../../src/lib/db';
import { orders, products, orderItems, downloadPermissions } from '../../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

interface WordPressDownload {
  download_id: string;
  permission_id: string;
  order_id: string;
  product_id: string;
  download_key: string;
  user_email: string;
  user_id: string;
  order_key: string;
  downloads_remaining: string | null;
  access_granted: string;
  access_expires: string | null;
  order_status: string;
  product_name: string;
  product_slug: string;
  downloadable_files_json: string | null;
  billing_email: string;
  customer_name: string;
  order_date: string;
}

async function importDownloads() {
  const csvPath = process.argv[2] || 'data/test/downloads-permissions.csv';

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo não encontrado: ${csvPath}`);
    console.log('\n📋 COMO EXPORTAR OS DADOS:\n');
    console.log('1. Acesse o WordPress (Adminer ou phpMyAdmin)');
    console.log('2. Execute a query em: scripts/migration/export-downloads-permissions.sql');
    console.log('3. Salve como CSV com UTF-8 BOM');
    console.log('4. Coloque em: data/test/downloads-permissions.csv');
    console.log('5. Execute este script novamente\n');
    process.exit(1);
  }

  console.log('\n🔄 Iniciando importação de downloads/permissões...\n');

  // Ler e parsear CSV
  let csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Remover BOM se existir
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.substring(1);
  }

  const wpDownloads: WordPressDownload[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`📦 Total de permissões no CSV: ${wpDownloads.length}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const [index, wpDownload] of wpDownloads.entries()) {
    try {
      const wpOrderId = parseInt(wpDownload.order_id);
      const wpProductId = parseInt(wpDownload.product_id);

      // Buscar pedido no Next.js
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.wpOrderId, wpOrderId))
        .limit(1);

      if (!order) {
        console.log(`⏭️  [${index + 1}/${wpDownloads.length}] Pedido WP #${wpOrderId} não encontrado no banco`);
        skipped++;
        continue;
      }

      // Buscar produto no Next.js
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.wpProductId, wpProductId))
        .limit(1);

      if (!product) {
        console.log(`⏭️  [${index + 1}/${wpDownloads.length}] Produto WP #${wpProductId} não encontrado no banco`);
        skipped++;
        continue;
      }

      // Buscar orderItem correspondente
      const [orderItem] = await db
        .select()
        .from(orderItems)
        .where(
          and(
            eq(orderItems.orderId, order.id),
            eq(orderItems.productId, product.id)
          )
        )
        .limit(1);

      if (!orderItem) {
        console.log(`⏭️  [${index + 1}/${wpDownloads.length}] Item do pedido não encontrado (Pedido: ${wpOrderId}, Produto: ${wpProductId})`);
        skipped++;
        continue;
      }

      // Atualizar orderItem com informações de download
      const downloadsRemaining = wpDownload.downloads_remaining 
        ? parseInt(wpDownload.downloads_remaining) 
        : null; // null = ilimitado

      const accessGrantedAt = wpDownload.access_granted 
        ? new Date(wpDownload.access_granted)
        : new Date();

      const accessExpiresAt = wpDownload.access_expires 
        ? new Date(wpDownload.access_expires) 
        : null; // null = nunca expira

      // Criar permissão de download
      await db.insert(downloadPermissions).values({
        orderId: order.id,
        productId: product.id,
        userId: order.userId,
        orderItemId: orderItem.id,
        downloadsRemaining,
        accessGrantedAt,
        accessExpiresAt,
        wpOrderId,
        wpProductId,
        wpDownloadKey: wpDownload.download_key
      });

      console.log(`✅ [${index + 1}/${wpDownloads.length}] Download habilitado - Pedido #${wpOrderId} - ${product.name}${downloadsRemaining !== null ? ` (${downloadsRemaining} downloads)` : ' (ilimitado)'}`);
      success++;

    } catch (error) {
      const errorMsg = `Erro no download ${wpDownload.download_id}: ${error instanceof Error ? error.message : String(error)}`;
      errorDetails.push(errorMsg);
      console.error(`❌ [${index + 1}/${wpDownloads.length}] ${errorMsg}`);
      errors++;
    }
  }

  // Relatório final
  console.log('\n============================================================');
  console.log('📈 RELATÓRIO DE IMPORTAÇÃO DE DOWNLOADS');
  console.log('============================================================');
  console.log(`Total no CSV:     ${wpDownloads.length}`);
  console.log(`✅ Importados:    ${success} (${Math.round(success / wpDownloads.length * 100)}%)`);
  console.log(`⏭️  Pulados:       ${skipped} (${Math.round(skipped / wpDownloads.length * 100)}%)`);
  console.log(`❌ Erros:         ${errors} (${Math.round(errors / wpDownloads.length * 100)}%)`);
  console.log('============================================================\n');

  if (errorDetails.length > 0) {
    console.log('⚠️  ERROS DETALHADOS:\n');
    errorDetails.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
    console.log('');
  }

  console.log('✨ Importação concluída!\n');
  process.exit(0);
}

importDownloads().catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
