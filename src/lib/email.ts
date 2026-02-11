import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Inicializar Resend apenas se a chave estiver configurada
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// FROM_EMAIL deve ser configurado no Vercel com o domínio verificado no Resend
export const FROM_EMAIL = process.env.FROM_EMAIL || 'A Rafa Criou <noreply@arafacriou.com>';

// ============================================================================
// TRANSPORTER GMAIL - conexão direta sem pool (compatível com serverless)
// Igual ao teste que enviou instantaneamente
// ============================================================================
export function getGmailTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    // Headers para melhorar entregabilidade
    tls: { rejectUnauthorized: false },
  });
}

/**
 * Gera texto puro a partir do HTML (fallback para filtros de spam)
 * Emails com versão text + html têm melhor deliverability
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Mantido por compatibilidade (no-op sem pool)
export function resetGmailTransporter() {
  // Sem pool, nada a resetar
}

// ============================================================================
// SISTEMA DE CONTROLE DE COTA MENSAL
// ============================================================================
interface QuotaStatus {
  currentMonth: string; // "2025-12"
  resendCount: number;
  gmailCount: number;
  lastReset: string;
  isResendBlocked: boolean;
}

// Limites de email
const GMAIL_DAILY_LIMIT = 500; // Gmail permite 500/dia (PRIORIDADE)
const RESEND_DAILY_LIMIT = 100; // Resend free permite ~100/dia (FALLBACK)

// Armazenamento em memória
let quotaStatus: QuotaStatus = {
  currentMonth: new Date().toISOString().slice(0, 7),
  resendCount: 0,
  gmailCount: 0,
  lastReset: new Date().toISOString(),
  isResendBlocked: false,
};

// Função para verificar e resetar cota diariamente
function checkAndResetQuota() {
  const currentDay = new Date().toISOString().slice(0, 10);
  const lastResetDay = quotaStatus.lastReset.slice(0, 10);

  if (currentDay !== lastResetDay) {
    quotaStatus = {
      currentMonth: new Date().toISOString().slice(0, 7),
      resendCount: 0,
      gmailCount: 0,
      lastReset: new Date().toISOString(),
      isResendBlocked: false,
    };
  }
}

// ============================================================================
// FUNÇÃO UNIFICADA DE ENVIO DE EMAIL COM FALLBACK AUTOMÁTICO
// ============================================================================
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; provider: 'resend' | 'gmail'; error?: string }> {
  checkAndResetQuota();

  const fromEmail = params.from || FROM_EMAIL;

  // ============================================================
  // TENTATIVA 1: GMAIL (PRIORIDADE - 500/dia)
  // ============================================================
  if (
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD &&
    quotaStatus.gmailCount < GMAIL_DAILY_LIMIT
  ) {
    try {
      const transporter = getGmailTransporter();
      const toAddress = Array.isArray(params.to) ? params.to.join(', ') : params.to;
      await transporter.sendMail({
        from: `"A Rafa Criou" <${process.env.GMAIL_USER}>`,
        to: toAddress,
        replyTo: process.env.GMAIL_USER,
        subject: params.subject,
        text: htmlToText(params.html),
        html: params.html,
        headers: {
          'X-Priority': '1',
          'Importance': 'high',
          'X-Mailer': 'A Rafa Criou',
        },
      });

      quotaStatus.gmailCount++;
      return { success: true, provider: 'gmail' };
    } catch (gmailError: unknown) {
      const gmailErrorMessage = (gmailError as Error).message || '';
      // Resetar transporter em caso de erro de conexão
      resetGmailTransporter();
      if (
        gmailErrorMessage.includes('Daily user sending limit exceeded') ||
        gmailErrorMessage.includes('550-5.4.5')
      ) {
        // Gmail atingiu limite, continuar para Resend
      }
    }
  }

  // ============================================================
  // TENTATIVA 2: RESEND (FALLBACK - 100/dia)
  // ============================================================
  if (resend && !quotaStatus.isResendBlocked && quotaStatus.resendCount < RESEND_DAILY_LIMIT) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      quotaStatus.resendCount++;
      return { success: true, provider: 'resend' };
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || '';
      const errorObj = error as { statusCode?: number };
      const isQuotaError =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('limit exceeded') ||
        errorObj.statusCode === 429;

      if (isQuotaError) {
        quotaStatus.isResendBlocked = true;
      }

      return {
        success: false,
        provider: 'resend',
        error: (error as Error).message || 'Erro desconhecido',
      };
    }
  }

  return {
    success: false,
    provider: 'resend',
    error: 'Todos os provedores de email falharam ou atingiram cota',
  };
}

// ============================================================================
// FUNÇÃO PARA OBTER STATUS DA COTA (útil para admin)
// ============================================================================
export function getQuotaStatus(): QuotaStatus {
  checkAndResetQuota();
  return { ...quotaStatus };
}
