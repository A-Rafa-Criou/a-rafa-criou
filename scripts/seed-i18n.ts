/**
 * Script para popular as tabelas i18n com dados existentes (locale 'pt')
 * Copia name, slug, description, etc. das tabelas principais para product_i18n, category_i18n
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Carrega .env.local manualmente
config({ path: resolve(process.cwd(), '.env.local') })

import { db } from '@/lib/db'
import { products, categories, productVariations, productI18n, categoryI18n, productVariationI18n } from '@/lib/db/schema'

async function seedI18n() {
  console.log('🌍 Iniciando seed de tabelas i18n...')

  try {
    // 1. Seed category_i18n com dados de categories (locale 'pt')
    console.log('📦 Migrando categorias para category_i18n (pt)...')
    const categoriesData = await db.select().from(categories)
    
    for (const category of categoriesData) {
      await db.insert(categoryI18n).values({
        categoryId: category.id,
        locale: 'pt',
        name: category.name,
        description: category.description || '',
        slug: category.slug,
        seoTitle: null,
        seoDescription: null,
      }).onConflictDoNothing()
    }
    console.log(`✅ ${categoriesData.length} categorias migradas para pt`)

    // 2. Seed product_i18n com dados de products (locale 'pt')
    console.log('📦 Migrando produtos para product_i18n (pt)...')
    const productsData = await db.select().from(products)
    
    for (const product of productsData) {
      await db.insert(productI18n).values({
        productId: product.id,
        locale: 'pt',
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        seoTitle: product.seoTitle || null,
        seoDescription: product.seoDescription || null,
      }).onConflictDoNothing()
    }
    console.log(`✅ ${productsData.length} produtos migrados para pt`)

    // 3. Seed product_variation_i18n com dados de productVariations (locale 'pt')
    console.log('📦 Migrando variações para product_variation_i18n (pt)...')
    const variationsData = await db.select().from(productVariations)
    
    for (const variation of variationsData) {
      await db.insert(productVariationI18n).values({
        variationId: variation.id,
        locale: 'pt',
        name: variation.name,
        slug: variation.slug,
      }).onConflictDoNothing()
    }
    console.log(`✅ ${variationsData.length} variações migradas para pt`)

    console.log('✅ Seed de i18n concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao fazer seed de i18n:', error)
    process.exit(1)
  }
}

seedI18n()
  .then(() => {
    console.log('🎉 Processo concluído!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Erro fatal:', err)
    process.exit(1)
  })
