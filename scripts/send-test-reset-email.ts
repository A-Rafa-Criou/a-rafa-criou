/**
 * Script de TESTE para enviar email de reset para UM usuário específico
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function sendTestResetEmail() {
  const testEmail = 'edduardooo2011@gmail.com';

  console.log(`📧 Enviando email de teste para: ${testEmail}\n`);

  try {
    // Buscar usuário
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (!user) {
      console.log('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log('✅ Usuário encontrado');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name || 'N/A'}`);
    console.log();

    // Gerar token
    console.log('🔐 Gerando token de reset...');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Salvar token no usuário
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpiry: expires,
      })
      .where(eq(users.id, user.id));

    console.log('✅ Token criado');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   Expira: ${expires.toLocaleString('pt-BR')}`);
    console.log();

    // Gerar URL de reset
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    console.log('🔗 URL de reset:');
    console.log(`   ${resetUrl}`);
    console.log();

    // Enviar email usando Gmail (Resend tem problema com React em scripts)
    console.log('📨 Enviando email via Gmail...');

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"A Rafa Criou" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Recuperação de Senha - A Rafa Criou',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <img src="https://res.cloudinary.com/dfbnggkod/image/upload/v1763869173/a-rafa-criou/brand/logo.png" alt="A Rafa Criou" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
            </div>
            
            <div style="background: #fff; padding: 40px; border: 1px solid #e5e7eb;">
              <h2>Recuperação de Senha</h2>
              <p>Olá ${user.name || ''}!</p>
              <p>Clique no botão abaixo para redefinir sua senha:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #FED466; color: #111827; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Redefinir Senha
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Ou copie este link:</p>
              <p style="background: #f3f4f6; padding: 12px; word-break: break-all; font-size: 13px;">
                ${resetUrl}
              </p>
              
              <p style="color: #b91c1c; margin-top: 20px;">
                ⚠️ Este link expira em 24 horas.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EMAIL ENVIADO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('💡 Verifique seu email:');
    console.log(`   ${user.email}`);
    console.log();
    console.log('📋 O email contém:');
    console.log('   - Link para redefinir senha');
    console.log('   - Válido por 24 horas');
    console.log('   - Clique no link e defina sua nova senha');
  } catch (error) {
    console.error('❌ Erro:', error);
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

sendTestResetEmail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
