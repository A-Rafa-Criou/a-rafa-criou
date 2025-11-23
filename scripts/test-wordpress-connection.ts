/**
 * Script para testar a conexão com WordPress API
 */

import 'dotenv/config';

async function testWordPressAPI() {
  const testCases = [
    {
      name: 'COM www',
      url: 'https://www.arafacriou.com.br/wp-json/nextjs/v1/validate-password',
    },
    {
      name: 'SEM www',
      url: 'https://arafacriou.com.br/wp-json/nextjs/v1/validate-password',
    },
  ];

  const apiKey = process.env.WORDPRESS_API_KEY;
  const testEmail = 'arafacriou@gmail.com';
  const testPassword = 'RafaByEla@2025';

  if (!apiKey) {
    console.log('❌ WORDPRESS_API_KEY não configurada!');
    process.exit(1);
  }

  console.log('🔑 API Key configurada');
  console.log(`   ${apiKey.substring(0, 20)}...`);
  console.log();

  for (const testCase of testCases) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🧪 Testando: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    console.log();

    try {
      const response = await fetch(testCase.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCESSO!`);
        console.log(`   Resposta:`, JSON.stringify(data, null, 2));
      } else {
        const text = await response.text();
        console.log(`   ❌ Erro:`);
        console.log(`   ${text}`);
      }
    } catch (error: unknown) {
      console.log(`   ❌ Erro na requisição:`);
      if (error instanceof Error) {
        console.log(`   ${error.message}`);
        if ('cause' in error && error.cause) {
          console.log(`   Causa: ${error.cause}`);
        }
      }
    }

    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('💡 PRÓXIMOS PASSOS:');
  console.log('   1. Se COM www funcionou: atualizar .env com www');
  console.log('   2. Se ambos falharam com 403: verificar API Key no WordPress');
  console.log('   3. Se ambos falharam com erro SSL: verificar certificado');
}

testWordPressAPI()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
