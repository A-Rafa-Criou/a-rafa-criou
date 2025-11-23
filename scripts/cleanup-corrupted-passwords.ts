/**
 * Script para GERAR SENHAS TEMPORÁRIAS para usuários com hash corrompido
 * 
 * Como os hashes do WordPress estão corrompidos e não há mais WordPress para validar,
 * vamos gerar senhas temporárias e enviar por email para os usuários.
 * 
 * ALTERNATIVA MAIS SIMPLES: Limpar o campo password e legacyPasswordHash,
 * forçando todos os usuários a usarem "Esqueci minha senha" no primeiro acesso.
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isNotNull, eq } from 'drizzle-orm';

async function cleanupCorruptedPasswords() {
  console.log('🧹 Limpando senhas corrompidas do WordPress...\n');

  try {
    // Buscar usuários com senha legada
    const legacyUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(isNotNull(users.legacyPasswordHash));

    console.log(`📊 Total de usuários com senha legada: ${legacyUsers.length}\n`);

    if (legacyUsers.length === 0) {
      console.log('✅ Nenhum usuário com senha legada!');
      return;
    }

    console.log('⚠️  ESCOLHA UMA OPÇÃO:\n');
    console.log('1️⃣  LIMPAR tudo (usuários terão que usar "Esqueci minha senha")');
    console.log('2️⃣  GERAR senhas temporárias e enviar por email');
    console.log();

    // Para este script, vamos usar a opção 1 (mais simples)
    console.log('▶️  Executando OPÇÃO 1: Limpeza total\n');

    let cleaned = 0;

    for (const user of legacyUsers) {
      await db
        .update(users)
        .set({
          password: null,
          legacyPasswordHash: null,
          legacyPasswordType: null,
        })
        .where(eq(users.id, user.id));

      cleaned++;

      if (cleaned % 100 === 0) {
        console.log(`   Processados: ${cleaned}...`);
      }
    }

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Limpeza concluída: ${cleaned} usuários`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('💡 PRÓXIMOS PASSOS:');
    console.log('   1. Usuários tentarão fazer login');
    console.log('   2. Verão mensagem: "Credenciais inválidas"');
    console.log('   3. Clicarão em "Esqueci minha senha"');
    console.log('   4. Receberão email com link de reset');
    console.log('   5. Definirão nova senha');
    console.log();
    console.log('📧 SUGESTÃO:');
    console.log('   Envie um email em massa avisando:');
    console.log('   "Migramos para uma nova plataforma. Use \'Esqueci minha senha\' para redefinir."');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

cleanupCorruptedPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
