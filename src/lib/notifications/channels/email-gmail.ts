/**
 * Canal de envio de email
 * Gmail Google Workspace como principal (2000/dia)
 * Resend como fallback via sendEmail()
 */

import { getGmailTransporter, resetGmailTransporter, htmlToText, sendEmail } from '@/lib/email';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  replyTo?: string;
}

/**
 * Envia email via Gmail Workspace (2000/dia) com fallback Resend
 */
export async function sendEmailViaGmail(payload: EmailPayload): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    // Fallback para sendEmail (Resend)
    const result = await sendEmail({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (!result.success) {
      throw new Error(`Falha ao enviar email: ${result.error}`);
    }
    return;
  }

  try {
    const transporter = getGmailTransporter();
    await transporter.sendMail({
      from: `"A Rafa Criou" <${process.env.GMAIL_USER}>`,
      to: payload.to,
      subject: payload.subject,
      text: htmlToText(payload.html),
      html: payload.html,
      replyTo: payload.replyTo || process.env.GMAIL_USER,
      headers: {
        'X-Priority': '1',
        Importance: 'high',
        'X-Mailer': 'A Rafa Criou',
      },
    });
  } catch (error) {
    resetGmailTransporter();
    console.warn('[sendEmailViaGmail] Gmail falhou, tentando Resend:', (error as Error).message);
    const result = await sendEmail({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (!result.success) {
      throw new Error(`Falha em ambos provedores: ${result.error}`);
    }
  }
}
