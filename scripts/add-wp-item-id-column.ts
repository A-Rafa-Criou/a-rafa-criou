import 'dotenv/config';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function addWpItemIdColumn() {
  console.log('➕ Adicionando coluna wp_item_id...\n');

  try {
    // Adicionar coluna
    await db.execute(sql`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS wp_item_id integer
    `);
    console.log('✅ Coluna wp_item_id adicionada\n');

    // Criar índice
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS order_items_wp_item_id_idx 
      ON order_items(wp_item_id)
    `);
    console.log('✅ Índice criado\n');

    console.log('✨ Pronto! Agora pode rodar o import-orders.ts\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

addWpItemIdColumn().catch(console.error);
