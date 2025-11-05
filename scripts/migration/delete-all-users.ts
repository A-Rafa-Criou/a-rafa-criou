/**
 * Script para DELETAR TODOS OS USUÁRIOS do banco de dados
 * ⚠️ ATENÇÃO: Este script é DESTRUTIVO e IRREVERSÍVEL!
 * 
 * Uso:
 * npx tsx scripts/migration/delete-all-users.ts
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function deleteAllUsers() {
  try {
    console.log('⚠️  ATENÇÃO: Este script vai DELETAR TODOS OS USUÁRIOS!');
    console.log('⏳ Aguardando 3 segundos para cancelar se necessário...\n');
    
    // Aguarda 3 segundos para dar tempo de cancelar (Ctrl+C)
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  DELETANDO TODOS OS DADOS RELACIONADOS...\n');

    // 1. Deletar cupons usados em produtos/variações
    console.log('   🏷️  Deletando coupon_products...');
    await db.execute(sql`DELETE FROM coupon_products`);
    console.log(`      ✅ Cupons de produtos deletados\n`);

    console.log('   🏷️  Deletando coupon_variations...');
    await db.execute(sql`DELETE FROM coupon_variations`);
    console.log(`      ✅ Cupons de variações deletados\n`);

    // 2. Deletar cupons
    console.log('   🎟️  Deletando coupons...');
    await db.execute(sql`DELETE FROM coupons`);
    console.log(`      ✅ Cupons deletados\n`);

    // 3. Deletar itens de pedidos
    console.log('   📦 Deletando order_items...');
    await db.execute(sql`DELETE FROM order_items`);
    console.log(`      ✅ Itens de pedidos deletados\n`);

    // 4. Deletar pedidos
    console.log('   🛒 Deletando orders...');
    await db.execute(sql`DELETE FROM orders`);
    console.log(`      ✅ Pedidos deletados\n`);

    // 5. Deletar permissões de download
    console.log('   📥 Deletando download_permissions...');
    await db.execute(sql`DELETE FROM download_permissions`);
    console.log(`      ✅ Permissões de download deletadas\n`);

    // 6. Deletar downloads
    console.log('   💾 Deletando downloads...');
    await db.execute(sql`DELETE FROM downloads`);
    console.log(`      ✅ Downloads deletados\n`);

    // 7. Deletar contas (OAuth)
    console.log('   🔐 Deletando accounts...');
    await db.execute(sql`DELETE FROM accounts`);
    console.log(`      ✅ Contas OAuth deletadas\n`);

    // 8. Deletar sessões
    console.log('   🎫 Deletando sessions...');
    await db.execute(sql`DELETE FROM sessions`);
    console.log(`      ✅ Sessões deletadas\n`);

    // 9. FINALMENTE, deletar usuários
    console.log('   👤 Deletando users...');
    await db.execute(sql`DELETE FROM users`);
    console.log(`      ✅ Usuários deletados\n`);

    console.log('============================================================');
    console.log('✅ TODOS OS USUÁRIOS E DADOS RELACIONADOS FORAM DELETADOS!');
    console.log('============================================================\n');
    
    console.log('🎯 Banco de dados limpo! Pronto para reimportar os usuários.');

  } catch (error) {
    console.error('\n❌ ERRO ao deletar usuários:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Executar
deleteAllUsers();
