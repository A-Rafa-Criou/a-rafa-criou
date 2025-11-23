/**
 * Script para testar uma senha específica contra o hash do WordPress
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function testLogin() {
  const email = 'arafacriou@gmail.com';
  const password = 'RafaByEla@2025';

  console.log(`🔍 Testando login:`);
  console.log(`   Email: ${email}`);
  console.log(`   Senha: ${password}`);
  console.log();

  try {
    // 1. Buscar usuário
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        legacyPasswordHash: users.legacyPasswordHash,
        legacyPasswordType: users.legacyPasswordType,
      })
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

    console.log('📦 DADOS NO BANCO:');
    console.log(`   password: ${user.password || '(null)'}`);
    console.log(
      `   legacyPasswordHash: ${user.legacyPasswordHash ? user.legacyPasswordHash.substring(0, 30) + '...' : '(null)'}`
    );
    console.log(`   legacyPasswordType: ${user.legacyPasswordType || '(null)'}`);
    console.log();

    // 2. Testar senha contra hash legado
    if (user.legacyPasswordHash) {
      console.log('🔐 Testando contra legacyPasswordHash...');
      const hash = user.legacyPasswordHash;

      if (hash.startsWith('$2y$') || hash.startsWith('$2b$')) {
        console.log('   Tipo: bcrypt');
        console.log(`   Hash: ${hash}`);
        console.log();

        // Testar com bcrypt
        const isValid = await bcrypt.compare(password, hash);
        console.log(`   Resultado bcrypt.compare: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
        console.log();

        if (!isValid) {
          console.log('⚠️  Tentando com WordPress API...');
          try {
            const wpApiUrl = 'https://www.arafacriou.com.br/wp-json/nextjs/v1/validate-password';
            const wpApiKey = process.env.WORDPRESS_API_KEY;

            if (!wpApiKey) {
              console.log('❌ WORDPRESS_API_KEY não configurada!');
            } else {
              console.log(`   URL: ${wpApiUrl}`);
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

              console.log(`   Status: ${response.status} ${response.statusText}`);

              if (response.ok) {
                const data = await response.json();
                console.log(`   Resposta:`, data);

                if (data.valid) {
                  console.log('   ✅ WordPress API VALIDOU A SENHA!');
                } else {
                  console.log('   ❌ WordPress API: senha inválida');
                }
              } else {
                const text = await response.text();
                console.log(`   Erro: ${text}`);
              }
            }
          } catch (error) {
            console.error('   ❌ Erro ao chamar WordPress API:', error);
          }
        }
      } else if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
        console.log('   Tipo: phpass');
        console.log('   (implementação local não testada neste script)');
      } else {
        console.log(`   Tipo desconhecido: ${hash.substring(0, 10)}...`);
      }
    }

    // 3. Testar contra password atual (se existir)
    if (user.password) {
      console.log();
      console.log('🔐 Testando contra password atual...');
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`   Resultado: ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

testLogin();
