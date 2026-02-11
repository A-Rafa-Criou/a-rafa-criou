/**
 * Script para corrigir traduções ES existentes no banco de dados
 * Aplica o glossário customizado nos nomes dos produtos em espanhol
 *
 * NÃO apaga nada - apenas ATUALIZA os registros existentes
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/lib/db';
import {
  products,
  productI18n,
  productVariations,
  productVariationI18n,
} from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSlug } from '../src/lib/deepl';

// Carregar .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Glossário PT → ES (mesmo do deepl.ts)
 * Lado esquerdo: termo em PT | Lado direito: como deve ficar em ES
 */
const GLOSSARY: Record<string, string> = {
  'CARTÃO XUXINHA E BRINCOS PARA IRMÃS': 'TARJETA PARA LIGA Y ARETES PARA HERMANAS',
  'LEMBRANCINHA PARA BROADCASTING': 'RECUERDITO PARA BROADCASTING',
  'ESCOLA DE PIONEIROS': 'ESCUELA DE PRECURSORES',
  'SERVOS MINISTERIAIS': 'SIERVOS MINISTERIALES',
  'LEMBRANCINHA PARA': 'RECUERDITO PARA',
  'SAÍDA DE CAMPO': 'SALIDA DE CAMPO',
  'PORTA CANETA': 'PORTA BOLÍGRAFO',
  BROADCASTING: 'BROADCASTING',
  INDICADORES: 'ACOMODADORES',
  LEMBRANCINHA: 'RECUERDITO',
  MINISTERIAIS: 'MINISTERIALES',
  PLAQUINHAS: 'PLAQUITAS',
  PIONEIROS: 'PRECURSORES',
  PIONEIRA: 'PRECURSORA',
  PIONEIRO: 'PRECURSOR',
  CHURRASCO: 'PARRILLADA',
  ANCIÃOS: 'ANCIANOS',
  BATISMO: 'BAUTISMO',
  BRINCOS: 'ARETES',
  CANETA: 'BOLÍGRAFO',
  CARTÃO: 'TARJETA',
  ESCOLA: 'ESCUELA',
  IRMÃS: 'HERMANAS',
  PAPÉIS: 'PAPELES',
  SAÍDA: 'SALIDA',
  SERVOS: 'SIERVOS',
  XUXINHA: 'LIGA',
  TAG: 'EMISIÓN',
};

// Ordenar por tamanho decrescente (termos mais longos primeiro para evitar substituições parciais)
const sortedKeys = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

/**
 * FASE 1: Correções diretas de padrões ES incorretos conhecidos
 * Esses padrões são criados por DeepL/Google e precisam ser corrigidos ANTES
 * do glossário palavra-a-palavra, pois envolvem reestruturação de frases.
 *
 * Formato: { match, replacement, requiresPt?, requiresNotPt? }
 */
const ES_BAD_PATTERNS: Array<{
  match: RegExp;
  replacement: string;
  requiresPt?: string;
  requiresNotPt?: string;
}> = [
  // === BROADCASTING traduzido incorretamente ===
  // Multi-palavra (mais longos primeiro para evitar substituições parciais)
  {
    match: /\bLA\s+RADIODIFUSIÓN\s+TELEVISIVA\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'BROADCASTING',
  },
  {
    match: /\bRADIODIFUSIÓN\s+TELEVISIVA\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'BROADCASTING',
  },
  {
    match: /\bLA\s+EMISIÓN\s+DE\s+TELEVISIÓN\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'BROADCASTING',
  },
  {
    match: /\bEMISIÓN\s+DE\s+TELEVISIÓN\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'BROADCASTING',
  },
  {
    match: /\bLA\s+TRANSMISIÓN\s+DE\s+TV\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'BROADCASTING',
  },
  {
    match: /\bTRANSMISIÓN\s+DE\s+TV\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'BROADCASTING',
  },
  {
    match: /\bLA\s+EMISIÓN\s+DE\s+TV\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'BROADCASTING',
  },
  { match: /\bEMISIÓN\s+DE\s+TV\b/gi, replacement: 'TV BROADCASTING', requiresPt: 'BROADCASTING' },
  // Palavra única - se PT tem "TV BROADCASTING", trocar por "TV BROADCASTING"
  {
    match: /\bLA\s+RADIODIFUSIÓN\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'TV BROADCASTING',
  },
  { match: /\bRADIODIFUSIÓN\b/gi, replacement: 'TV BROADCASTING', requiresPt: 'TV BROADCASTING' },
  {
    match: /\bLA\s+TRANSMISIÓN\b/gi,
    replacement: 'TV BROADCASTING',
    requiresPt: 'TV BROADCASTING',
  },
  { match: /\bTRANSMISIÓN\b/gi, replacement: 'TV BROADCASTING', requiresPt: 'TV BROADCASTING' },
  // Palavra única - se PT tem apenas "BROADCASTING" (sem TV)
  { match: /\bLA\s+RADIODIFUSIÓN\b/gi, replacement: 'BROADCASTING', requiresPt: 'BROADCASTING' },
  { match: /\bRADIODIFUSIÓN\b/gi, replacement: 'BROADCASTING', requiresPt: 'BROADCASTING' },
  { match: /\bLA\s+TRANSMISIÓN\b/gi, replacement: 'BROADCASTING', requiresPt: 'BROADCASTING' },
  { match: /\bTRANSMISIÓN\b/gi, replacement: 'BROADCASTING', requiresPt: 'BROADCASTING' },

  // === TAG traduzido incorretamente ===
  // "CONVITE + TAG" → ES deve ser "INVITACIÓN + EMISIÓN" (manter INVITACIÓN pois CONVITE = INVITACIÓN)
  {
    match: /INVITACIÓN\s*\+\s*ETIQUETA/gi,
    replacement: 'INVITACIÓN + EMISIÓN',
    requiresPt: 'CONVITE',
  },
  // "TAG" sozinho (sem CONVITE no PT) → ES tem "INVITACIÓN + ETIQUETA" por engano
  {
    match: /INVITACIÓN\s*\+\s*ETIQUETA/gi,
    replacement: 'EMISIÓN',
    requiresPt: 'TAG',
    requiresNotPt: 'CONVITE',
  },
  { match: /INVITACIÓN\s*\+\s*/gi, replacement: '', requiresPt: 'TAG', requiresNotPt: 'CONVITE' },
  // "TAG" traduzido como "ETIQUETA" (caso geral)
  { match: /\bETIQUETA\b/gi, replacement: 'EMISIÓN', requiresPt: 'TAG' },
  // "TAG" traduzido como "INVITACIÓN" sozinho (só quando PT não tem CONVITE)
  {
    match: /\bINVITACIÓN\b/gi,
    replacement: 'EMISIÓN',
    requiresPt: 'TAG',
    requiresNotPt: 'CONVITE',
  },
];

/**
 * Aplica o glossário ao nome do produto em ES, baseado no nome original em PT.
 *
 * Estratégia em 2 fases:
 * 1) Corrigir padrões multi-palavra incorretos conhecidos no texto ES
 * 2) Para cada termo do glossário presente no PT, garantir que o ES tem o termo correto
 */
function fixTranslation(ptName: string, currentEsName: string): string {
  let fixed = currentEsName;
  const ptUpper = ptName.toUpperCase();

  // === FASE 1: Corrigir padrões multi-palavra incorretos ===
  for (const pattern of ES_BAD_PATTERNS) {
    // Se tem requiresPt, só aplicar se o termo PT existe no nome original
    if (pattern.requiresPt && !ptUpper.includes(pattern.requiresPt.toUpperCase())) continue;
    // Se tem requiresNotPt, pular se o termo PT existe no nome original
    if (pattern.requiresNotPt && ptUpper.includes(pattern.requiresNotPt.toUpperCase())) continue;
    fixed = fixed.replace(pattern.match, pattern.replacement);
  }

  // === FASE 2: Glossário palavra-a-palavra ===
  for (const ptTerm of sortedKeys) {
    const esTerm = GLOSSARY[ptTerm];

    // Verificar se o termo PT existe no nome original em português
    const ptRegex = new RegExp(`\\b${escapeRegex(ptTerm)}\\b`, 'gi');
    if (!ptRegex.test(ptName)) continue;

    // Verificar se o termo correto já está no ES
    const esRegex = new RegExp(`\\b${escapeRegex(esTerm)}\\b`, 'gi');
    if (esRegex.test(fixed)) continue; // Já está correto

    // Termos incorretos conhecidos que podem aparecer na tradução ES
    const incorrectTranslations = getIncorrectTranslations(ptTerm);

    let replaced = false;
    for (const incorrect of incorrectTranslations) {
      const incorrectRegex = new RegExp(`\\b${escapeRegex(incorrect)}\\b`, 'gi');
      if (incorrectRegex.test(fixed)) {
        fixed = fixed.replace(incorrectRegex, match => {
          if (match === match.toUpperCase()) return esTerm.toUpperCase();
          if (match === match.toLowerCase()) return esTerm.toLowerCase();
          if (match[0] === match[0].toUpperCase()) {
            return esTerm.charAt(0).toUpperCase() + esTerm.slice(1).toLowerCase();
          }
          return esTerm;
        });
        replaced = true;
        break;
      }
    }

    // Se não encontrou nenhuma tradução incorreta conhecida, tentar substituir
    // o termo PT diretamente (pode ter ficado sem traduzir)
    if (!replaced) {
      const ptTermRegex = new RegExp(`\\b${escapeRegex(ptTerm)}\\b`, 'gi');
      if (ptTermRegex.test(fixed)) {
        fixed = fixed.replace(ptTermRegex, match => {
          if (match === match.toUpperCase()) return esTerm.toUpperCase();
          if (match === match.toLowerCase()) return esTerm.toLowerCase();
          if (match[0] === match[0].toUpperCase()) {
            return esTerm.charAt(0).toUpperCase() + esTerm.slice(1).toLowerCase();
          }
          return esTerm;
        });
      }
    }
  }

  // Limpar espaços duplos e + soltos
  fixed = fixed
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*\+\s*/, '')
    .replace(/\s*\+\s*$/, '')
    .trim();

  return fixed;
}

/**
 * Mapeamento de traduções incorretas conhecidas para cada termo PT
 */
function getIncorrectTranslations(ptTerm: string): string[] {
  const map: Record<string, string[]> = {
    INDICADORES: ['INDICADORES', 'INDICADOR'],
    'LEMBRANCINHA PARA BROADCASTING': [
      'RECUERDO PARA BROADCASTING',
      'RECUERDITO DE BROADCASTING',
      'SOUVENIR PARA BROADCASTING',
      'RECUERDO DE BROADCASTING',
      'REGALO PARA BROADCASTING',
    ],
    'LEMBRANCINHA PARA': ['RECUERDO PARA', 'SOUVENIR PARA', 'RECUERDO DE', 'REGALO PARA'],
    PAPÉIS: ['PAPELES', 'ROLES', 'PAPELS'],
    PLAQUINHAS: ['PLAQUITAS', 'PLACAS', 'TARJETAS', 'LETREROS', 'SEÑALES', 'CARTELES'],
    BATISMO: ['BAUTISMO', 'BAUTIZO'],
    'PORTA CANETA': [
      'PORTA BOLÍGRAFO',
      'PORTALÁPICES',
      'PORTA LÁPIZ',
      'PORTA BOLÍGRAFOS',
      'PORTABOLÍGRAFO',
      'PORTABOLÍGRAFOS',
      'PORTALÁPIZ',
    ],
    TAG: ['TAG', 'ETIQUETA', 'EMISIÓN', 'EMISSÃO'],
    CHURRASCO: ['BARBACOA', 'ASADO', 'PARRILLA'],
    'SAÍDA DE CAMPO': ['SALIDA DE CAMPO', 'SALIDA AL CAMPO'],
    'SERVOS MINISTERIAIS': [
      'SIERVOS MINISTERIALES',
      'SERVIDORES MINISTERIALES',
      'SERVOS MINISTERIALES',
    ],
    SERVOS: ['SIERVOS', 'SERVIDORES', 'SERVOS'],
    'CARTÃO XUXINHA E BRINCOS PARA IRMÃS': [
      'TARJETA PARA LIGA Y ARETES PARA HERMANAS',
      'TARJETA XUXINHA Y PENDIENTES PARA HERMANAS',
      'TARJETA XUXINHA Y ARETES PARA HERMANAS',
    ],
    'ESCOLA DE PIONEIROS': ['ESCUELA DE PRECURSORES', 'ESCUELA DE PIONEROS'],
    PIONEIROS: ['PIONEROS', 'PIONEIROS'],
    PIONEIRA: ['PIONERA', 'PIONEIRA'],
    PIONEIRO: ['PIONERO', 'PIONEIRO'],
    ANCIÃOS: ['ANCIANOS', 'ANCIÃOS', 'ANCIANS'],
    LEMBRANCINHA: ['RECUERDO', 'SOUVENIR', 'REGALO', 'LEMBRANCINHA'],
    MINISTERIAIS: ['MINISTERIALES', 'MINISTERIAIS'],
    BRINCOS: ['PENDIENTES', 'ARETES', 'BRINCOS'],
    CANETA: ['LÁPIZ', 'BOLÍGRAFO', 'LAPICERO', 'CANETA'],
    CARTÃO: ['TARJETA', 'CARTA', 'CARTÃO'],
    ESCOLA: ['ESCUELA', 'ESCOLA'],
    IRMÃS: ['HERMANAS', 'IRMÃS'],
    SAÍDA: ['SALIDA', 'SAÍDA'],
    XUXINHA: ['XUXINHA', 'LIGA'],
    BROADCASTING: ['EMISIÓN DE TV', 'TRANSMISIÓN DE TV', 'TRANSMISIÓN', 'EMISIÓN DE TELEVISIÓN'],
    TAG: ['TAG', 'ETIQUETA', 'INVITACIÓN', 'EMISSÃO'],
  };

  return map[ptTerm.toUpperCase()] || [];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log('🔍 MODO DRY-RUN: Apenas mostrando o que seria corrigido (sem alterar o banco)\n');
  } else {
    console.log('🔧 CORRIGINDO traduções ES existentes...\n');
  }

  // Buscar todos os produtos com suas traduções ES
  const allProducts = await db
    .select({
      productId: products.id,
      ptName: products.name,
      esName: productI18n.name,
      esSlug: productI18n.slug,
      esDescription: productI18n.description,
      esShortDescription: productI18n.shortDescription,
    })
    .from(products)
    .innerJoin(
      productI18n,
      and(eq(products.id, productI18n.productId), eq(productI18n.locale, 'es'))
    );

  console.log(`📦 ${allProducts.length} produtos com tradução ES encontrados\n`);

  let fixed = 0;
  let unchanged = 0;
  let errors = 0;

  for (const product of allProducts) {
    const ptName = product.ptName || '';
    const currentEsName = product.esName || '';

    // Aplicar glossário no nome
    const fixedName = fixTranslation(ptName, currentEsName);

    // Aplicar glossário na descrição e shortDescription também
    const fixedDescription = product.esDescription
      ? fixTranslation(ptName, product.esDescription)
      : product.esDescription;
    const fixedShortDescription = product.esShortDescription
      ? fixTranslation(ptName, product.esShortDescription)
      : product.esShortDescription;

    const nameChanged = fixedName !== currentEsName;
    const descChanged = fixedDescription !== product.esDescription;
    const shortDescChanged = fixedShortDescription !== product.esShortDescription;

    if (nameChanged || descChanged || shortDescChanged) {
      try {
        if (!isDryRun) {
          const updateData: Record<string, string | null> = {};

          if (nameChanged) {
            updateData.name = fixedName;
            updateData.slug = generateSlug(fixedName);
            updateData.seoTitle = fixedName;
          }
          if (descChanged) {
            updateData.description = fixedDescription;
            updateData.seoDescription = fixedDescription;
          }
          if (shortDescChanged) {
            updateData.shortDescription = fixedShortDescription;
          }

          await db
            .update(productI18n)
            .set(updateData)
            .where(and(eq(productI18n.productId, product.productId), eq(productI18n.locale, 'es')));
        }

        const prefix = isDryRun ? '🔍' : '✅';
        console.log(`${prefix} ${isDryRun ? 'SERIA CORRIGIDO' : 'CORRIGIDO'}:`);
        console.log(`   PT:     "${ptName}"`);
        console.log(`   ES ATU: "${currentEsName}"`);
        if (nameChanged) console.log(`   ES NOV: "${fixedName}"`);
        if (descChanged) console.log(`   (descrição também corrigida)`);
        if (shortDescChanged) console.log(`   (descrição curta também corrigida)`);
        console.log('');
        fixed++;
      } catch (error) {
        console.error(`❌ Erro ao atualizar ${product.productId}:`, error);
        errors++;
      }
    } else {
      unchanged++;
    }
  }

  // Agora corrigir variações de produtos
  console.log('\n🔧 Corrigindo variações de produtos...\n');

  const allVariations = await db
    .select({
      variationId: productVariations.id,
      ptName: productVariations.name,
      esName: productVariationI18n.name,
    })
    .from(productVariations)
    .innerJoin(
      productVariationI18n,
      and(
        eq(productVariations.id, productVariationI18n.variationId),
        eq(productVariationI18n.locale, 'es')
      )
    );

  let varFixed = 0;
  let varUnchanged = 0;

  for (const variation of allVariations) {
    const ptName = variation.ptName || '';
    const currentEsName = variation.esName || '';

    const fixedName = fixTranslation(ptName, currentEsName);

    if (fixedName !== currentEsName) {
      try {
        if (!isDryRun) {
          await db
            .update(productVariationI18n)
            .set({
              name: fixedName,
              slug: generateSlug(fixedName),
            })
            .where(
              and(
                eq(productVariationI18n.variationId, variation.variationId),
                eq(productVariationI18n.locale, 'es')
              )
            );
        }

        const prefix = isDryRun ? '🔍' : '✅';
        console.log(
          `${prefix} VARIAÇÃO ${isDryRun ? 'SERIA CORRIGIDA' : 'CORRIGIDA'}: "${currentEsName}" → "${fixedName}"`
        );
        varFixed++;
      } catch (error) {
        console.error(`❌ Erro variação ${variation.variationId}:`, error);
      }
    } else {
      varUnchanged++;
    }
  }

  console.log('\n\n📊 RESUMO:');
  console.log(`   Produtos corrigidos: ${fixed}`);
  console.log(`   Produtos sem alteração: ${unchanged}`);
  console.log(`   Variações corrigidas: ${varFixed}`);
  console.log(`   Variações sem alteração: ${varUnchanged}`);
  console.log(`   Erros: ${errors}`);
  console.log('\n✅ CONCLUÍDO!');

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
