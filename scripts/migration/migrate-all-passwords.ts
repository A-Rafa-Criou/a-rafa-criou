import { db } from '../../src/lib/db/index.js';
import { users } from '../../src/lib/db/schema.js';
import { isNotNull } from 'drizzle-orm';
import fetch from 'node-fetch';

interface WordPressResponse {
  valid?: boolean;
  hash?: string;
  hash_length?: number;
  message?: string;
  code?: string;
}

async function validatePasswordWithWordPress(
  email: string,
  testPassword: string
): Promise<string | null> {
  const WORDPRESS_API_URL = 'https://arafacriou.com.br/wp-json/nextjs/v1/validate-password';
  const API_KEY = process.env.WORDPRESS_API_KEY || '';

  try {
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ email, password: testPassword }),
    });

    const data = (await response.json()) as WordPressResponse;

    if (data.valid && data.hash) {
      return data.hash;
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function migrateAllPasswords() {
  console.log('\n🔐 MIGRAÇÃO EM MASSA DE SENHAS DO WORDPRESS\n');
  console.log('⚠️  ATENÇÃO: Este script NÃO pode testar senhas (apenas admins sabem)');
  console.log(
    '💡 SOLUÇÃO: Vamos preparar para migração on-demand (na primeira tentativa de login)\n'
  );

  // Buscar usuários com senha legada
  const legacyUsers = await db
    .select()
    .from(users)
    .where(isNotNull(users.legacyPasswordHash))
    .limit(10);

  console.log(`📊 Usuários com senha legada: ${legacyUsers.length}`);
  console.log('📋 Amostra dos primeiros 10:\n');

  legacyUsers.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email}`);
    console.log(`   Hash: ${user.legacyPasswordHash?.substring(0, 30)}...`);
    console.log(`   Tipo: ${user.legacyPasswordType}`);
    console.log();
  });

  console.log('════════════════════════════════════════════════════════════════');
  console.log('📝 ESTRATÉGIA DE MIGRAÇÃO:');
  console.log('════════════════════════════════════════════════════════════════');
  console.log();
  console.log('✅ OPÇÃO 1: Migração On-Demand (Recomendado)');
  console.log('   - Quando usuário tenta fazer login no Next.js');
  console.log('   - Se falhar com hash local, chama WordPress API');
  console.log('   - Se válido, atualiza hash e remove legacyPasswordHash');
  console.log('   - Transparente para o usuário');
  console.log();
  console.log('✅ OPÇÃO 2: Forçar Reset de Senha');
  console.log('   - Enviar email para todos os 1.328 usuários');
  console.log('   - Link de reset de senha');
  console.log('   - Usuário cria nova senha');
  console.log();
  console.log('✅ OPÇÃO 3: Migração Manual (Admin)');
  console.log('   - Você testa senha de alguns usuários conhecidos');
  console.log('   - Script atualiza no Next.js');
  console.log('   - Resto faz reset quando precisar');
  console.log();
  console.log('════════════════════════════════════════════════════════════════');
  console.log();
  console.log('💡 RECOMENDAÇÃO: Use OPÇÃO 1 + código de fallback na autenticação');
  console.log('   Já tenho o código pronto! Quer que eu implemente?');
  console.log();

  process.exit(0);
}

migrateAllPasswords().catch(console.error);
