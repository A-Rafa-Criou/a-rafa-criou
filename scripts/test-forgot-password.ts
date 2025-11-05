/**
 * Script para testar recuperação de senha via API
 */

const BASE_URL = 'http://localhost:3000';

async function testForgotPassword(email: string) {
  console.log('🧪 TESTE DE RECUPERAÇÃO DE SENHA\n');
  console.log(`📧 E-mail: ${email}\n`);
  console.log('🔄 Enviando requisição...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    console.log('📋 Resposta:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCESSO!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📬 Verifique o CONSOLE DO SERVIDOR para ver o link de reset!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (data.resetUrl) {
        console.log('\n🔗 Link de reset (modo desenvolvimento):');
        console.log(data.resetUrl);
      }
    } else {
      console.log('\n❌ ERRO');
    }
  } catch (error) {
    console.error('\n❌ Erro na requisição:', error);
    console.log('\n💡 Certifique-se de que o servidor está rodando: npm run dev');
  }
}

// Testar com o e-mail
const testEmail = process.argv[2] || 'edduardooo2011@hotmail.com';
testForgotPassword(testEmail);
