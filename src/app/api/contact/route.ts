import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const ContactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  message: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message } = ContactSchema.parse(body);

    // Enviar e-mail usando Resend
    await resend.emails.send({
      from: 'A Rafa Criou <contato@arafacriou.com>',
      to: 'arafacriou@gmail.com', // E-mail de destino
      replyTo: email, // E-mail do cliente para responder
      subject: `Novo contato de ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #FED466;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                margin: 0;
                color: #333;
                font-size: 24px;
              }
              .content {
                background-color: #fff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-radius: 0 0 8px 8px;
              }
              .info-box {
                background-color: #f4f4f4;
                padding: 15px;
                border-radius: 6px;
                margin: 15px 0;
              }
              .label {
                font-weight: bold;
                color: #FD9555;
                margin-bottom: 5px;
              }
              .message-box {
                background-color: #f9f9f9;
                padding: 20px;
                border-left: 4px solid #FED466;
                margin-top: 20px;
                white-space: pre-wrap;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #888;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📬 Nova Mensagem de Contato</h1>
            </div>
            
            <div class="content">
              <p>Você recebeu uma nova mensagem através do formulário de contato do site.</p>
              
              <div class="info-box">
                <div class="label">👤 Nome:</div>
                <div>${name}</div>
              </div>
              
              <div class="info-box">
                <div class="label">📧 E-mail:</div>
                <div><a href="mailto:${email}">${email}</a></div>
              </div>
              
              <div class="message-box">
                <div class="label">💬 Mensagem:</div>
                <p>${message}</p>
              </div>
              
              <p style="margin-top: 30px;">
                <strong>Para responder:</strong> Basta clicar em "Responder" neste e-mail ou enviar uma mensagem para 
                <a href="mailto:${email}">${email}</a>
              </p>
            </div>
            
            <div class="footer">
              <p>Este e-mail foi enviado através do formulário de contato de A Rafa Criou</p>
              <p>${new Date().toLocaleString('pt-BR')}</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('[Contact] ✅ E-mail de contato enviado com sucesso');
    console.log('[Contact] De:', name, `<${email}>`);

    return NextResponse.json({
      success: true,
      message: 'Mensagem enviada com sucesso!',
    });
  } catch (error) {
    console.error('[Contact] ❌ Erro ao enviar e-mail:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Erro ao enviar mensagem. Tente novamente.',
      },
      { status: 500 }
    );
  }
}
