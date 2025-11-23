/**
 * Script para gerar senhas temporárias baseadas no email
 * Isso permite que usuários façam login inicial e depois alterem
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isNotNull, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function generateTempPasswords() {
  console.log('🔐 Gerando senhas temporárias para migração...\n');

  try {
    const legacyUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(isNotNull(users.legacyPasswordHash));

    console.log(`📊 Total de usuários: ${legacyUsers.length}\n`);

    // Gerar senha padrão: primeiros 4 chars do email + data nascimento ou telefone
    // Ou senha única por usuário
    
    console.log('💡 ESTRATÉGIAS:');
    console.log('   1. Senha padrão: ArafaCriou2025! (mesma para todos)');
    console.log('   2. Senha baseada no email: primeiros 6 chars + @2025');
    console.log('   3. Senha aleatória + enviar por email');
    console.log();
    
    // Vamos usar estratégia 1: senha padrão simples
    const defaultPassword = 'ArafaCriou2025!';
    
    console.log(`📧 Usando senha padrão: ${defaultPassword}`);
    console.log('⚠️  Importante: Envie email avisando que devem trocar a senha!\n');

    const hash = await bcrypt.hash(defaultPassword, 10);
    let updated = 0;

    for (const user of legacyUsers) {
      await db
        .update(users)
        .set({
          password: hash, // Mesma senha para todos temporariamente
          legacyPasswordHash: null,
          legacyPasswordType: null,
        })
        .where(eq(users.id, user.id));

      updated++;

      if (updated % 100 === 0) {
        console.log(`   Processados: ${updated}...`);
      }
    }

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ ${updated} usuários atualizados`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('📧 ENVIE ESTE EMAIL PARA TODOS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Assunto: Nova Plataforma - Sua Senha Temporária');
    console.log();
    console.log('Olá,');
    console.log();
    console.log('Migramos para uma nova plataforma! 🎉');
    console.log();
    console.log('Para acessar sua conta:');
    console.log(`   Email: seu-email@exemplo.com`);
    console.log(`   Senha temporária: ${defaultPassword}`);
    console.log();
    console.log('⚠️ IMPORTANTE: Após o login, vá em "Minha Conta" e altere sua senha!');
    console.log();
    console.log('Acesse: https://www.arafacriou.com.br/auth/login');
    console.log();
    console.log('Equipe A Rafa Criou');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

generateTempPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
