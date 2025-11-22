/**
 * Script: Resetar senha do admin
 * Define uma nova senha para um usuário específico
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer);
    });
  });
}

async function resetPassword() {
  try {
    console.log('🔐 Reset de Senha - Admin\n');

    const email = await question('Digite seu email: ');
    const newPassword = await question('Digite a NOVA senha: ');

    if (newPassword.length < 6) {
      console.log('\n❌ Senha muito curta! Mínimo 6 caracteres.');
      rl.close();
      return;
    }

    // Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      console.log('\n❌ Usuário não encontrado!');
      rl.close();
      return;
    }

    // Gerar hash bcrypt
    console.log('\n🔄 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar banco
    await db
      .update(users)
      .set({
        password: hashedPassword,
        legacyPasswordHash: null,
        legacyPasswordType: null,
      })
      .where(eq(users.id, user.id));

    console.log('\n✅ Senha atualizada com sucesso!');
    console.log(`\n📧 Email: ${user.email}`);
    console.log(`🔑 Nova senha: ${newPassword}`);
    console.log(`\n👉 Agora você pode fazer login no site!`);

    rl.close();
  } catch (error) {
    console.error('\n❌ Erro:', error);
    rl.close();
    process.exit(1);
  }
}

resetPassword();
