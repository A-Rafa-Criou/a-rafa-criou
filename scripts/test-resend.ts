import { Resend } from 'resend';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResend() {
  console.log('🧪 Testando Resend API...\n');

  // Verificar se a chave está configurada
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY não configurada!');
    process.exit(1);
  }

  console.log('✓ RESEND_API_KEY configurada');
  console.log(`  Chave: ${process.env.RESEND_API_KEY.substring(0, 10)}...`);

  // Tentar enviar e-mail de teste
  console.log('\n📧 Enviando e-mail de teste...\n');

  try {
    const result = await resend.emails.send({
      from: 'A Rafa Criou <onboarding@resend.dev>', // Domínio padrão do Resend (sempre funciona)
      to: 'edduardooo2011@gmail.com', // Seu e-mail
      subject: '🧪 Teste - Resend API',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px;">
              <h1 style="color: #111827; margin: 0;">✅ Resend Funcionando!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 10px;">
              <h2 style="color: #111827;">Teste de E-mail</h2>
              
              <p>Se você recebeu este e-mail, significa que o Resend está configurado corretamente! 🎉</p>
              
              <ul style="color: #4b5563;">
                <li><strong>API Key:</strong> Configurada ✓</li>
                <li><strong>Envio:</strong> Funcionando ✓</li>
                <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Este é um e-mail de teste automático da plataforma <strong>A Rafa Criou</strong>.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ E-mail enviado com sucesso!\n');
    console.log('📦 Resposta do Resend:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n✓ Verifique sua caixa de entrada (e spam) em: edduardooo2011@gmail.com');

  } catch (error) {
    console.error('\n❌ Erro ao enviar e-mail:\n');
    
    if (error instanceof Error) {
      console.error('Mensagem:', error.message);
      console.error('\nDetalhes:', error);
    } else {
      console.error(error);
    }

    console.log('\n🔍 Possíveis causas:');
    console.log('  1. API Key inválida');
    console.log('  2. Limite de envio atingido (free tier: 100 emails/dia)');
    console.log('  3. Domínio não verificado (use onboarding@resend.dev para testes)');
    console.log('  4. Problema de conexão');
    
    process.exit(1);
  }
}

testResend();
