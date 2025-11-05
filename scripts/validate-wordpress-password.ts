import { db } from '../src/lib/db/index.js';
import { users } from '../src/lib/db/schema.js';
import { eq } from 'drizzle-orm';

interface WordPressValidationResponse {
  valid: boolean;
  user_id?: number;
  email?: string;
  hash?: string;
  hash_length?: number;
  message: string;
}

async function validateAndSyncPassword(email: string, password: string) {
  console.log('\n🔐 VALIDANDO SENHA NO WORDPRESS\n');
  console.log('📧 Email:', email);

  const WORDPRESS_API_URL = 'https://arafacriou.com.br/wp-json/nextjs/v1/validate-password';
  const API_KEY = process.env.WORDPRESS_API_KEY || 'SUA_CHAVE_SECRETA_AQUI'; // Configure no .env.local

  try {
    // Chamar API do WordPress
    console.log('🌐 Chamando WordPress API...');
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Erro na API:', error);
      return false;
    }

    const data: WordPressValidationResponse = await response.json();

    console.log('📊 Resposta do WordPress:');
    console.log('   Válido:', data.valid);
    console.log('   Mensagem:', data.message);

    if (!data.valid) {
      console.log('❌ Senha inválida no WordPress');
      return false;
    }

    console.log('\n✅ SENHA VÁLIDA NO WORDPRESS!');
    console.log('   Hash recebido:', data.hash?.substring(0, 30) + '...');
    console.log('   Tamanho:', data.hash_length, 'chars');

    // Atualizar usuário no Next.js
    console.log('\n🔄 Atualizando hash no Next.js...');

    const result = await db
      .update(users)
      .set({
        password: data.hash,
        legacyPasswordHash: null,
        legacyPasswordType: null,
      })
      .where(eq(users.email, email.toLowerCase()))
      .returning();

    if (result.length === 0) {
      console.log('⚠️  Usuário não encontrado no Next.js');
      return false;
    }

    console.log('✅ Hash atualizado com sucesso!');
    console.log('   ID:', result[0].id);
    console.log('   Email:', result[0].email);
    console.log('   Novo hash:', result[0].password?.substring(0, 30) + '...');

    return true;
  } catch (error) {
    console.error('❌ Erro ao validar senha:', error);
    return false;
  }
}

// Teste
const email = process.argv[2] || 'edduardooo2011@hotmail.com';
const password = process.argv[3] || '@Nike2011@';

validateAndSyncPassword(email, password)
  .then(success => {
    if (success) {
      console.log('\n🎉 SUCESSO! Agora você pode fazer login no Next.js com esta senha.\n');
    } else {
      console.log('\n❌ FALHOU. Verifique a senha e tente novamente.\n');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(console.error);
