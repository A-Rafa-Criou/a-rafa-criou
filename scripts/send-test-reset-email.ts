/**
 * Script de TESTE para enviar email de reset para UM usuário específico
 * Mesmo formato que será enviado em massa, mas apenas para testar
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function sendTestResetEmail() {
  const testEmail = 'edduardooo2011@gmail.com';

  console.log('📧 Enviando email de reset em FORMATO DE MASSA para teste...\n');
  console.log(`🎯 Email de teste: ${testEmail}\n`);

  try {
    // Buscar usuário específico
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
      return;
    }

    console.log('✅ Usuário encontrado\n');

    // Configurar nodemailer com Gmail
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
      // Gerar token
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

      // Montar URL de reset
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      // Enviar email via Gmail (MESMO FORMATO DO ENVIO EM MASSA)
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
                <p>Migramos para uma nova plataforma e você precisa redefinir sua senha.</p>
                <p>Clique no botão abaixo para criar sua nova senha:</p>
                
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
      console.log('✅ EMAIL DE TESTE ENVIADO COM SUCESSO!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log();
      console.log('📧 Enviado para:', user.email);
      console.log('👤 Nome:', user.name || 'N/A');
      console.log();
      console.log('💡 Este é o formato EXATO que será enviado em massa');
      console.log('   Verifique:');
      console.log('   ✓ Design do email');
      console.log('   ✓ Texto da mensagem');
      console.log('   ✓ Link de redefinição funciona');
      console.log('   ✓ Informações estão corretas');
      console.log();
      console.log('📋 O email contém:');
      console.log('   "Migramos para uma nova plataforma."');
      console.log('   "Clique aqui para definir sua nova senha."');
    } catch (error) {
      console.error(`❌ Erro ao enviar para ${user.email}:`, error);
    }

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

sendTestResetEmail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
