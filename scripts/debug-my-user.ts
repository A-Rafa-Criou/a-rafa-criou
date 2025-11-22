/**
 * Script: Debug do meu usuário
 * Verifica se o usuário admin foi migrado corretamente
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

async function debugUser() {
  try {
    const email = await question('Digite seu email: ');

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        hasPassword: users.password,
        hasLegacyPassword: users.legacyPasswordHash,
        legacyType: users.legacyPasswordType,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      console.log('\n❌ Usuário não encontrado!');
      console.log('\n📋 Possíveis soluções:');
      console.log('1. Verifique se o email está correto');
      console.log('2. Crie uma conta nova no site');
      console.log('3. Rode o script de migração de usuários do WordPress');
      rl.close();
      return;
    }

    console.log('\n✅ Usuário encontrado!\n');
    console.log('📊 Informações:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Criado em: ${user.createdAt}`);
    console.log('');

    // Verificar senha
    if (user.hasPassword) {
      console.log('✅ Senha moderna (bcrypt) configurada');
      console.log('   → Você pode fazer login normalmente');
    } else if (user.hasLegacyPassword) {
      console.log('⚠️  Senha legada do WordPress encontrada');
      console.log(`   Tipo: ${user.legacyType}`);
      
      if (user.legacyType === 'wordpress_phpass') {
        console.log('\n📋 Como funciona:');
        console.log('   1. Tente fazer login com sua senha do WordPress');
        console.log('   2. Se a senha estiver correta, será convertida automaticamente');
        console.log('   3. Nos próximos logins já será com a senha nova (bcrypt)');
      } else if (user.hasLegacyPassword.startsWith('$wp$')) {
        console.log('\n📋 Senha com prefixo $wp$ (requer validação no WordPress):');
        console.log('   1. Tente fazer login com sua senha do WordPress');
        console.log('   2. O sistema vai validar no WordPress');
        console.log('   3. Se válida, será convertida para bcrypt');
        console.log('\n⚠️  Requisitos:');
        console.log('   - WordPress API precisa estar configurada');
        console.log(`   - Variável WORDPRESS_API_URL: ${process.env.WORDPRESS_API_URL ? '✅' : '❌'}`);
        console.log(`   - Variável WORDPRESS_API_KEY: ${process.env.WORDPRESS_API_KEY ? '✅' : '❌'}`);
      }
    } else {
      console.log('❌ Nenhuma senha configurada!');
      console.log('\n📋 Soluções:');
      console.log('   1. Use "Esqueci minha senha" no login');
      console.log('   2. Ou rode o script para resetar senha manualmente');
    }

    rl.close();
  } catch (error) {
    console.error('❌ Erro:', error);
    rl.close();
    process.exit(1);
  }
}

debugUser();
