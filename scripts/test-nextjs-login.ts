/**
 * Script para testar login no Next.js (local)
 * Simula uma requisição de login com credenciais
 */

async function testLogin() {
  const email = 'edduardooo2011@hotmail.com';
  const password = '@Nike2011@';
  
  console.log('🧪 TESTANDO LOGIN NO NEXT.JS\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Senha: ${password}`);
  console.log(`🌐 URL: http://localhost:3000/api/auth/callback/credentials\n`);

  console.log('🔄 Enviando credenciais...\n');

  try {
    const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email,
        password,
        callbackUrl: 'http://localhost:3000',
        json: 'true',
      }).toString(),
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    if (response.ok) {
      const data = await response.json();
      console.log('📋 RESPOSTA:\n', JSON.stringify(data, null, 2));
      console.log('\n✅ LOGIN REALIZADO COM SUCESSO!');
    } else {
      const text = await response.text();
      console.log('📋 RESPOSTA (erro):\n', text);
      console.log('\n❌ FALHA NO LOGIN');
    }
  } catch (error) {
    console.error('\n❌ ERRO:', error);
    console.log('\n💡 Certifique-se de que o servidor está rodando: npm run dev');
  }
}

testLogin();
