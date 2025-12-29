/**
 * Utilitários para trabalhar com horário de Brasília (America/Sao_Paulo)
 */

/**
 * Obtém a data/hora atual no horário de Brasília
 */
export function getBrazilianTime(): Date {
  // Criar data atual no horário de Brasília
  const now = new Date();
  const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return brazilTime;
}

/**
 * Converte uma data UTC para horário de Brasília
 */
export function toBrazilianTime(date: Date): Date {
  const brazilTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return brazilTime;
}

/**
 * Verifica se uma promoção está ativa no horário de Brasília
 */
export function isPromotionActive(startDate: Date, endDate: Date, isActive: boolean): boolean {
  if (!isActive) return false;

  const now = getBrazilianTime();
  const start = toBrazilianTime(startDate);
  const end = toBrazilianTime(endDate);

  return now >= start && now <= end;
}
