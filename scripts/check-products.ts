import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { products } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log('\n🔍 Verificando produtos no banco...\n');

  // Total de produtos
  const totalProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
  console.log(`📊 Total de produtos: ${totalProducts[0].count}`);

  // Primeiros 20 produtos
  const sampleProducts = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .limit(20);

  console.log('\n📦 Primeiros 20 produtos:');
  sampleProducts.forEach(p => {
    console.log(`  - [${p.id}] ${p.name}`);
  });

  await client.end();
}

main().catch(console.error);
