import { Resend } from 'resend';
import nodemailer from 'nodemailer';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY não está configurado nas variáveis de ambiente');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// FROM_EMAIL deve ser configurado no Vercel com o domínio verificado no Resend
// Exemplo: FROM_EMAIL="A Rafa Criou <noreply@arafacriou.com>"
export const FROM_EMAIL = process.env.FROM_EMAIL || 'A Rafa Criou <noreply@arafacriou.com>';

// ============================================================================
// CONFIGURAÇÃO DO GMAIL COMO FALLBACK
// ============================================================================
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // seu-email@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // senha de app do Gmail (não a senha normal)
  },
});

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

// Limites de email por mês
const RESEND_MONTHLY_LIMIT = 3000; // Ajuste conforme seu plano Resend
const GMAIL_DAILY_LIMIT = 500; // Limite do Gmail (500/dia)

// Armazenamento em memória (em produção, use banco de dados)
let quotaStatus: QuotaStatus = {
  currentMonth: new Date().toISOString().slice(0, 7), // "2025-12"
  resendCount: 0,
  gmailCount: 0,
  lastReset: new Date().toISOString(),
  isResendBlocked: false, // Sistema detecta automaticamente quando atingir limite
};

console.log('🔧 [EMAIL] Sistema de email inicializado:', {
  mes: quotaStatus.currentMonth,
  resendBloqueado: quotaStatus.isResendBlocked,
  resendDisponivel: !!process.env.RESEND_API_KEY,
  gmailDisponivel: !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD,
  prioridade: '✅ Gmail PRIMEIRO → Resend como backup',
});

// Função para verificar e resetar cota no início do mês
function checkAndResetQuota() {
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (quotaStatus.currentMonth !== currentMonth) {
    console.log('🔄 [EMAIL] Reset mensal de cota:', {
      mesAnterior: quotaStatus.currentMonth,
      mesAtual: currentMonth,
      resendEnviados: quotaStatus.resendCount,
      gmailEnviados: quotaStatus.gmailCount,
    });

    quotaStatus = {
      currentMonth,
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
  // Verificar e resetar cota se mudou o mês
  checkAndResetQuota();

  const fromEmail = params.from || FROM_EMAIL;

  // ============================================================
  // TENTATIVA 1: GMAIL (PRIORIDADE)
  // ============================================================
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      console.log('📧 [EMAIL] Tentando enviar via Gmail (prioridade)...', {
        to: params.to,
        gmailCount: quotaStatus.gmailCount,
        limite: GMAIL_DAILY_LIMIT,
      });

      const info = await gmailTransporter.sendMail({
        from: `A Rafa Criou <${process.env.GMAIL_USER}>`,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        html: params.html,
      });

      quotaStatus.gmailCount++;

      console.log('✅ [EMAIL] Enviado via Gmail com sucesso!', {
        messageId: info.messageId,
        gmailCount: quotaStatus.gmailCount,
      });

      return { success: true, provider: 'gmail' };
    } catch (gmailError: unknown) {
      console.error('❌ [EMAIL] Erro ao enviar via Gmail:', gmailError);

      // Verificar se atingiu o limite diário do Gmail
      const gmailErrorMessage = (gmailError as Error).message || '';
      if (
        gmailErrorMessage.includes('Daily user sending limit exceeded') ||
        gmailErrorMessage.includes('550-5.4.5')
      ) {
        console.error('🚫 [EMAIL] LIMITE DIÁRIO DO GMAIL ATINGIDO (500 emails/dia)');
        console.error('🔄 [EMAIL] Tentando fallback para Resend...');
      } else {
        console.error('🔄 [EMAIL] Erro no Gmail, tentando fallback para Resend...');
      }
    }
  } else {
    console.log('⏭️ [EMAIL] Gmail não configurado. Usando Resend.');
  }

  // ============================================================
  // TENTATIVA 2: RESEND (FALLBACK)
  // ============================================================
  if (!quotaStatus.isResendBlocked && quotaStatus.resendCount < RESEND_MONTHLY_LIMIT) {
    try {
      console.log('📧 [EMAIL] Enviando via Resend (fallback)...', {
        to: params.to,
        resendCount: quotaStatus.resendCount,
        limite: RESEND_MONTHLY_LIMIT,
      });

      const result = await resend.emails.send({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      quotaStatus.resendCount++;

      console.log('✅ [EMAIL] Enviado via Resend com sucesso!', {
        id: result.data?.id,
        resendCount: quotaStatus.resendCount,
      });

      return { success: true, provider: 'resend' };
    } catch (error: unknown) {
      console.error('❌ [EMAIL] Erro ao enviar via Resend:', error);

      // Verificar se é erro de cota
      const errorMessage = (error as Error)?.message || '';
      const errorObj = error as { statusCode?: number };
      const isQuotaError =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('limit exceeded') ||
        errorObj.statusCode === 429;

      if (isQuotaError) {
        console.warn('⚠️ [EMAIL] Limite do Resend atingido! Bloqueando até próximo mês.');
        quotaStatus.isResendBlocked = true;
      }

      return {
        success: false,
        provider: 'resend',
        error: (error as Error).message || 'Erro desconhecido',
      };
    }
  } else {
    console.error('🚫 [EMAIL] Resend bloqueado ou limite atingido.', {
      bloqueado: quotaStatus.isResendBlocked,
      count: quotaStatus.resendCount,
      limite: RESEND_MONTHLY_LIMIT,
    });

    return {
      success: false,
      provider: 'resend',
      error: 'Ambos provedores falharam: Gmail e Resend sem quota',
    };
  }
}

// ============================================================================
// FUNÇÃO PARA OBTER STATUS DA COTA (útil para admin)
// ============================================================================
export function getQuotaStatus(): QuotaStatus {
  checkAndResetQuota();
  return { ...quotaStatus };
}
