/**
 * Validação de acesso à área financeira
 * APENAS arafacriou@gmail.com pode acessar
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const ALLOWED_EMAIL = 'arafacriou@gmail.com';

export async function validateFinancialAccess(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.email === ALLOWED_EMAIL;
}

export async function requireFinancialAccess() {
  const hasAccess = await validateFinancialAccess();
  if (!hasAccess) {
    throw new Error('Acesso negado: área financeira restrita');
  }
}

export function getFinancialEmail() {
  return ALLOWED_EMAIL;
}
