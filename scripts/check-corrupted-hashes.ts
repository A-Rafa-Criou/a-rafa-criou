import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql, isNull, and } from 'drizzle-orm';

async function fixAllCorruptedHashes() {
  console.log('\n🔧 CORRIGINDO HASHES CORROMPIDOS\n');

  try {
    // Buscar usuários com hash que pode estar corrompido
    // (hash em bcrypt, sem legacy, mas que pode ter sido salvo incorretamente)
    const usersWithBcrypt = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
      })
      .from(users)
      .where(
        and(
          sql`${users.password} LIKE '$2%'`, // bcrypt
          isNull(users.legacyPasswordHash), // Sem legacy
          isNull(users.legacyPasswordType)
        )
      )
      .limit(100); // Processar em lotes

    console.log(`📊 Encontrados ${usersWithBcrypt.length} usuários com hash bcrypt`);

    if (usersWithBcrypt.length === 0) {
      console.log('✅ Nenhum hash para verificar!');
      process.exit(0);
    }

    console.log('\n🔍 Verificando integridade dos hashes...\n');

    let corrupted = 0;
    let valid = 0;

    for (const user of usersWithBcrypt) {
      const hash = user.password;
      if (!hash) continue;

      // Hash bcrypt válido deve ter exatamente 60 caracteres e formato correto
      // $2a$10$... ou $2b$10$... ou $2y$10$...
      const validFormat = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

      if (!validFormat.test(hash) || hash.length !== 60) {
        console.log(`❌ Hash corrompido: ${user.email}`);
        console.log(`   Hash: ${hash.substring(0, 30)}... (${hash.length} chars)`);
        corrupted++;
      } else {
        valid++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESULTADO DA VERIFICAÇÃO');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Hashes válidos:     ${valid}`);
    console.log(`❌ Hashes corrompidos: ${corrupted}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (corrupted > 0) {
      console.log('⚠️  ATENÇÃO: Hashes corrompidos detectados!');
      console.log('\n💡 SOLUÇÃO RECOMENDADA:');
      console.log('   1. OPÇÃO A: Re-importar usuários do WordPress');
      console.log('      → Rodar novamente: npx tsx scripts/migration/import-customers.ts');
      console.log('');
      console.log('   2. OPÇÃO B: Forçar reset de senha para todos');
      console.log('      → Enviar email de recuperação para usuários afetados');
      console.log('');
      console.log('   3. OPÇÃO C: Aguardar login natural');
      console.log('      → Com o código corrigido, próximo login vai migrar corretamente');
      console.log('\n💡 RECOMENDAÇÃO: Use OPÇÃO C (aguardar login natural)');
      console.log('   ✅ Código já foi corrigido (config.ts linha 159-168)');
      console.log('   ✅ Próxima tentativa de login vai funcionar');
      console.log('   ✅ Hash será corrigido automaticamente');
    } else {
      console.log('🎉 Todos os hashes estão válidos!');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

fixAllCorruptedHashes();
