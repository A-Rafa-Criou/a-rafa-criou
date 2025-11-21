/**
 * Helpers para formatação de moedas
 */

export type Currency = 'BRL' | 'USD' | 'EUR' | 'MXN';

/**
 * Retorna o símbolo da moeda
 */
export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
    MXN: 'MXN$',
  };
  return symbols[currency] || 'R$';
}

/**
 * Formata um valor monetário com o símbolo correto
 */
export function formatCurrency(amount: number | string, currency: Currency = 'BRL'): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbol = getCurrencySymbol(currency);

  // Para BRL e EUR, o símbolo vem antes
  // Para USD e MXN, também (padrão brasileiro)
  return `${symbol} ${value.toFixed(2)}`;
}

/**
 * Formata valor com locale específico (opcional)
 */
export function formatCurrencyWithLocale(
  amount: number | string,
  currency: Currency = 'BRL'
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  } catch {
    // Fallback se a moeda não for suportada
    return formatCurrency(value, currency);
  }
}
