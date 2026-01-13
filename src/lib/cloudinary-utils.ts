/**
 * Utilitários do Cloudinary que podem ser usados no cliente e servidor
 * Não importa o pacote 'cloudinary' para evitar erros de build no cliente
 */

const CLOUDINARY_CLOUD_NAME = 'dfbnggkod';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Extrai o publicId de uma URL do Cloudinary
 * Exemplos:
 * - https://res.cloudinary.com/dfbnggkod/image/upload/v1765369718/a-rafa-criou/images/variations/hnx4c9y5hggodgqocxcl.jpg
 * - Retorna: a-rafa-criou/images/variations/hnx4c9y5hggodgqocxcl
 */
function extractPublicId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  // Se já é um publicId (não tem http), retorna direto (sem extensão)
  if (!urlOrId.startsWith('http')) {
    return urlOrId.replace(/\.\w+$/, ''); // Remove extensão se houver
  }

  // Extrair publicId da URL
  const match = urlOrId.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  if (match && match[1]) {
    return match[1].replace(/\.\w+$/, ''); // Remove extensão
  }

  return null;
}

/**
 * Constrói URL otimizada do Cloudinary com transformações
 * SEMPRE retorna webp otimizado, independente do formato original
 *
 * @param cloudinaryIdOrUrl - cloudinaryId (ex: "a-rafa-criou/images/products/abc123") ou URL completa
 * @param transformations - Transformações opcionais (default: f_webp,q_auto:good)
 * @returns URL otimizada do Cloudinary
 */
export function getCloudinaryImageUrl(
  cloudinaryIdOrUrl: string | null | undefined,
  transformations: string = 'f_webp,q_auto:good'
): string {
  if (!cloudinaryIdOrUrl) return '/file.svg'; // Fallback

  const publicId = extractPublicId(cloudinaryIdOrUrl);

  if (!publicId) {
    console.warn('[Cloudinary] Não foi possível extrair publicId:', cloudinaryIdOrUrl);
    return '/file.svg'; // Fallback
  }

  // Construir URL com transformações
  return `${CLOUDINARY_BASE_URL}/${transformations}/${publicId}`;
}

/**
 * Normaliza URL do Cloudinary garantindo formato webp
 * @deprecated Use getCloudinaryImageUrl() que garante URLs sempre funcionais
 */
export function normalizeCloudinaryUrl(url: string): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // Retornar URL como está - Cloudinary mantém webp nativamente
  return url;
}
