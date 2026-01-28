/**
 * Converte texto para slug válido, removendo acentos sem cortar letras
 * @param text - Texto a ser convertido
 * @returns Slug no formato: letras minúsculas, números e hífen
 *
 * @example
 * generateSlug("José da Silva") // "jose-da-silva"
 * generateSlug("María García") // "maria-garcia"
 * generateSlug("François Müller") // "francois-muller"
 */
export function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Normaliza e remove acentos (mantém as letras base)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove caracteres especiais, mantém letras, números e espaços
      .replace(/[^a-z0-9\s-]/g, '')
      // Substitui espaços múltiplos por um único espaço
      .replace(/\s+/g, ' ')
      // Substitui espaços por hífen
      .replace(/\s/g, '-')
      // Remove hífens múltiplos
      .replace(/-+/g, '-')
      // Remove hífen do início e fim
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * Gera um slug único baseado em um texto base
 * Adiciona sufixo numérico se necessário
 *
 * @param baseText - Texto base para gerar o slug
 * @param checkUnique - Função assíncrona que verifica se o slug já existe
 * @param maxLength - Comprimento máximo do slug (padrão: 50)
 * @returns Slug único
 *
 * @example
 * await generateUniqueSlug("José Silva", async (slug) => {
 *   const exists = await db.query.affiliates.findFirst({
 *     where: eq(affiliates.customSlug, slug)
 *   });
 *   return !!exists;
 * });
 */
export async function generateUniqueSlug(
  baseText: string,
  checkUnique: (slug: string) => Promise<boolean>,
  maxLength = 50
): Promise<string> {
  let slug = generateSlug(baseText).substring(0, maxLength);

  // Se o slug for muito curto, retornar erro
  if (slug.length < 3) {
    throw new Error('Nome muito curto para gerar slug válido');
  }

  // Verificar unicidade
  let isUnique = !(await checkUnique(slug));
  let counter = 1;

  while (!isUnique && counter < 100) {
    const suffix = `-${counter}`;
    const availableLength = maxLength - suffix.length;
    slug = generateSlug(baseText).substring(0, availableLength) + suffix;
    isUnique = !(await checkUnique(slug));
    counter++;
  }

  if (!isUnique) {
    // Fallback: usar timestamp se não conseguir encontrar slug único
    slug = `${generateSlug(baseText).substring(0, 40)}-${Date.now().toString(36)}`;
  }

  return slug;
}
