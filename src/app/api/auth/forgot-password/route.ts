import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { resend, FROM_EMAIL } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });
    }

    // Buscar usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Sempre retornar sucesso por segurança (não revelar se email existe)
    if (!user) {
      return NextResponse.json({
        message: 'Se o e-mail existir, você receberá instruções de recuperação.',
      });
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no banco
    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry,
      })
      .where(eq(users.id, user.id));

    // Enviar e-mail
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    // Sempre tentar enviar e-mail (agora usando domínio verificado aquanize.com.br)
    try {
      const emailResult = await resend.emails.send({
        from: FROM_EMAIL, // Usando domínio verificado: noreply@aquanize.com.br
        to: email,
        subject: 'Recuperação de Senha - A Rafa Criou',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #FED466 0%, #FD9555 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: #111827; margin: 0; font-size: 24px;">A Rafa Criou</h1>
              </div>
              
              <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #111827; margin-top: 0;">Recuperação de Senha</h2>
                
                <p>Olá!</p>
                
                <p>Recebemos uma solicitação para redefinir a senha da sua conta em <strong>A Rafa Criou</strong>.</p>
                
                <p>Clique no botão abaixo para criar uma nova senha:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background: #FED466; color: #111827; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #FD9555;">
                    Redefinir Senha
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">Ou copie e cole este link no navegador:</p>
                <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563;">
                  ${resetUrl}
                </p>
                
                <div style="background: #fef3c7; border-left: 4px solid #fbbf24; padding: 15px; margin: 25px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⚠️ Importante:</strong> Este link expira em <strong>1 hora</strong>.
                  </p>
                </div>
                
                <p>Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanecerá inalterada.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">
                  Atenciosamente,<br>
                  <strong>Equipe A Rafa Criou</strong>
                </p>
                
                <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
                  Este é um e-mail automático. Por favor, não responda.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      console.log('✅ E-mail de recuperação enviado com sucesso!');
      console.log(`📧 Para: ${email}`);
      console.log(`🆔 Email ID: ${emailResult.data?.id || 'N/A'}`);
      
      // Também logar no console em desenvolvimento para facilitar testes
      if (process.env.NODE_ENV === 'development') {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  🔐 LINK DE RECUPERAÇÃO DE SENHA (Development)                ║');
        console.log('╠════════════════════════════════════════════════════════════════╣');
        console.log(`║  ${resetUrl.padEnd(62)}║`);
        console.log('╚════════════════════════════════════════════════════════════════╝\n');
      }

      return NextResponse.json({
        message: 'E-mail de recuperação enviado com sucesso!',
      });
    } catch (error) {
      console.error('[Forgot Password] Erro ao enviar e-mail:', error);

      // Em caso de erro no envio, ainda mostrar o link no console (fallback)
      console.log('\n⚠️ ERRO AO ENVIAR E-MAIL - LINK DE RECUPERAÇÃO:');
      console.log(`🔗 ${resetUrl}\n`);

      return NextResponse.json(
        {
          error: 'Erro ao enviar e-mail. Entre em contato com o suporte.',
          // Em desenvolvimento, incluir link no erro
          ...(process.env.NODE_ENV === 'development' && { resetUrl }),
        },
        { status: 500 }
      );
    }
  } catch {
    console.error('[Forgot Password] Erro ao processar solicitação');
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  }
}
