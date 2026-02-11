/**
 * Integração com Gmail via Nodemailer (GRATUITO)
 * Conexão direta sem pool - compatível com serverless (Vercel)
 */

import { sendEmail } from '@/lib/email';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  replyTo?: string;
}

/**
 * Envia email via Gmail (GRATUITO - até 500 emails/dia)
 * Reutiliza transporter persistente = envio instantâneo
 */
export async function sendEmailViaGmail(payload: EmailPayload): Promise<void> {
  // Usa sendEmail unificado: Resend (instantâneo) → Gmail (fallback)
  const result = await sendEmail({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (!result.success) {
    throw new Error(`Falha ao enviar email: ${result.error}`);
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
