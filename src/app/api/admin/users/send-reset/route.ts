import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const sendResetSchema = z.object({
  userId: z.string().uuid(),
});

const SUPER_ADMINS = ['arafacriou@gmail.com', 'edduardooo2011@gmail.com'];

/**
 * POST /api/admin/users/send-reset
 * Envia link de reset de senha para um usuário específico
 * @returns { resetUrl: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação e permissão de super-admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é super-admin
    if (!SUPER_ADMINS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 2. Validar body
    const body = await request.json();
    const { userId } = sendResetSchema.parse(body);

    // 3. Buscar usuário
    const [targetUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 4. Gerar token de reset
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // 5. Salvar token no banco
    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpiry: expires,
      })
      .where(eq(users.id, targetUser.id));

    // 6. Montar URL de reset
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    // 7. Tentar enviar email usando a função centralizada
    const emailResult = await sendEmail({
      to: targetUser.email,
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
              <p>Olá ${targetUser.name || 'usuário'}!</p>
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

    if (!emailResult.success) {
      console.error('Erro ao enviar email:', emailResult.error);
      return NextResponse.json(
        {
          error: emailResult.error || 'Erro ao enviar email. Tente novamente ou use "Copiar Link".',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Email enviado via ${emailResult.provider === 'gmail' ? 'Gmail' : 'Resend'}`,
      resetUrl,
    });
  } catch (error) {
    console.error('Erro ao processar reset de senha:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Erro ao processar requisição',
      },
      { status: 500 }
    );
  }
}
