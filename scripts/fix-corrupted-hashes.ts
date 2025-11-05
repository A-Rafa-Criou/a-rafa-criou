import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql, and, isNull } from 'drizzle-orm';

async function fixCorruptedBcryptHashes() {
  console.log('\n🔧 CORRIGINDO HASHES BCRYPT CORROMPIDOS\n');

  try {
    // Buscar hashes que começam com "2y$" ao invés de "$2y$"
    const corruptedUsers = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
      })
      .from(users)
      .where(
        and(
          sql`${users.password} LIKE '2%'`, // Começa com "2" (falta o $)
          sql`${users.password} NOT LIKE '$2%'`, // Não começa com "$2"
          isNull(users.legacyPasswordHash)
        )
      );

    console.log(`📊 Hashes corrompidos encontrados: ${corruptedUsers.length}\n`);

    if (corruptedUsers.length === 0) {
      console.log('✅ Nenhum hash corrompido encontrado!');
      process.exit(0);
    }

    let fixed = 0;

    for (const user of corruptedUsers) {
      const corruptedHash = user.password;
      if (!corruptedHash) continue;

      console.log(`🔧 Corrigindo: ${user.email}`);
      console.log(
        `   Hash corrompido: ${corruptedHash.substring(0, 20)}... (${corruptedHash.length} chars)`
      );

      // Adicionar o $ no início
      const fixedHash = '$' + corruptedHash;
      console.log(
        `   Hash corrigido:  ${fixedHash.substring(0, 20)}... (${fixedHash.length} chars)`
      );

      // Atualizar no banco
      await db
        .update(users)
        .set({
          password: fixedHash,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${user.id}`);

      console.log(`   ✅ Atualizado!\n`);
      fixed++;
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('📊 RESULTADO');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Hashes corrigidos: ${fixed}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (fixed > 0) {
      console.log('🎉 SUCESSO! Todos os hashes foram corrigidos.');
      console.log('💡 Agora os usuários podem fazer login normalmente!');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

fixCorruptedBcryptHashes();
