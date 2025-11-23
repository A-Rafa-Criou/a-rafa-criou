/**
 * Script para forçar a migração de senha através da API do WordPress
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function forceMigratePassword() {
  const email = 'edduardooo2011@hotmail.com';
  
  // COLOQUE SUA SENHA AQUI (do WordPress)
  const password = process.argv[2];

  if (!password) {
    console.log('❌ Uso: npx tsx scripts/force-migrate-my-password.ts SUA_SENHA');
    process.exit(1);
  }

  console.log(`🔍 Migrando senha para: ${email}\n`);

  try {
    // 1. Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log('✅ Usuário encontrado');
    console.log(`   ID: ${user.id}`);
    console.log();

    // 2. Tentar validar com WordPress API
    console.log('🔄 Validando senha com WordPress API...');
    
    const wpApiUrl = process.env.WORDPRESS_API_URL || 
      'https://www.arafacriou.com.br/wp-json/nextjs/v1/validate-password';
    const wpApiKey = process.env.WORDPRESS_API_KEY;

    if (!wpApiKey) {
      console.log('❌ WORDPRESS_API_KEY não configurada!');
      process.exit(1);
    }

    try {
      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': wpApiKey,
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        console.log(`❌ Erro na WordPress API: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log('Resposta:', text);
        process.exit(1);
      }

      const data = await response.json();
      console.log('📦 Resposta da API:', data);

      if (!data.valid) {
        console.log('❌ Senha inválida segundo WordPress!');
        process.exit(1);
      }

      console.log('✅ Senha validada com sucesso!');
    } catch (error) {
      console.log('❌ Erro ao conectar com WordPress API:', error);
      console.log();
      console.log('⚠️  WordPress API não está acessível.');
      console.log('💡 Você pode forçar a migração mesmo assim? (use --force)');
      
      if (!process.argv.includes('--force')) {
        process.exit(1);
      }
      
      console.log();
      console.log('🔓 MODO FORÇADO: Criando hash sem validar com WordPress');
    }
    console.log();

    // 3. Gerar hash NOVO com bcrypt
    console.log('🔐 Gerando hash novo com bcrypt...');
    const newHash = await bcrypt.hash(password, 10);
    console.log(`   Hash gerado: ${newHash.substring(0, 30)}...`);
    console.log();

    // 4. Atualizar banco de dados
    console.log('💾 Atualizando banco de dados...');
    await db
      .update(users)
      .set({
        password: newHash,
        legacyPasswordHash: null,
        legacyPasswordType: null,
      })
      .where(eq(users.id, user.id));

    console.log('✅ Senha migrada com sucesso!');
    console.log();
    console.log('🎉 Agora você pode fazer login normalmente com sua senha!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

forceMigratePassword();
