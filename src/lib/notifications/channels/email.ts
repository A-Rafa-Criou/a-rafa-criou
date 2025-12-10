import { sendEmail as sendUnifiedEmail } from '@/lib/email';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  replyTo?: string;
}

/**
 * Envia email via sistema unificado (Resend com fallback automático para Gmail)
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    // ✅ Usar sistema unificado com fallback automático Resend → Gmail
    const result = await sendUnifiedEmail({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      from: payload.replyTo || process.env.RESEND_FROM_EMAIL,
    });

    if (!result.success) {
      console.error(`❌ Erro ao enviar email via ${result.provider}:`, result.error);
      throw new Error(result.error || 'Falha ao enviar email');
    }

    console.log(`✅ Email enviado via ${result.provider.toUpperCase()}`);
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw error;
  }
}
