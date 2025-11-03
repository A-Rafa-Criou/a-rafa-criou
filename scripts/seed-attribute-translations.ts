/**
 * Script para popular traduções de atributos comuns
 * Execute com: npx tsx scripts/seed-attribute-translations.ts
 */

import { db } from '../src/lib/db';
import {
  attributes,
  attributeI18n,
  attributeValues,
  attributeValueI18n,
} from '../src/lib/db/schema';

const ATTRIBUTE_TRANSLATIONS = {
  Tamanho: {
    en: 'Size',
    es: 'Tamaño',
  },
  Cor: {
    en: 'Color',
    es: 'Color',
  },
  Tipo: {
    en: 'Type',
    es: 'Tipo',
  },
  Material: {
    en: 'Material',
    es: 'Material',
  },
  Formato: {
    en: 'Format',
    es: 'Formato',
  },
};

const VALUE_TRANSLATIONS: Record<string, { en: string; es: string }> = {
  // Tamanhos
  Pequeno: { en: 'Small', es: 'Pequeño' },
  Médio: { en: 'Medium', es: 'Mediano' },
  Grande: { en: 'Large', es: 'Grande' },
  
  // Cores
  Azul: { en: 'Blue', es: 'Azul' },
  Vermelho: { en: 'Red', es: 'Rojo' },
  Verde: { en: 'Green', es: 'Verde' },
  Amarelo: { en: 'Yellow', es: 'Amarillo' },
  Preto: { en: 'Black', es: 'Negro' },
  Branco: { en: 'White', es: 'Blanco' },
  
  // Formatos
  Digital: { en: 'Digital', es: 'Digital' },
  Impresso: { en: 'Printed', es: 'Impreso' },
  PDF: { en: 'PDF', es: 'PDF' },
};

async function slugify(text: string): Promise<string> {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function seedAttributeTranslations() {
  console.log('🌍 Iniciando seed de traduções de atributos...\n');

  try {
    // 1. Buscar todos os atributos existentes
    const existingAttributes = await db.select().from(attributes);
    console.log(`✅ Encontrados ${existingAttributes.length} atributos\n`);

    // 2. Inserir traduções de atributos
    for (const attr of existingAttributes) {
      const translations = ATTRIBUTE_TRANSLATIONS[attr.name as keyof typeof ATTRIBUTE_TRANSLATIONS];
      
      if (translations) {
        console.log(`📝 Traduzindo atributo: ${attr.name}`);
        
        // Inglês
        const enSlug = await slugify(translations.en);
        await db
          .insert(attributeI18n)
          .values({
            attributeId: attr.id,
            locale: 'en',
            name: translations.en,
            slug: enSlug,
          })
          .onConflictDoUpdate({
            target: [attributeI18n.attributeId, attributeI18n.locale],
            set: {
              name: translations.en,
              slug: enSlug,
              updatedAt: new Date(),
            },
          });
        console.log(`  ✓ EN: ${translations.en}`);

        // Espanhol
        const esSlug = await slugify(translations.es);
        await db
          .insert(attributeI18n)
          .values({
            attributeId: attr.id,
            locale: 'es',
            name: translations.es,
            slug: esSlug,
          })
          .onConflictDoUpdate({
            target: [attributeI18n.attributeId, attributeI18n.locale],
            set: {
              name: translations.es,
              slug: esSlug,
              updatedAt: new Date(),
            },
          });
        console.log(`  ✓ ES: ${translations.es}\n`);
      }
    }

    // 3. Buscar todos os valores de atributos existentes
    const existingValues = await db.select().from(attributeValues);
    console.log(`✅ Encontrados ${existingValues.length} valores de atributos\n`);

    // 4. Inserir traduções de valores
    for (const value of existingValues) {
      const translations = VALUE_TRANSLATIONS[value.value];
      
      if (translations) {
        console.log(`📝 Traduzindo valor: ${value.value}`);
        
        // Inglês
        const enSlug = await slugify(translations.en);
        await db
          .insert(attributeValueI18n)
          .values({
            valueId: value.id,
            locale: 'en',
            value: translations.en,
            slug: enSlug,
          })
          .onConflictDoUpdate({
            target: [attributeValueI18n.valueId, attributeValueI18n.locale],
            set: {
              value: translations.en,
              slug: enSlug,
              updatedAt: new Date(),
            },
          });
        console.log(`  ✓ EN: ${translations.en}`);

        // Espanhol
        const esSlug = await slugify(translations.es);
        await db
          .insert(attributeValueI18n)
          .values({
            valueId: value.id,
            locale: 'es',
            value: translations.es,
            slug: esSlug,
          })
          .onConflictDoUpdate({
            target: [attributeValueI18n.valueId, attributeValueI18n.locale],
            set: {
              value: translations.es,
              slug: esSlug,
              updatedAt: new Date(),
            },
          });
        console.log(`  ✓ ES: ${translations.es}\n`);
      }
    }

    console.log('✨ Seed de traduções concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
    process.exit(1);
  }
}

seedAttributeTranslations();
