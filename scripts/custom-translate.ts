/**
 * Script para aplicar traduções CUSTOMIZADAS em espanhol
 * (substituir traduções automáticas por termos específicos)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import { productI18n } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSlug } from '../src/lib/deepl';

config({ path: resolve(process.cwd(), '.env.local') });

// Mapeamento de traduções customizadas
const CUSTOM_TRANSLATIONS: Record<string, string> = {
  // Termos específicos (ordem: mais específicos primeiro)
  'ESCUELA PIONERA': 'ESCUELA DE PRECURSORES',
  'TARJETA DE LA ESCUELA PIONERA': 'TARJETA DE LA ESCUELA DE PRECURSORES',
  'PORTALÁPICES - PIONEER SCHOOL': 'PORTA BOLÍGRAFO - ESCUELA DE PRECURSORES',
  PORTALÁPICES: 'PORTA BOLÍGRAFO',
  'SALOPA/TAG - PIONEROS': 'SALOPA/TAG - PRECURSORES',
  'BOLSAS - PIONEROS': 'BOLSAS - PRECURSORES',
  PIONEROS: 'PRECURSORES',
  PIONERO: 'PRECURSOR',
  PIONEER: 'PRECURSOR',

  // Indicadores/Acomodadores (já feito)
  INDICADORES: 'ACOMODADORES',

  // Lembrancinha/Recuerdito
  SOUVENIR: 'RECUERDITO',
  SOUVENIRS: 'RECUERDITOS',
  'RECUERDO PARA': 'RECUERDITO PARA',
  'RECUERDO DEL': 'RECUERDITO DEL',
  'RECUERDO DE': 'RECUERDITO DE',
  'RECUERDO POR': 'RECUERDITO POR',

  // Outros termos
  BROADCASTING: 'BROADCASTING',
  PAPELERÍA: 'PAPELES',
  PLACAS: 'PLAQUITAS',
  BAUTISMO: 'BAUTISMO',
  EMISIÓN: 'TAG',
  BARBACOA: 'PARRILLADA',
  EXCURSIÓN: 'SALIDA DE CAMPO',
  'AGENTES MINISTERIALES': 'SIERVOS MINISTERIALES',
  CRIADOS: 'SIERVOS',
  'TARJETA Y PENDIENTES PARA HERMANAS': 'TARJETA PARA LIGA Y ARETES PARA HERMANAS',
  MAYORES: 'ANCIANOS',
  TROLEBÚS: 'CARRITO',
};

function applyCustomTranslations(text: string): string {
  let result = text;

  // Aplicar substituições (ordem importa - mais específicas primeiro)
  const sortedKeys = Object.keys(CUSTOM_TRANSLATIONS).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const value = CUSTOM_TRANSLATIONS[key];
    // Case-insensitive replacement
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, value);
  }

  return result;
}

async function main() {
  console.log('🔧 Aplicando traduções customizadas ES...\n');

  const allTranslations = await db.select().from(productI18n).where(eq(productI18n.locale, 'es'));

  console.log(`📦 ${allTranslations.length} traduções ES encontradas\n`);

  let updated = 0;

  for (const translation of allTranslations) {
    const originalName = translation.name;
    const customName = applyCustomTranslations(originalName);

    if (customName !== originalName) {
      const newSlug = generateSlug(customName);

      await db
        .update(productI18n)
        .set({
          name: customName,
          slug: newSlug,
        })
        .where(and(eq(productI18n.productId, translation.productId), eq(productI18n.locale, 'es')));

      console.log(`✅ ${originalName}`);
      console.log(`   → ${customName}`);
      console.log(`   Slug: ${newSlug}\n`);
      updated++;
    }
  }

  console.log(`\n✅ CONCLUÍDO!`);
  console.log(`   Atualizados: ${updated}`);
  console.log(`   Inalterados: ${allTranslations.length - updated}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
