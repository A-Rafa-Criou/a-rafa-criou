import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function cleanOldMigrationItems() {
  console.log('🧹 Limpando order_items da migração antiga...\n');

  try {
    // Contar quantos items serão deletados
    const countResult = await client`
      SELECT COUNT(*) as count 
      FROM order_items 
      WHERE wp_item_id IS NULL
    `;
    const count = Number(countResult[0]?.count) || 0;
    console.log(`📊 Items sem wp_item_id (migração antiga): ${count}\n`);

    if (count === 0) {
      console.log('✨ Nenhum item antigo para limpar!\n');
      await client.end();
      return;
    }

    // Deletar items sem wp_item_id (da migração antiga)
    const result = await client`
      DELETE FROM order_items 
      WHERE wp_item_id IS NULL
    `;

    console.log(`✅ ${result.count || 0} items da migração antiga removidos\n`);
    console.log(
      '💡 Agora rode: npx tsx scripts/migration/import-orders.ts data/test/test-pedidos.csv data/test/order-items-completo.csv\n'
    );

    await client.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

cleanOldMigrationItems().catch(console.error);
