/**
 * Script para CORRIGIR traduções ES existentes com termos customizados
 * Aplica o dicionário de traduções específicas (INDICADORES → ACOMODADORES, etc.)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { productI18n, productVariationI18n } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSlug } from '../src/lib/deepl';

config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Dicionário de traduções customizadas PT → ES
 * (MESMO do deepl.ts)
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
  EMISIÓN: 'TAG',
  CHURRASCO: 'PARRILLADA',
  'SAÍDA DE CAMPO': 'SALIDA DE CAMPO',
  'SERVOS MINISTERIAIS': 'SIERVOS MINISTERIALES',
  SERVOS: 'SIERVOS',
  'CARTÃO XUXINHA E BRINCOS PARA IRMÃS': 'TARJETA PARA LIGA Y ARETES PARA HERMANAS',
  'ESCOLA DE PIONEIROS': 'ESCUELA DE PRECURSORES',
  PIONEIROS: 'PRECURSORES',
  PIONEIRA: 'PRECURSORA',
  PIONEIRO: 'PRECURSOR',
  ANCIÃOS: 'ANCIANOS',
};

/**
 * Aplica traduções customizadas (case-insensitive)
 */
function applyCustomTranslations(text: string): string {
  const sortedKeys = Object.keys(CUSTOM_TRANSLATIONS_ES).sort((a, b) => b.length - a.length);

  let result = text;
  for (const key of sortedKeys) {
    const value = CUSTOM_TRANSLATIONS_ES[key];
    const regex = new RegExp(key, 'gi');

    result = result.replace(regex, match => {
      if (match === match.toUpperCase()) return value.toUpperCase();
      if (match === match.toLowerCase()) return value.toLowerCase();
      if (match[0] === match[0].toUpperCase()) {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      }
      return value;
    });
  }

  return result;
}

async function main() {
  console.log('🔧 CORRIGINDO traduções ES com termos customizados...\n');

  // 1. Corrigir produtos
  const productTranslations = await db
    .select()
    .from(productI18n)
    .where(eq(productI18n.locale, 'es'));

  console.log(`📦 ${productTranslations.length} produtos em ES encontrados\n`);

  let productsUpdated = 0;

  for (const translation of productTranslations) {
    const originalName = translation.name;
    const originalDesc = translation.description;
    const originalShortDesc = translation.shortDescription;

    // Aplicar traduções customizadas
    const newName = applyCustomTranslations(originalName);
    const newDesc = originalDesc ? applyCustomTranslations(originalDesc) : null;
    const newShortDesc = originalShortDesc ? applyCustomTranslations(originalShortDesc) : null;

    // Verificar se houve mudança
    const hasChanges =
      newName !== originalName || newDesc !== originalDesc || newShortDesc !== originalShortDesc;

    if (hasChanges) {
      const newSlug = generateSlug(newName);

      await db
        .update(productI18n)
        .set({
          name: newName,
          slug: newSlug,
          description: newDesc,
          shortDescription: newShortDesc,
          updatedAt: new Date(),
        })
        .where(and(eq(productI18n.productId, translation.productId), eq(productI18n.locale, 'es')));

      console.log(`✅ ${originalName}`);
      if (newName !== originalName) {
        console.log(`   Nome: ${newName}`);
      }
      if (newDesc !== originalDesc && originalDesc) {
        console.log(`   Descrição corrigida`);
      }
      if (newShortDesc !== originalShortDesc && originalShortDesc) {
        console.log(`   Desc. curta corrigida`);
      }
      console.log(`   Slug: ${newSlug}\n`);

      productsUpdated++;
    }
  }

  // 2. Corrigir variações
  const variationTranslations = await db
    .select()
    .from(productVariationI18n)
    .where(eq(productVariationI18n.locale, 'es'));

  console.log(`\n📋 ${variationTranslations.length} variações em ES encontradas\n`);

  let variationsUpdated = 0;

  for (const translation of variationTranslations) {
    const originalName = translation.name;
    const newName = applyCustomTranslations(originalName);

    if (newName !== originalName) {
      const newSlug = generateSlug(newName);

      await db
        .update(productVariationI18n)
        .set({
          name: newName,
          slug: newSlug,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productVariationI18n.variationId, translation.variationId),
            eq(productVariationI18n.locale, 'es')
          )
        );

      console.log(`✅ Variação: ${originalName} → ${newName}`);
      variationsUpdated++;
    }
  }

  console.log('\n\n✅ CONCLUÍDO!');
  console.log(`   Produtos atualizados: ${productsUpdated}/${productTranslations.length}`);
  console.log(`   Variações atualizadas: ${variationsUpdated}/${variationTranslations.length}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
