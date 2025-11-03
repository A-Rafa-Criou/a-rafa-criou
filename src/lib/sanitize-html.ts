import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML para prevenir XSS e outros ataques
 * Permite formatação básica: negrito, itálico, sublinhado, listas, alinhamento
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    // No servidor, retorna o HTML sem sanitização (será sanitizado no cliente)
    return html;
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
      'a',
      'span',
      'div',
    ],
    ALLOWED_ATTR: [
      'style', // Para alinhamento de texto
      'class', // Para classes do Tiptap
      'href',
      'target',
      'rel', // Para links
    ],
  });
}

/**
 * Converte HTML para texto simples (útil para meta tags)
 */
export function htmlToText(html: string): string {
  if (typeof window === 'undefined') {
    // No servidor, remove tags HTML básicas
    return html.replace(/<[^>]*>/g, '').trim();
  }

  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return div.textContent || div.innerText || '';
}
