/**
 * Script para testar autenticação Gmail SMTP
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function testGmailAuth() {
  console.log('\n🔍 Verificando configuração Gmail...\n');

  // Verificar variáveis
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser) {
    console.error('❌ GMAIL_USER não configurado no .env.local');
    return;
  }

  if (!gmailPassword) {
    console.error('❌ GMAIL_APP_PASSWORD não configurado no .env.local');
    return;
  }

  console.log('✅ GMAIL_USER:', gmailUser);
  console.log('✅ GMAIL_APP_PASSWORD:', gmailPassword.substring(0, 4) + '...' + gmailPassword.substring(gmailPassword.length - 4));
  console.log('   Tamanho da senha:', gmailPassword.length, 'caracteres');
  console.log('   Tem espaços?', gmailPassword.includes(' ') ? '⚠️ SIM (REMOVA!)' : '✅ NÃO');
  console.log('');

  // Criar transporter
  console.log('🔌 Tentando conectar ao Gmail SMTP...\n');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  try {
    // Verificar conexão
    await transporter.verify();
    console.log('✅ Autenticação Gmail FUNCIONANDO!\n');

    // Enviar email de teste
    console.log('📧 Enviando email de teste...\n');

    const info = await transporter.sendMail({
      from: `"A Rafa Criou (TESTE)" <${gmailUser}>`,
      to: gmailUser, // Enviar para si mesmo
      subject: '✅ Teste de Autenticação Gmail - A Rafa Criou',
      html: `
        <h2>🎉 Parabéns!</h2>
        <p>A autenticação Gmail está funcionando corretamente.</p>
        <p><strong>Configuração:</strong></p>
        <ul>
          <li>Email: ${gmailUser}</li>
          <li>App Password: Configurado corretamente ✅</li>
        </ul>
        <p>Agora você pode receber notificações de vendas!</p>
        <hr>
        <small>Este é um email de teste do sistema A Rafa Criou</small>
      `,
    });

    console.log('✅ Email de teste enviado com sucesso!');
    console.log('   Message ID:', info.messageId);
    console.log('\n📬 Verifique sua caixa de entrada:', gmailUser);
    console.log('\n🎯 Próximos passos:');
    console.log('   1. Verificar email recebido');
    console.log('   2. Se não receber, verificar spam/lixo eletrônico');
    console.log('   3. Testar compra real no site');
    console.log('');
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('❌ ERRO ao conectar com Gmail:\n');
    console.error(err.message || error);
    console.error('');

    if (err.code === 'EAUTH') {
      console.log('🔧 SOLUÇÃO:');
      console.log('');
      console.log('1. Verificar 2FA está ATIVO:');
      console.log('   https://myaccount.google.com/security');
      console.log('');
      console.log('2. GERAR NOVA App Password:');
      console.log('   a) Acesse: https://myaccount.google.com/apppasswords');
      console.log('   b) Criar nova senha para "Mail"');
      console.log('   c) Copiar os 16 caracteres (exemplo: abcd efgh ijkl mnop)');
      console.log('   d) Colar no .env.local SEM ESPAÇOS:');
      console.log('      GMAIL_APP_PASSWORD=abcdefghijklmnop');
      console.log('');
      console.log('3. Reiniciar servidor (Ctrl+C e npm run dev)');
      console.log('');
      console.log('4. Executar este script novamente:');
      console.log('   npx tsx scripts/test-gmail-auth.ts');
      console.log('');
    }
  }
}

testGmailAuth().catch(console.error);
