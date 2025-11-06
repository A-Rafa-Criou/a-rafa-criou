import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY não está configurado nas variáveis de ambiente');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Usando domínio verificado no Resend (aquanize.com.br)
export const FROM_EMAIL = process.env.FROM_EMAIL || 'A Rafa Criou <noreply@aquanize.com.br>';
