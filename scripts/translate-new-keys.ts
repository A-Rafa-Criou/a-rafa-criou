/**
 * Script para traduzir novas chaves adicionadas ao common.json
 * Executa: npx tsx scripts/translate-new-keys.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

// Carregar .env.local
config({ path: resolve(process.cwd(), '.env.local') });

interface TranslationResponse {
  translations: Array<{
    text: string;
    detected_source_language?: string;
  }>;
}

async function translateText(text: string, targetLang: 'EN' | 'ES'): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPL_API_KEY não encontrada no .env.local');
  }

  const isFreeKey = apiKey.endsWith(':fx');
  const endpoint = isFreeKey
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
      source_lang: 'PT',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as TranslationResponse;
  return data.translations[0]?.text || text;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function translateObject(obj: any, targetLang: 'EN' | 'ES'): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Traduzir string
      if (value.includes('{{')) {
        // String com interpolação - traduzir mas manter placeholders
        result[key] = await translateText(value, targetLang);
      } else {
        result[key] = await translateText(value, targetLang);
      }
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } else if (typeof value === 'object' && value !== null) {
      // Recursivo para objetos aninhados
      result[key] = await translateObject(value, targetLang);
    } else {
      result[key] = value;
    }
  }

  return result;
}

async function main() {
  console.log('🌐 Traduzindo novas chaves do common.json...\n');

  // Ler PT (fonte)
  const ptPath = resolve(process.cwd(), 'public/locales/pt/common.json');
  const ptContent = JSON.parse(readFileSync(ptPath, 'utf-8'));

  // Extrair apenas as novas seções
  const newKeys = {
    'orders.detail': ptContent.orders.detail,
    footer: ptContent.footer,
  };

  console.log('📝 Chaves a traduzir:', Object.keys(newKeys));

  // Traduzir para EN
  console.log('\n🇬🇧 Traduzindo para EN...');
  const enTranslations = {
    'orders.detail': await translateObject(newKeys['orders.detail'], 'EN'),
    footer: await translateObject(newKeys.footer, 'EN'),
  };

  // Ler EN existente e mesclar
  const enPath = resolve(process.cwd(), 'public/locales/en/common.json');
  const enContent = JSON.parse(readFileSync(enPath, 'utf-8'));
  enContent.orders = enContent.orders || {};
  enContent.orders.detail = enTranslations['orders.detail'];
  enContent.footer = enTranslations.footer;

  writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf-8');
  console.log('✅ EN atualizado');

  // Traduzir para ES
  console.log('\n🇪🇸 Traduzindo para ES...');
  const esTranslations = {
    'orders.detail': await translateObject(newKeys['orders.detail'], 'ES'),
    footer: await translateObject(newKeys.footer, 'ES'),
  };

  // Ler ES existente e mesclar
  const esPath = resolve(process.cwd(), 'public/locales/es/common.json');
  const esContent = JSON.parse(readFileSync(esPath, 'utf-8'));
  esContent.orders = esContent.orders || {};
  esContent.orders.detail = esTranslations['orders.detail'];
  esContent.footer = esTranslations.footer;

  writeFileSync(esPath, JSON.stringify(esContent, null, 2), 'utf-8');
  console.log('✅ ES atualizado');

  console.log('\n🎉 Todas as traduções concluídas!');
}

main().catch(console.error);
