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
 * - https://res.cloudinary.com/dfbnggkod/image/upload/f_webp,q_auto:good/a-rafa-criou/images/variations/hnx4c9y5hggodgqocxcl
 * - https://res.cloudinary.com/dfbnggkod/image/upload/f_webp,q_auto:good,a-rafa-criou/... (MALFORMADO - sem / antes do path)
 * - Retorna: a-rafa-criou/images/variations/hnx4c9y5hggodgqocxcl
 */
function extractPublicId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  // Se já é um publicId (não tem http), retorna direto (sem extensão)
  if (!urlOrId.startsWith('http')) {
    return urlOrId.replace(/\.\w+$/, ''); // Remove extensão se houver
  }

  // Extrair publicId da URL, considerando possíveis transformações
  // Formato: /upload/[transformações/][v123/]publicId[.ext]
  const match = urlOrId.match(/\/upload\/(?:[^\/]+\/)*?(a-rafa-criou\/.+?)(?:\.\w+)?$/);
  if (match && match[1]) {
    return match[1].replace(/\.\w+$/, ''); // Remove extensão
  }

  // ✅ NOVO: Tratar URLs MALFORMADAS com vírgula antes do path (ex: f_webp,q_auto:good,a-rafa-criou/...)
  // Buscar tudo depois de "upload/" e extrair apenas a parte que começa com "a-rafa-criou/"
  const malformedMatch = urlOrId.match(/\/upload\/(.+)$/);
  if (malformedMatch && malformedMatch[1]) {
    // Encontrar onde começa "a-rafa-criou/" ignorando transformações
    const afterUpload = malformedMatch[1];
    const rafaCriouIndex = afterUpload.indexOf('a-rafa-criou/');

    if (rafaCriouIndex !== -1) {
      // Extrair do "a-rafa-criou/" em diante e remover extensão
      const publicIdPart = afterUpload.substring(rafaCriouIndex);
      return publicIdPart.replace(/\.\w+$/, '');
    }
  }

  // Fallback: tentar extrair qualquer coisa depois de /upload/
  const fallbackMatch = urlOrId.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  if (fallbackMatch && fallbackMatch[1]) {
    // Remove transformações se existirem (ex: f_webp,q_auto:good/)
    const publicIdPart = fallbackMatch[1]
      .split('/')
      .filter(part => !part.includes(','))
      .join('/');
    return publicIdPart.replace(/\.\w+$/, '');
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
    return '/file.svg'; // Fallback
  }

  // Construir URL com transformações (sempre adicionar / entre transformations e publicId)
  const cleanTransformations = transformations.trim();
  if (cleanTransformations) {
    return `${CLOUDINARY_BASE_URL}/${cleanTransformations}/${publicId}`;
  }

  return `${CLOUDINARY_BASE_URL}/${publicId}`;
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
