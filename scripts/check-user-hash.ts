/**
 * Script para verificar o hash de um usuário específico
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkUserHash() {
  const email = 'edduardooo2011@hotmail.com';

  console.log(`🔍 Verificando hash para: ${email}\n`);

  try {
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        legacyPasswordHash: users.legacyPasswordHash,
        legacyPasswordType: users.legacyPasswordType,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      console.log('❌ Usuário não encontrado!');
      return;
    }

    const u = user[0];

    console.log('📋 DADOS DO USUÁRIO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${u.id}`);
    console.log(`Email: ${u.email}`);
    console.log();
    console.log(`📦 password (atual):`);
    if (u.password) {
      console.log(`   ${u.password.substring(0, 30)}... (${u.password.length} chars)`);
      console.log(`   Formato: ${u.password.substring(0, 10)}...`);

      if (u.password.startsWith('$wp$')) {
        console.log(`   ⚠️  AINDA TEM PREFIXO $wp$ - MIGRAÇÃO NÃO OCORREU`);
      } else if (u.password.startsWith('$2y$') || u.password.startsWith('$2b$')) {
        console.log(`   ✅ HASH LIMPO BCRYPT - MIGRAÇÃO CONCLUÍDA!`);
      } else if (u.password.startsWith('$P$') || u.password.startsWith('$H$')) {
        console.log(`   📜 Hash phpass tradicional`);
      }
    } else {
      console.log(`   (null)`);
    }
    console.log();
    console.log(`📦 legacyPasswordHash:`);
    if (u.legacyPasswordHash) {
      console.log(
        `   ${u.legacyPasswordHash.substring(0, 30)}... (${u.legacyPasswordHash.length} chars)`
      );
      console.log(`   ⚠️  CAMPO LEGADO AINDA PRESENTE`);
    } else {
      console.log(`   (null) ✅`);
    }
    console.log();
    console.log(`📦 legacyPasswordType:`);
    console.log(`   ${u.legacyPasswordType || '(null) ✅'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (u.password && !u.password.startsWith('$wp$') && !u.legacyPasswordHash) {
      console.log('\n🎉 USUÁRIO MIGRADO COM SUCESSO!');
    } else if (u.password && u.password.startsWith('$wp$')) {
      console.log('\n⚠️  USUÁRIO AINDA NÃO MIGRADO (hash com $wp$)');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkUserHash();
