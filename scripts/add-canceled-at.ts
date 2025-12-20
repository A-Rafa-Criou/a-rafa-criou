import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL?.replace(/['"]/g, '') || '';
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  try {
    console.log('Adicionando coluna canceled_at...');
    await client`ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP`;
    console.log('✅ Coluna canceled_at adicionada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
  } finally {
    await client.end();
  }
}

main();
