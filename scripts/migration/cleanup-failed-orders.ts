import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { db } from '../../src/lib/db';
import { orders } from '../../src/lib/db/schema';

interface CsvRecord {
  order_id: string;
  customer_email: string;
  [key: string]: string;
}

async function cleanupOrders() {
  console.log('\n🔍 Analisando pedidos importados...\n');

  // 1. Buscar todos os pedidos importados
  const importedOrders = await db.select({ wpOrderId: orders.wpOrderId }).from(orders);

  const importedIds = new Set(importedOrders.map(o => o.wpOrderId?.toString()));
  console.log(`✅ Pedidos importados no banco: ${importedOrders.length}`);

  // 2. Ler CSV de pedidos
  let pedidosCsv = fs.readFileSync('data/test/pedidos-completo.csv', 'utf-8');
  if (pedidosCsv.charCodeAt(0) === 0xfeff) {
    pedidosCsv = pedidosCsv.substring(1);
  }
  const pedidosRecords = parse(pedidosCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRecord[];

  // 3. Filtrar apenas os importados
  const importedRecords = pedidosRecords.filter(r => importedIds.has(r.order_id));
  const notImportedRecords = pedidosRecords.filter(r => !importedIds.has(r.order_id));

  console.log(`📊 Total de pedidos no CSV: ${pedidosRecords.length}`);
  console.log(`✅ Importados: ${importedRecords.length}`);
  console.log(`⏭️  Não importados: ${notImportedRecords.length}\n`);

  // 4. Ler CSV de items
  let itemsCsv = fs.readFileSync('data/test/order-items-completo.csv', 'utf-8');
  if (itemsCsv.charCodeAt(0) === 0xfeff) {
    itemsCsv = itemsCsv.substring(1);
  }
  const itemsRecords = parse(itemsCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRecord[];

  // 5. Filtrar apenas items de pedidos importados
  const importedItems = itemsRecords.filter(r => importedIds.has(r.order_id));
  const notImportedItems = itemsRecords.filter(r => !importedIds.has(r.order_id));

  console.log(`📦 Total de items no CSV: ${itemsRecords.length}`);
  console.log(`✅ Items de pedidos importados: ${importedItems.length}`);
  console.log(`⏭️  Items de pedidos não importados: ${notImportedItems.length}\n`);

  // 6. Criar backups
  console.log('💾 Criando backups...');
  if (!fs.existsSync('data/test/backup')) {
    fs.mkdirSync('data/test/backup', { recursive: true });
  }

  fs.copyFileSync(
    'data/test/pedidos-completo.csv',
    'data/test/backup/pedidos-completo-original.csv'
  );
  fs.copyFileSync(
    'data/test/order-items-completo.csv',
    'data/test/backup/order-items-completo-original.csv'
  );
  console.log('✅ Backups criados em data/test/backup/\n');

  // 7. Criar novos arquivos apenas com importados
  const pedidosImportadosCsv = stringify(importedRecords, {
    header: true,
    columns: pedidosRecords[0] ? Object.keys(pedidosRecords[0]) : undefined,
  });

  const itemsImportadosCsv = stringify(importedItems, {
    header: true,
    columns: itemsRecords[0] ? Object.keys(itemsRecords[0]) : undefined,
  });

  fs.writeFileSync('data/test/pedidos-importados.csv', pedidosImportadosCsv, 'utf-8');
  fs.writeFileSync('data/test/items-importados.csv', itemsImportadosCsv, 'utf-8');

  console.log('✅ Arquivos criados:');
  console.log('   - data/test/pedidos-importados.csv');
  console.log('   - data/test/items-importados.csv\n');

  // 8. Criar arquivo com pedidos NÃO importados (para análise)
  const pedidosNaoImportadosCsv = stringify(notImportedRecords, {
    header: true,
    columns: pedidosRecords[0] ? Object.keys(pedidosRecords[0]) : undefined,
  });

  fs.writeFileSync('data/test/pedidos-nao-importados.csv', pedidosNaoImportadosCsv, 'utf-8');

  console.log('📋 Análise dos não importados:');
  console.log(`   - ${notImportedRecords.length} pedidos pulados`);
  console.log('   - Arquivo: data/test/pedidos-nao-importados.csv\n');

  // 9. Mostrar motivos dos não importados
  const emailsNaoImportados = new Set(
    notImportedRecords.map(r => r.customer_email).filter(Boolean)
  );
  console.log(`👥 Clientes únicos não importados: ${emailsNaoImportados.size}`);
  console.log('\nPrimeiros 10 emails:');
  Array.from(emailsNaoImportados)
    .slice(0, 10)
    .forEach(email => console.log(`   - ${email}`));

  console.log('\n✨ Limpeza concluída!\n');
  console.log('📊 RESUMO:');
  console.log(`   ✅ Pedidos mantidos: ${importedRecords.length}`);
  console.log(`   ✅ Items mantidos: ${importedItems.length}`);
  console.log(`   ⏭️  Pedidos pulados: ${notImportedRecords.length}`);
  console.log(`   📁 Backups salvos em: data/test/backup/\n`);

  process.exit(0);
}

cleanupOrders().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
