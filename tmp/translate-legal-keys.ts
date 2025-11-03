import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente
config({ path: path.join(process.cwd(), '.env.local') });

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.error('❌ DEEPL_API_KEY não configurada no .env.local');
  process.exit(1);
}

async function translateWithDeepL(text: string, targetLang: 'EN' | 'ES'): Promise<string> {
  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text,
      source_lang: 'PT',
      target_lang: targetLang,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}

async function main() {
  console.log('🌍 Traduzindo chaves legais para EN e ES...\n');

  const ptPath = path.join(process.cwd(), 'public', 'locales', 'pt', 'common.json');
  const enPath = path.join(process.cwd(), 'public', 'locales', 'en', 'common.json');
  const esPath = path.join(process.cwd(), 'public', 'locales', 'es', 'common.json');

  const ptContent = JSON.parse(fs.readFileSync(ptPath, 'utf-8'));
  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const esContent = JSON.parse(fs.readFileSync(esPath, 'utf-8'));

  const keysToTranslate = [
    'legalTitle',
    'youCan',
    'youCanText',
    'youCannot',
    'youCannotText',
    'copyrightLaw',
    'digitalFileNotice',
    'personalUseOnly',
  ];

  // Traduzir para EN
  console.log('📝 Traduzindo para EN...');
  for (const key of keysToTranslate) {
    const ptText = ptContent.productInfo[key];
    if (!ptText) {
      console.log(`  ⚠️  Chave ${key} não encontrada em PT, pulando...`);
      continue;
    }

    if (!enContent.productInfo) enContent.productInfo = {};
    if (enContent.productInfo[key]) {
      console.log(`  ✓ EN: ${key} já traduzido, pulando...`);
      continue;
    }

    console.log(`  → ${key}: "${ptText.substring(0, 60)}..."`);
    const translation = await translateWithDeepL(ptText, 'EN');
    enContent.productInfo[key] = translation;
    console.log(`    ✅ "${translation.substring(0, 60)}..."`);

    // Rate limiting: 1 requisição por segundo (API gratuita)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Traduzir para ES
  console.log('\n📝 Traduzindo para ES...');
  for (const key of keysToTranslate) {
    const ptText = ptContent.productInfo[key];
    if (!ptText) {
      console.log(`  ⚠️  Chave ${key} não encontrada em PT, pulando...`);
      continue;
    }

    if (!esContent.productInfo) esContent.productInfo = {};
    if (esContent.productInfo[key]) {
      console.log(`  ✓ ES: ${key} já traduzido, pulando...`);
      continue;
    }

    console.log(`  → ${key}: "${ptText.substring(0, 60)}..."`);
    const translation = await translateWithDeepL(ptText, 'ES');
    esContent.productInfo[key] = translation;
    console.log(`    ✅ "${translation.substring(0, 60)}..."`);

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Salvar arquivos atualizados
  fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf-8');
  fs.writeFileSync(esPath, JSON.stringify(esContent, null, 2), 'utf-8');

  console.log('\n✅ Traduções salvas com sucesso!');
  console.log(`   EN: ${enPath}`);
  console.log(`   ES: ${esPath}`);
}

main().catch(console.error);
