/**
 * Integração com DeepL API para tradução automática
 * https://www.deepl.com/docs-api/
 */

interface DeepLTranslateParams {
  text: string | string[];
  targetLang: 'PT' | 'EN' | 'ES';
  sourceLang?: 'PT' | 'EN' | 'ES';
}

interface DeepLTranslation {
  detected_source_language: string;
  text: string;
}

interface DeepLResponse {
  translations: DeepLTranslation[];
}

/**
 * Traduz texto usando DeepL API
 * Requer DEEPL_API_KEY no .env
 */
export async function translateWithDeepL({
  text,
  targetLang,
  sourceLang,
  preserveFormatting = false,
}: DeepLTranslateParams & { preserveFormatting?: boolean }): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ DEEPL_API_KEY não configurada, retornando texto original');
    return Array.isArray(text) ? text : [text];
  }

  // DeepL Free API usa api-free.deepl.com, Pro usa api.deepl.com
  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2'
    : 'https://api.deepl.com/v2';

  try {
    const params = new URLSearchParams();

    // Texto pode ser string ou array
    const texts = Array.isArray(text) ? text : [text];
    texts.forEach(t => params.append('text', t));

    params.append('target_lang', targetLang);
    if (sourceLang) params.append('source_lang', sourceLang);
    
    // Preservar formatação HTML
    if (preserveFormatting) {
      params.append('tag_handling', 'html');
      params.append('split_sentences', '0'); // Não quebrar sentenças
    }

    const response = await fetch(`${baseUrl}/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro DeepL:', error);
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data: DeepLResponse = await response.json();
    return data.translations.map(t => t.text);
  } catch (error) {
    console.error('❌ Erro ao traduzir com DeepL:', error);
    // Fallback: retorna texto original em caso de erro
    return Array.isArray(text) ? text : [text];
  }
}

/**
 * Traduz produto completo (name, description, shortDescription)
 */
export async function translateProduct(
  product: {
    name: string;
    description: string | null;
    shortDescription: string | null;
  },
  targetLang: 'EN' | 'ES',
  sourceLang: 'PT' = 'PT'
) {
  // Traduzir nome e shortDescription sem preservar HTML
  const [name, shortDescription] = await translateWithDeepL({
    text: [product.name, product.shortDescription || ''],
    targetLang,
    sourceLang,
  });

  // Traduzir description (longDescription) preservando formatação HTML
  const [description] = await translateWithDeepL({
    text: [product.description || ''],
    targetLang,
    sourceLang,
    preserveFormatting: true,
  });

  return {
    name,
    description,
    shortDescription,
  };
}

/**
 * Traduz categoria (name, description)
 */
export async function translateCategory(
  category: {
    name: string;
    description: string | null;
  },
  targetLang: 'EN' | 'ES',
  sourceLang: 'PT' = 'PT'
) {
  const textsToTranslate: string[] = [category.name, category.description || ''];

  const [name, description] = await translateWithDeepL({
    text: textsToTranslate,
    targetLang,
    sourceLang,
  });

  return {
    name,
    description,
  };
}

/**
 * Traduz variação de produto (apenas name)
 */
export async function translateVariation(
  variation: {
    name: string;
  },
  targetLang: 'EN' | 'ES',
  sourceLang: 'PT' = 'PT'
) {
  const [name] = await translateWithDeepL({
    text: variation.name,
    targetLang,
    sourceLang,
  });

  return { name };
}

/**
 * Gera slug a partir de texto traduzido
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
}
