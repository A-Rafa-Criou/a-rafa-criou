import 'dotenv/config';
import { db } from '../../src/lib/db';
import { sql } from 'drizzle-orm';

async function removeWordPressFields() {
  console.log('🔧 Removendo campos WordPress de PRODUTOS do schema...\n');
  console.log('ℹ️  Campos de autenticação (legacy passwords) serão MANTIDOS\n');

  try {
    // 1. Remover constraint unique
    console.log('1️⃣  Removendo constraint products_wp_product_id_unique...');
    await db.execute(
      sql`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_wp_product_id_unique"`
    );
    console.log('   ✅ Constraint removido\n');

    // 2. Remover coluna wp_order_id de orders
    console.log('2️⃣  Removendo coluna wp_order_id de orders...');
    await db.execute(sql`ALTER TABLE "orders" DROP COLUMN IF EXISTS "wp_order_id"`);
    console.log('   ✅ Coluna removida\n');

    // 3. Remover coluna wp_product_id de products
    console.log('3️⃣  Removendo coluna wp_product_id de products...');
    await db.execute(sql`ALTER TABLE "products" DROP COLUMN IF EXISTS "wp_product_id"`);
    console.log('   ✅ Coluna removida\n');

    // 4. Remover coluna wp_image_url de products
    console.log('4️⃣  Removendo coluna wp_image_url de products...');
    await db.execute(sql`ALTER TABLE "products" DROP COLUMN IF EXISTS "wp_image_url"`);
    console.log('   ✅ Coluna removida\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION CONCLUÍDA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📊 Campos WordPress de PRODUTOS removidos:');
    console.log('   • products.wp_product_id');
    console.log('   • products.wp_image_url');
    console.log('   • orders.wp_order_id');
    console.log('\n✅ Campos de AUTENTICAÇÃO mantidos:');
    console.log('   • users.legacy_password_hash (MANTIDO)');
    console.log('   • users.legacy_password_type (MANTIDO)');
    console.log('\n🎯 Schema limpo e pronto! Autenticação WordPress continua funcionando!\n');
  } catch (error) {
    console.error('\n❌ ERRO durante a migration:', error);
    process.exit(1);
  }
}

removeWordPressFields()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
