import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function cleanupOrphanedData() {
  console.log('🧹 Limpando dados órfãos...\n');

  try {
    // 1. Deletar variation_attribute_values com variation_id inexistente
    console.log('1️⃣ Limpando variation_attribute_values órfãos...');
    const result1 = await client`
      DELETE FROM variation_attribute_values
      WHERE variation_id NOT IN (SELECT id FROM product_variations)
    `;
    console.log(`   ✅ ${result1.count || 0} registros removidos\n`);

    // 2. Deletar order_items sem order válido
    console.log('2️⃣ Limpando order_items órfãos...');
    const result2 = await client`
      DELETE FROM order_items
      WHERE order_id NOT IN (SELECT id FROM orders)
    `;
    console.log(`   ✅ ${result2.count || 0} registros removidos\n`);

    // 3. Deletar order_items com product_id não-null mas produto inexistente (pular items históricos com product_id = null)
    console.log('3️⃣ Limpando order_items com produtos inexistentes...');
    const result3 = await client`
      DELETE FROM order_items
      WHERE product_id IS NOT NULL AND product_id NOT IN (SELECT id FROM products)
    `;
    console.log(`   ✅ ${result3.count || 0} registros removidos\n`);

    console.log('✨ Limpeza concluída!\n');
    await client.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await client.end();
    throw error;
  }
}

cleanupOrphanedData().catch(console.error);
