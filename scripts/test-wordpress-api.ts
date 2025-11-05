import fetch from 'node-fetch';

interface WordPressResponse {
  valid?: boolean;
  user_id?: number;
  email?: string;
  hash?: string;
  hash_length?: number;
  message?: string;
  code?: string;
}

async function testWordPressAPI() {
  console.log('\n🧪 TESTANDO API DO WORDPRESS\n');
  
  const WORDPRESS_API_URL = 'https://arafacriou.com.br/wp-json/nextjs/v1/validate-password';
  const API_KEY = 'wp_a521bccb4d50dd1b2391d09dfb16babdeba490b74f4ffb872236bad686fba2a0';
  
  const email = 'edduardooo2011@hotmail.com';
  const password = '@Nike2011@';
  
  console.log('📧 Email:', email);
  console.log('🔑 Senha:', password);
  console.log('🌐 URL:', WORDPRESS_API_URL);
  console.log();
  
  try {
    console.log('🔄 Chamando WordPress API...\n');
    
    const response = await fetch(WORDPRESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    
    console.log('📊 Status:', response.status, response.statusText);
    console.log();
    
    const data = await response.json() as WordPressResponse;
    
    console.log('📋 RESPOSTA DO WORDPRESS:');
    console.log(JSON.stringify(data, null, 2));
    console.log();
    
    if (data.valid === true) {
      console.log('✅ SENHA VÁLIDA!');
      console.log('🔐 Hash recebido:', data.hash?.substring(0, 40) + '...');
      console.log('📏 Tamanho:', data.hash_length, 'chars');
      console.log();
      console.log('🎉 SUCESSO! Agora podemos atualizar o Next.js com este hash.\n');
    } else if (data.valid === false) {
      console.log('❌ SENHA INVÁLIDA no WordPress');
      console.log('💡 O Ultimate Member pode estar bloqueando ou a senha está errada.\n');
    } else if (data.code) {
      console.log('⚠️  ERRO:', data.code);
      console.log('📝 Mensagem:', data.message);
      console.log();
      
      if (data.code === 'rest_no_route') {
        console.log('💡 O snippet ainda não foi ativado no WordPress.');
        console.log('   Vá em Snippets → Ative o "Next.js Password Sync API"\n');
      } else if (data.code === 'unauthorized') {
        console.log('💡 API Key incorreta. Verifique se usou a mesma chave.\n');
      }
    }
    
  } catch (error) {
    const err = error as Error;
    console.error('❌ ERRO ao chamar API:', err.message);
    console.log();
    console.log('💡 Possíveis causas:');
    console.log('   1. WordPress está fora do ar');
    console.log('   2. Endpoint não foi criado ainda');
    console.log('   3. Firewall bloqueando a requisição\n');
  }
}

testWordPressAPI().catch(console.error);
