/**
 * Script simplificado para traduzir orders.detail e footer
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

// Carregar .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const apiKey = process.env.DEEPL_API_KEY!;
const isFreeKey = apiKey.endsWith(':fx');
const endpoint = isFreeKey
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

async function translateText(text: string, targetLang: 'EN' | 'ES'): Promise<string> {
  try {
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
      console.error(`❌ DeepL API error: ${response.status} - ${errorText}`);
      return text; // fallback
    }

    const data = await response.json();
    return data.translations[0]?.text || text;
  } catch (error) {
    console.error(`❌ Erro ao traduzir "${text}":`, error);
    return text; // fallback
  }
}

async function main() {
  console.log('🌐 Traduzindo orders.detail e footer...\n');

  // Ler PT
  const ptPath = resolve(process.cwd(), 'public/locales/pt/common.json');
  const pt = JSON.parse(readFileSync(ptPath, 'utf-8'));

  // Ler EN e ES
  const enPath = resolve(process.cwd(), 'public/locales/en/common.json');
  const esPath = resolve(process.cwd(), 'public/locales/es/common.json');
  const en = JSON.parse(readFileSync(enPath, 'utf-8'));
  const es = JSON.parse(readFileSync(esPath, 'utf-8'));

  // Garantir estrutura
  en.orders = en.orders || {};
  es.orders = es.orders || {};

  // Traduzir orders.detail
  console.log('📝 Traduzindo orders.detail...');
  en.orders.detail = {};
  es.orders.detail = {};

  for (const [key, value] of Object.entries(pt.orders.detail)) {
    if (typeof value === 'string') {
      console.log(`  - ${key}`);
      en.orders.detail[key] = await translateText(value, 'EN');
      await new Promise(r => setTimeout(r, 500));
      es.orders.detail[key] = await translateText(value, 'ES');
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Traduzir footer
  console.log('\n📝 Traduzindo footer...');
  en.footer = {};
  es.footer = {};

  for (const [key, value] of Object.entries(pt.footer)) {
    if (typeof value === 'string') {
      console.log(`  - ${key}`);
      en.footer[key] = await translateText(value, 'EN');
      await new Promise(r => setTimeout(r, 500));
      es.footer[key] = await translateText(value, 'ES');
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Salvar
  writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf-8');
  writeFileSync(esPath, JSON.stringify(es, null, 2), 'utf-8');

  console.log('\n✅ Traduções concluídas!');
}

main().catch(console.error);
