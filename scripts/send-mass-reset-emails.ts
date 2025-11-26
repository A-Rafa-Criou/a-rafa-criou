/**
 * Script para enviar email de reset de senha para TODOS os usuários com senha legada
 */

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isNotNull, isNull, eq, and } from 'drizzle-orm';
import crypto from 'crypto';

async function sendMassResetEmails() {
  console.log('📧 Enviando emails de reset para usuários com senha legada...\n');

  try {
    // Buscar usuários com senha legada QUE AINDA NÃO RECEBERAM email (sem resetToken)
    const legacyUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.legacyPasswordHash),
          isNull(users.resetToken) // Apenas quem NÃO recebeu ainda
        )
      );

    console.log(`📊 Usuários que ainda NÃO receberam email: ${legacyUsers.length}\n`);

    if (legacyUsers.length === 0) {
      console.log('✅ Nenhum usuário com senha legada!');
      return;
    }

    let sent = 0;
    let errors = 0;

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

    for (const user of legacyUsers) {
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

        // Enviar email via Gmail
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

        sent++;

        if (sent % 10 === 0) {
          console.log(`   Enviados: ${sent}...`);
          // Delay para não sobrecarregar o servidor de email
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Erro ao enviar para ${user.email}:`, error);
        errors++;

        // Detectar limite do Gmail
        const errorMsg = String(error);
        if (errorMsg.includes('rate') || errorMsg.includes('limit') || errorMsg.includes('quota')) {
          console.log('\n⚠️  LIMITE DIÁRIO DO GMAIL ATINGIDO!');
          console.log('📅 Execute novamente amanhã para continuar.');
          break;
        }
      }
    }

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Enviados: ${sent}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('💡 Observações:');
    console.log('   ✓ Apenas usuários que AINDA NÃO receberam email');
    console.log('   ✓ Script salva resetToken no banco (marca como enviado)');
    console.log('   ✓ Execute novamente para enviar os restantes');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

sendMassResetEmails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
