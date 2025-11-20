/**
 * Integração com Gmail via Nodemailer (GRATUITO)
 * Alternativa ao Resend para pequenos volumes
 */

import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  replyTo?: string;
}

/**
 * Envia email via Gmail (GRATUITO - até 500 emails/dia)
 */
export async function sendEmailViaGmail(payload: EmailPayload): Promise<void> {
  // Verificar se credenciais Gmail estão configuradas
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('⚠️ Gmail não configurado - tentando Resend...');

    // Fallback para Resend se disponível
    if (process.env.RESEND_API_KEY) {
      const { sendEmail } = await import('./email');
      return sendEmail(payload);
    }

    throw new Error('Nenhum provedor de email configurado');
  }

  try {
    // Criar transporter do Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // App Password, não senha normal
      },
    });

    // Enviar email
    const info = await transporter.sendMail({
      from: `"A Rafa Criou" <${process.env.GMAIL_USER}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo || process.env.GMAIL_USER,
    });

    console.log('✅ Email enviado via Gmail:', info.messageId);
  } catch (error) {
    console.error('❌ Erro ao enviar email via Gmail:', error);
    throw error;
  }
}

/**
 * CONFIGURAÇÃO GMAIL (GRATUITO):
 *
 * 1. Criar conta Gmail (se não tiver)
 * 2. Ativar verificação em 2 etapas:
 *    - https://myaccount.google.com/security
 *    - "Verificação em duas etapas" → Ativar
 *
 * 3. Gerar App Password:
 *    - https://myaccount.google.com/apppasswords
 *    - Selecionar app: "Email"
 *    - Selecionar dispositivo: "Outro" → "A Rafa Criou"
 *    - Copiar senha gerada (16 caracteres)
 *
 * 4. Adicionar no .env:
 *    GMAIL_USER=seu-email@gmail.com
 *    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 *
 * LIMITES GMAIL:
 * - 500 emails/dia (gratuito)
 * - Ideal para: 1-100 pedidos/dia
 * - Evitar spam: aguardar 1s entre envios
 *
 * QUANDO MIGRAR PARA RESEND:
 * - Mais de 300 emails/dia
 * - Melhor deliverability
 * - Domínio personalizado
 * - Rastreamento avançado
 */
