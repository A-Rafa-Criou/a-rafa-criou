/**
 * Script para verificar quantos usuários ainda têm senhas legadas
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';

async function checkLegacyUsers() {
  console.log('🔍 Verificando usuários com senhas legadas...\n');

  try {
    const legacyUsers = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        legacyPasswordHash: users.legacyPasswordHash,
        legacyPasswordType: users.legacyPasswordType,
      })
      .from(users)
      .where(isNotNull(users.legacyPasswordHash));

    console.log(`📊 Total de usuários com senha legada: ${legacyUsers.length}\n`);

    if (legacyUsers.length === 0) {
      console.log('✅ Nenhum usuário com senha legada!');
      return;
    }

    console.log('👥 USUÁRIOS COM SENHA LEGADA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const stats = {
      phpass: 0,
      bcrypt: 0,
      prefixWp: 0,
      outros: 0,
    };

    for (const user of legacyUsers) {
      const hash = user.legacyPasswordHash;
      let tipo = 'Desconhecido';

      if (hash?.startsWith('$P$') || hash?.startsWith('$H$')) {
        tipo = 'phpass ($P$/$H$)';
        stats.phpass++;
      } else if (hash?.startsWith('$wp$')) {
        tipo = 'WordPress com prefixo $wp$';
        stats.prefixWp++;
      } else if (hash?.startsWith('$2y$') || hash?.startsWith('$2b$')) {
        tipo = 'bcrypt ($2y$/$2b$)';
        stats.bcrypt++;
      } else {
        tipo = `Desconhecido (${hash?.substring(0, 10)}...)`;
        stats.outros++;
      }

      console.log(`\n📧 ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Tipo: ${tipo}`);
      console.log(`   legacyPasswordType: ${user.legacyPasswordType}`);

      if (user.password) {
        let passwordStatus = 'hash atual existe';
        if (user.password.startsWith('$wp$')) {
          passwordStatus = '⚠️  AINDA TEM $wp$ no campo password';
        } else if (user.password.startsWith('$2y$') || user.password.startsWith('$2b$')) {
          passwordStatus = 'bcrypt no campo password';
        }
        console.log(`   password: ${passwordStatus}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📈 ESTATÍSTICAS:');
    console.log(`   phpass tradicional ($P$/$H$): ${stats.phpass}`);
    console.log(`   bcrypt ($2y$/$2b$): ${stats.bcrypt}`);
    console.log(`   WordPress com $wp$: ${stats.prefixWp}`);
    console.log(`   Outros formatos: ${stats.outros}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. Os usuários farão login normalmente');
    console.log('   2. A senha será validada via WordPress API (se disponível)');
    console.log('   3. Um hash novo bcrypt será gerado automaticamente');
    console.log('   4. Os campos legacyPasswordHash/Type serão limpos');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkLegacyUsers();
