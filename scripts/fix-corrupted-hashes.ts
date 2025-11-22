import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql, or } from 'drizzle-orm';

async function fixCorruptedBcryptHashes() {
  console.log('\n🔧 CORRIGINDO HASHES BCRYPT CORROMPIDOS\n');

  try {
    // Buscar hashes com prefixo $wp$ ou que começam com "2y$" ao invés de "$2y$"
    const corruptedUsers = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        legacyPasswordHash: users.legacyPasswordHash,
      })
      .from(users)
      .where(
        or(
          sql`${users.password} LIKE '$wp$%'`, // Hash com prefixo $wp$
          sql`${users.legacyPasswordHash} LIKE '$wp$%'`, // Legacy hash com prefixo $wp$
          sql`${users.password} LIKE '2y$%'`, // Hash sem $ inicial
          sql`${users.legacyPasswordHash} LIKE '2y$%'` // Legacy hash sem $ inicial
        )
      );

    console.log(`📊 Hashes corrompidos encontrados: ${corruptedUsers.length}\n`);

    if (corruptedUsers.length === 0) {
      console.log('✅ Nenhum hash corrompido encontrado!');
      process.exit(0);
    }

    let fixed = 0;

    for (const user of corruptedUsers) {
      let needsUpdate = false;
      let newPassword = user.password;
      let newLegacyHash = user.legacyPasswordHash;

      // Corrigir password (campo principal)
      if (user.password?.startsWith('$wp$')) {
        // Remove "$wp$" mas mantém o resto ($2y$10$...)
        const fixedHash = '$' + user.password.substring(4); // Remove "$wp$" e adiciona "$" de volta
        console.log(`🔧 Corrigindo PASSWORD: ${user.email}`);
        console.log(`   Hash com $wp$: ${user.password.substring(0, 25)}...`);
        console.log(`   Hash corrigido: ${fixedHash.substring(0, 25)}...`);

        newPassword = fixedHash;
        needsUpdate = true;
      } else if (user.password?.startsWith('2y$')) {
        // Adicionar $ no início
        const fixedHash = '$' + user.password;
        console.log(`🔧 Corrigindo PASSWORD (falta $): ${user.email}`);
        console.log(`   Hash sem $:     ${user.password.substring(0, 25)}...`);
        console.log(`   Hash corrigido: ${fixedHash.substring(0, 25)}...`);

        newPassword = fixedHash;
        needsUpdate = true;
      }

      // Corrigir legacyPasswordHash
      if (user.legacyPasswordHash?.startsWith('$wp$')) {
        // Remove "$wp$" mas mantém o resto ($2y$10$...)
        const fixedHash = '$' + user.legacyPasswordHash.substring(4); // Remove "$wp$" e adiciona "$" de volta
        console.log(`🔧 Corrigindo LEGACY: ${user.email}`);
        console.log(`   Hash com $wp$: ${user.legacyPasswordHash.substring(0, 25)}...`);
        console.log(`   Hash corrigido: ${fixedHash.substring(0, 25)}...`);

        newLegacyHash = fixedHash;
        needsUpdate = true;
      } else if (user.legacyPasswordHash?.startsWith('2y$')) {
        // Adicionar $ no início
        const fixedHash = '$' + user.legacyPasswordHash;
        console.log(`🔧 Corrigindo LEGACY (falta $): ${user.email}`);
        console.log(`   Hash sem $:     ${user.legacyPasswordHash.substring(0, 25)}...`);
        console.log(`   Hash corrigido: ${fixedHash.substring(0, 25)}...`);

        newLegacyHash = fixedHash;
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Atualizar no banco
        await db
          .update(users)
          .set({
            password: newPassword,
            legacyPasswordHash: newLegacyHash,
            updatedAt: new Date(),
          })
          .where(sql`${users.id} = ${user.id}`);

        console.log(`   ✅ Atualizado!\n`);
        fixed++;
      }
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
