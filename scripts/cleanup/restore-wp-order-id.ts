import 'dotenv/config';
import { db } from '../../src/lib/db';
import { sql } from 'drizzle-orm';

async function restoreWpOrderId() {
  console.log('🔧 Restaurando campo orders.wp_order_id...\n');

  try {
    console.log('1️⃣  Adicionando coluna wp_order_id na tabela orders...');
    await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "wp_order_id" integer`);
    console.log('   ✅ Coluna adicionada com sucesso!\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ RESTAURAÇÃO CONCLUÍDA!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📊 Campo restaurado:');
    console.log('   • orders.wp_order_id (integer)');
    console.log('\n🎯 Pedidos do WordPress mantidos para referência!\n');

  } catch (error) {
    console.error('\n❌ ERRO durante a restauração:', error);
    process.exit(1);
  }
}

restoreWpOrderId()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
