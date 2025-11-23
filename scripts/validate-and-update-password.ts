/**
 * Script: Validar e atualizar senhas via WordPress API
 * Para usuários que você conhece a senha
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

const WORDPRESS_API_URL = 'https://arafacriou.com.br/wp-json/nextjs/v1/validate-password';
const WORDPRESS_API_KEY = process.env.WORDPRESS_API_KEY || '';

async function validateAndUpdatePassword() {
  try {
    console.log('\n🔐 VALIDAR E ATUALIZAR SENHA VIA WORDPRESS\n');

    const email = await question('Digite o email: ');
    const password = await question('Digite a senha do WordPress: ');

    console.log('\n🔄 Validando com WordPress API...\n');

    // Validar com WordPress
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WORDPRESS_API_KEY,
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password,
      }),
    });

    if (!response.ok) {
      console.log(`❌ Erro na WordPress API: ${response.status}`);
      rl.close();
      return;
    }

    const data = await response.json();

    if (!data.valid) {
      console.log('❌ Senha inválida no WordPress!');
      console.log(`💬 ${data.message || 'Senha incorreta'}`);
      rl.close();
      return;
    }

    console.log('✅ Senha válida no WordPress!\n');

    // Buscar usuário no banco
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário não encontrado no banco Next.js!');
      rl.close();
      return;
    }

    console.log(`👤 Usuário encontrado: ${user.name || user.email}`);
    console.log(`📧 Email: ${user.email}\n`);

    // Gerar NOVO hash com bcrypt
    console.log('🔄 Gerando novo hash bcrypt...');
    const newHash = await bcrypt.hash(password, 10);
    console.log(`✅ Hash gerado: ${newHash.substring(0, 30)}...\n`);

    // Atualizar no banco
    console.log('💾 Atualizando no banco de dados...');
    await db
      .update(users)
      .set({
        password: newHash,
        legacyPasswordHash: null,
        legacyPasswordType: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log('\n✅ SUCESSO! Senha atualizada.\n');
    console.log('🎉 Agora você pode fazer login com:');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}\n`);

    rl.close();
  } catch (error) {
    console.error('❌ Erro:', error);
    rl.close();
  }
}

validateAndUpdatePassword();
