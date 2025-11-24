/**
 * Integração com DeepL API para tradução automática
 * https://www.deepl.com/docs-api/
 *
 * Fallback automático para Google Translate quando DeepL atingir limite
 */

interface DeepLTranslateParams {
  text: string | string[];
  targetLang: 'PT' | 'EN' | 'ES';
  sourceLang?: 'PT' | 'EN' | 'ES';
}

/**
 * Dicionário de traduções customizadas PT → ES
 * Força traduções específicas do domínio (Testemunhas de Jeová)
 */
const CUSTOM_TRANSLATIONS_ES: Record<string, string> = {
  INDICADORES: 'ACOMODADORES',
  'LEMBRANCINHA PARA': 'RECUERDITO PARA',
  BROADCASTING: 'BROADCASTING', // Mantém em inglês
  PAPÉIS: 'PAPELES',
  PLAQUINHAS: 'PLAQUITAS',
  BATISMO: 'BAUTISMO',
  'PORTA CANETA': 'PORTA BOLÍGRAFO',
  EMISSÃO: 'TAG',
  EMISIÓN: 'TAG', // Corrigir se vier já traduzido
  CHURRASCO: 'PARRILLADA',
  'SAÍDA DE CAMPO': 'SALIDA DE CAMPO',
  'SERVOS MINISTERIAIS': 'SIERVOS MINISTERIALES', // Específico antes do genérico
  SERVOS: 'SIERVOS',
  'CARTÃO XUXINHA E BRINCOS PARA IRMÃS': 'TARJETA PARA LIGA Y ARETES PARA HERMANAS',
  'ESCOLA DE PIONEIROS': 'ESCUELA DE PRECURSORES',
  PIONEIROS: 'PRECURSORES',
  PIONEIRA: 'PRECURSORA',
  PIONEIRO: 'PRECURSOR',
  ANCIÃOS: 'ANCIANOS',
};

/**
 * Aplica traduções customizadas no texto (case-insensitive)
 * Prioriza termos mais longos primeiro (evita substituições parciais)
 */
function applyCustomTranslations(text: string, targetLang: 'EN' | 'ES'): string {
  if (targetLang !== 'ES') return text;

  // Ordenar por tamanho decrescente (termos mais longos primeiro)
  const sortedKeys = Object.keys(CUSTOM_TRANSLATIONS_ES).sort((a, b) => b.length - a.length);

  let result = text;
  for (const key of sortedKeys) {
    const value = CUSTOM_TRANSLATIONS_ES[key];
    // Case-insensitive: substitui mantendo o caso original quando possível
    const regex = new RegExp(key, 'gi');
    result = result.replace(regex, match => {
      // Se o match estava em MAIÚSCULAS, manter MAIÚSCULAS
      if (match === match.toUpperCase()) return value.toUpperCase();
      // Se estava em minúsculas, manter minúsculas
      if (match === match.toLowerCase()) return value.toLowerCase();
      // Se tinha capitalização, manter capitalização
      if (match[0] === match[0].toUpperCase()) {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value;
    });
  }

  return result;
}

/**
 * Fallback: traduz usando Google Translate (gratuito, ilimitado)
 * Para ES: substitui termos PT por ES ANTES de traduzir, preservando termos já corretos
 */
async function translateWithGoogle(
  text: string | string[],
  targetLang: 'PT' | 'EN' | 'ES',
  sourceLang?: 'PT' | 'EN' | 'ES'
): Promise<string[]> {
  const texts = Array.isArray(text) ? text : [text];
  const source = sourceLang?.toLowerCase() || 'auto';
  const target = targetLang.toLowerCase();

  try {
    const translated = await Promise.all(
      texts.map(async t => {
        let finalText = t;

        // Para ES: substituir termos PT diretamente, ANTES de enviar ao Google
        if (targetLang === 'ES') {
          const sortedKeys = Object.keys(CUSTOM_TRANSLATIONS_ES).sort(
            (a, b) => b.length - a.length
          );

          for (const ptTerm of sortedKeys) {
            const esTerm = CUSTOM_TRANSLATIONS_ES[ptTerm];
            const regex = new RegExp(ptTerm, 'gi');

            finalText = finalText.replace(regex, match => {
              // Preservar capitalização
              if (match === match.toUpperCase()) return esTerm.toUpperCase();
              if (match === match.toLowerCase()) return esTerm.toLowerCase();
              if (match[0] === match[0].toUpperCase()) {
                return esTerm.charAt(0).toUpperCase() + esTerm.slice(1).toLowerCase();
              }
              return esTerm;
            });
          }
        }

        // Enviar ao Google apenas se ainda tiver português
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(finalText)}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.warn('⚠️ Google Translate falhou, retornando com substituições manuais');
          return finalText;
        }

        const data: unknown = await response.json();

        // Google Translate returns a nested array like:
        // [ [ [ 'translated text', 'original text', ... ] ], ... ]
        // Avoid using `any` - we validate the shape before accessing.
        let translated = finalText;
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const maybeChunk = data[0];
          translated = maybeChunk
            .map((entry: unknown) => {
              if (Array.isArray(entry) && typeof entry[0] === 'string') return entry[0];
              return '';
            })
            .join('');
        }

        // Garantir que termos customizados permanecem corretos após Google
        if (targetLang === 'ES') {
          translated = applyCustomTranslations(translated, 'ES');
        }

        return translated;
      })
    );

    console.log('✅ Traduzido com Google Translate + termos customizados preservados');
    return translated;
  } catch (error) {
    console.error('❌ Erro no Google Translate:', error);
    return texts;
  }
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

      // Se quota excedida, usar Google Translate como fallback
      if (response.status === 456) {
        console.warn('⚠️ Quota DeepL excedida - usando Google Translate como fallback');
        return translateWithGoogle(text, targetLang, sourceLang);
      }

      console.error('❌ Erro DeepL:', error);
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data: DeepLResponse = await response.json();
    let translations = data.translations.map(t => t.text);

    // Aplicar traduções customizadas após DeepL (para garantir termos corretos)
    if (targetLang === 'ES') {
      translations = translations.map(t => applyCustomTranslations(t, 'ES'));
    }

    return translations;
  } catch (error) {
    console.error('❌ Erro ao traduzir com DeepL:', error);
    // Fallback: tenta Google Translate antes de retornar original
    console.log('🔄 Tentando Google Translate como fallback...');
    return translateWithGoogle(text, targetLang, sourceLang);
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
  // Mapa de caracteres acentuados para suas versões sem acento
  const accentsMap: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'a', 'À': 'a', 'Ã': 'a', 'Â': 'a', 'Ä': 'a',
    'É': 'e', 'È': 'e', 'Ê': 'e', 'Ë': 'e',
    'Í': 'i', 'Ì': 'i', 'Î': 'i', 'Ï': 'i',
    'Ó': 'o', 'Ò': 'o', 'Õ': 'o', 'Ô': 'o', 'Ö': 'o',
    'Ú': 'u', 'Ù': 'u', 'Û': 'u', 'Ü': 'u',
    'Ç': 'c', 'Ñ': 'n'
  }
  
  return text
    .toLowerCase()
    .split('')
    .map(char => accentsMap[char] || char) // Substituir acentos
    .join('')
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais restantes
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-+|-+$/g, '') // Remove hífens no início e fim
    .trim();
}

