import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log('\n🔧 Aplicando migration: product_id nullable...\n');

  try {
    // Tornar product_id nullable
    await client`ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL`;
    console.log('✅ Coluna product_id agora é nullable');

    console.log('\n✨ Migration aplicada com sucesso!\n');
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
