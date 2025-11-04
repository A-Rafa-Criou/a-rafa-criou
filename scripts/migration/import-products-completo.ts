/**
 * Script de Importação COMPLETA de Produtos do WordPress
 * 
 * Importa produtos com imagens, categorias, preços e descrições completas
 * 
 * Uso:
 *   npx tsx scripts/migration/import-products-completo.ts
 */

import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

interface WordPressProduct {
  product_id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  created_at: string;
  price: string;
  sale_price?: string;
  sku?: string;
  stock_status?: string;
  categories?: string; // Pipe-separated: "Cat1|Cat2|Cat3"
  image_url?: string;
  image_id?: string;
  product_type?: string;
  visibility?: string;
  is_featured?: string; // "yes" ou "no"
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanHtmlDescription(html: string | undefined): string | null {
  if (!html) return null;
  
  let text = html;
  
  // Remover tags <pre> primeiro
  text = text.replace(/<\/?pre[^>]*>/gi, '');
  
  // PASSO 1: Decodificar entidades HTML ANTES de remover emojis (crítico!)
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // NOVO: Decodifica &#x2705; (hex) e &#9989; (decimal) → emojis Unicode
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  
  // PASSO 2: AGORA remover emojis Unicode (após decodificação)
  text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // Emojis gerais
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, ''); // Símbolos diversos
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
  text = text.replace(/[\u{2300}-\u{23FF}]/gu, ''); // Símbolos técnicos
  text = text.replace(/[\u{2B50}]/gu, ''); // Estrela
  text = text.replace(/[\u{2705}\u{274C}\u{2714}\u{2716}\u{2757}\u{2755}]/gu, ''); // Check marks
  
  // Remover tags HTML mas preservar quebras de linha
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  
  // Limpar espaços múltiplos e linhas vazias
  text = text
    .replace(/[ \t]+/g, ' ') // Múltiplos espaços viram um
    .replace(/\n{3,}/g, '\n\n') // Múltiplas linhas vazias viram duas
    .trim();
  
  return text || null;
}

async function importProducts(csvPath: string = 'data/test/test-produtos-completo.csv') {
  console.log('🚀 Iniciando importação COMPLETA de produtos...\n');
  console.log(`📂 Arquivo: ${csvPath}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo não encontrado: ${csvPath}`);
    console.log('\n💡 Dica: Execute a query export-produtos-completo.sql no Adminer!');
    console.log('   Arquivo: scripts/migration/export-produtos-completo.sql\n');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Remover BOM se presente (Byte Order Mark = U+FEFF)
  const csvWithoutBOM = csvContent.charCodeAt(0) === 0xFEFF 
    ? csvContent.substring(1) 
    : csvContent;
  
  const records: WordPressProduct[] = parse(csvWithoutBOM, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Também ativa detecção automática de BOM
  });

  console.log(`📊 Total de produtos no CSV: ${records.length}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  const errorList: { name: string; error: string }[] = [];
  
  // Cache de categorias para não buscar repetidamente
  const categoryCache = new Map<string, string>();

  for (const [index, wpProduct] of records.entries()) {
    try {
      if (!wpProduct.name) {
        console.log(`⏭️  [${index + 1}/${records.length}] Nome vazio - pulando`);
        skipped++;
        continue;
      }

      // Processar categorias
      let categoryId: string | null = null;
      
      if (wpProduct.categories) {
        const categoryNames = wpProduct.categories.split('|').map(c => c.trim()).filter(Boolean);
        
        if (categoryNames.length > 0) {
          // Usar primeira categoria
          const firstCategory = categoryNames[0];
          
          // Verificar cache
          if (categoryCache.has(firstCategory)) {
            categoryId = categoryCache.get(firstCategory)!;
          } else {
            // Buscar ou criar categoria
            const catSlug = generateSlug(firstCategory);
            
            const existingCat = await db
              .select()
              .from(categories)
              .where(eq(categories.slug, catSlug))
              .limit(1);
            
            if (existingCat.length === 0) {
              console.log(`   📁 Criando categoria: ${firstCategory}`);
              const [newCat] = await db.insert(categories).values({
                id: crypto.randomUUID(),
                name: firstCategory,
                slug: catSlug,
                description: `Categoria importada do WordPress`,
                sortOrder: 0,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }).returning();
              categoryId = newCat.id;
            } else {
              categoryId = existingCat[0].id;
            }
            
            categoryCache.set(firstCategory, categoryId);
          }
        }
      }
      
      // Se não tem categoria, usar/criar "Geral"
      if (!categoryId) {
        if (!categoryCache.has('Geral')) {
          const defaultCat = await db
            .select()
            .from(categories)
            .where(eq(categories.slug, 'geral'))
            .limit(1);
          
          if (defaultCat.length === 0) {
            const [newCat] = await db.insert(categories).values({
              id: crypto.randomUUID(),
              name: 'Geral',
              slug: 'geral',
              description: 'Categoria padrão para produtos',
              sortOrder: 0,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).returning();
            categoryId = newCat.id;
          } else {
            categoryId = defaultCat[0].id;
          }
          
          categoryCache.set('Geral', categoryId);
        } else {
          categoryId = categoryCache.get('Geral')!;
        }
      }

      // Gerar slug único
      let slug = wpProduct.slug || generateSlug(wpProduct.name);
      
      const existingBySlug = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (existingBySlug.length > 0) {
        slug = `${slug}-${wpProduct.product_id}`;
      }

      // Calcular preço
      const finalPrice = wpProduct.sale_price && parseFloat(wpProduct.sale_price) > 0
        ? wpProduct.sale_price
        : wpProduct.price || '0';

      // Limpar descrições HTML
      const cleanDescription = cleanHtmlDescription(wpProduct.description);
      const cleanShortDescription = cleanHtmlDescription(wpProduct.short_description);

      // Parse wpProductId
      const wpProductIdNum = parseInt(wpProduct.product_id);
      if (isNaN(wpProductIdNum)) {
        console.warn(`⚠️  wpProductId inválido para "${wpProduct.name}": "${wpProduct.product_id}"`);
      }

      // Inserir produto
      await db.insert(products).values({
        id: crypto.randomUUID(),
        name: wpProduct.name.trim(),
        slug,
        description: cleanDescription,
        shortDescription: cleanShortDescription,
        price: finalPrice,
        categoryId: categoryId,
        isActive: wpProduct.stock_status !== 'outofstock',
        isFeatured: wpProduct.is_featured === 'yes',
        wpProductId: wpProductIdNum,
        wpImageUrl: wpProduct.image_url?.trim() || null,
        createdAt: wpProduct.created_at ? new Date(wpProduct.created_at) : new Date(),
        updatedAt: new Date(),
      });

      const categoryName = Array.from(categoryCache.entries())
        .find(([, id]) => id === categoryId)?.[0] || 'Geral';
      
      const priceDisplay = parseFloat(finalPrice).toFixed(2);
      const hasImage = wpProduct.image_url ? '🖼️ ' : '';
      
      console.log(`✅ [${index + 1}/${records.length}] ${hasImage}${wpProduct.name} → R$ ${priceDisplay} (${categoryName})`);
      success++;
      
    } catch (error) {
      const err = error as Error;
      console.error(`❌ [${index + 1}/${records.length}] Erro: ${wpProduct.name}`);
      console.error(`   Detalhes: ${err.message}`);
      console.error(`   Stack: ${err.stack?.split('\n').slice(0, 3).join('\n')}`);
      errors++;
      errorList.push({
        name: wpProduct.name,
        error: err.message,
      });
    }
  }

  // Relatório
  console.log('\n' + '='.repeat(70));
  console.log('📈 RELATÓRIO DE IMPORTAÇÃO COMPLETA');
  console.log('='.repeat(70));
  console.log(`Total no CSV:          ${records.length}`);
  console.log(`✅ Importados:         ${success} (${Math.round((success / records.length) * 100)}%)`);
  console.log(`⏭️  Pulados:            ${skipped} (${Math.round((skipped / records.length) * 100)}%)`);
  console.log(`❌ Erros:              ${errors} (${Math.round((errors / records.length) * 100)}%)`);
  console.log(`📁 Categorias criadas: ${categoryCache.size}`);
  console.log('='.repeat(70));

  if (categoryCache.size > 0) {
    console.log('\n📁 CATEGORIAS IMPORTADAS:');
    Array.from(categoryCache.keys()).forEach(cat => {
      console.log(`   • ${cat}`);
    });
  }

  if (errorList.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:');
    errorList.slice(0, 10).forEach(({ name, error }) => {
      console.log(`   • ${name}: ${error}`);
    });
    if (errorList.length > 10) {
      console.log(`   ... e mais ${errorList.length - 10} erros`);
    }
  }

  if (success > 0) {
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar produtos: npm run db:studio');
    console.log('   2. Baixar imagens: npx tsx scripts/migration/download-images.ts');
    console.log('   3. Importar variações: npx tsx scripts/migration/import-variations.ts');
  }

  console.log('\n✨ Importação completa concluída!\n');
}

const csvPath = process.argv[2] || 'data/test/test-produtos-completo.csv';
importProducts(csvPath).catch(console.error);
