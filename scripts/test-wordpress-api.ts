/**
 * Testar WordPress API diretamente
 */

const WORDPRESS_API_URL = 'https://arafacriou.com.br/wp-json/nextjs/v1/validate-password';
const WORDPRESS_API_KEY = 'wp_a521bccb4d50dd1b2391d09dfb16babdeba490b74f4ffb872236bad686fba2a0';

async function testWordPressAPI() {
  console.log('\n🧪 TESTE DA WORDPRESS API\n');

  const email = 'edduardooo2011@hotmail.com';
  const password = '@Nike2011@'; // Sua senha do WordPress

  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Senha: ${password}`);
  console.log(`🌐 URL: ${WORDPRESS_API_URL}`);
  console.log(`🔐 API Key: ${WORDPRESS_API_KEY.substring(0, 20)}...\n`);

  console.log('🔄 Enviando requisição...\n');

  try {
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WORDPRESS_API_KEY,
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();
    console.log('📋 Resposta completa:');
    console.log(JSON.stringify(data, null, 2));
    console.log();

    if (data.valid) {
      console.log('✅ SENHA VÁLIDA NO WORDPRESS!');
      if (data.hash) {
        console.log(`\n🔐 Hash retornado:`);
        console.log(data.hash);
      }
    } else {
      console.log('❌ SENHA INVÁLIDA NO WORDPRESS');
      if (data.message) {
        console.log(`💬 Mensagem: ${data.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testWordPressAPI();
