import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  replyTo?: string;
}

/**
 * Envia email via Resend (pago) ou Gmail (gratuito)
 * Prioridade: Resend > Gmail > Erro
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  // Tentar Resend primeiro (se configurado)
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend(payload);
    } catch (error) {
      console.warn('⚠️ Resend falhou, tentando Gmail...', error);
      // Fallback para Gmail
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        const { sendEmailViaGmail } = await import('./email-gmail');
        return sendEmailViaGmail(payload);
      }
      // Re-throw se não tiver Gmail configurado
      throw error;
    }
  }

  // Fallback para Gmail (gratuito)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const { sendEmailViaGmail } = await import('./email-gmail');
    return sendEmailViaGmail(payload);
  }

  // Nenhum provedor configurado
  console.error('❌ Nenhum provedor de email configurado!');
  console.log('Configure: RESEND_API_KEY ou GMAIL_USER + GMAIL_APP_PASSWORD');
  throw new Error('Nenhum provedor de email configurado');
}

/**
 * Envia email via Resend
 */
async function sendViaResend(payload: EmailPayload): Promise<void> {
  try {
    // Sanitizar tags: remover caracteres especiais e limitar valores
    const sanitizedTags = payload.metadata
      ? Object.entries(payload.metadata)
          .filter(([_, value]) => value !== null && value !== undefined)
          .map(([name, value]) => {
            // Remover caracteres especiais e espaços
            const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const sanitizedValue = String(value)
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .substring(0, 50); // Limitar tamanho

            return {
              name: sanitizedName,
              value: sanitizedValue,
            };
          })
          .slice(0, 5) // Resend limita a 5 tags
      : undefined;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo || process.env.RESEND_REPLY_TO_EMAIL,
      tags: sanitizedTags,
    });

    if (error) {
      console.error('❌ Erro Resend:', error);
      throw new Error(error.message);
    }

    console.log('✅ Email enviado via Resend:', data?.id);
  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error);
    throw error;
  }
}
