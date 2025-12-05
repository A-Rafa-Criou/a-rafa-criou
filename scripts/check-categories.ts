import { db } from '../src/lib/db';
import { categories, products } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkCategories() {
  console.log('=== VERIFICANDO CATEGORIAS E PRODUTOS ===\n');

  // Buscar todas as categorias
  const allCategories = await db.select().from(categories).orderBy(categories.name);

  console.log('📁 CATEGORIAS:');
  for (const cat of allCategories) {
    console.log(`  ${cat.parentId ? '  ↳' : '📂'} ${cat.name} (slug: ${cat.slug})`);
    console.log(`     ID: ${cat.id}`);
    console.log(`     Parent ID: ${cat.parentId || 'null (categoria pai)'}`);

    // Contar produtos desta categoria
    const productsCount = await db.select().from(products).where(eq(products.categoryId, cat.id));

    console.log(`     Produtos: ${productsCount.length}`);
    if (productsCount.length > 0) {
      console.log(`     Produtos: ${productsCount.map(p => p.name).join(', ')}`);
    }
    console.log('');
  }

  // Testar filtro de subcategoria específica
  console.log('\n=== TESTANDO FILTRO DE SUBCATEGORIA "VTM" ===');
  const vtmCategory = await db.select().from(categories).where(eq(categories.slug, 'vtm')).limit(1);

  if (vtmCategory.length > 0) {
    console.log(`Categoria encontrada: ${vtmCategory[0].name}`);
    console.log(`ID: ${vtmCategory[0].id}`);
    console.log(`Parent ID: ${vtmCategory[0].parentId}`);
    console.log(`É subcategoria: ${vtmCategory[0].parentId !== null}`);

    const vtmProducts = await db
      .select()
      .from(products)
      .where(eq(products.categoryId, vtmCategory[0].id));

    console.log(`\nProdutos com categoryId = ${vtmCategory[0].id}:`);
    console.log(`Total: ${vtmProducts.length}`);
    vtmProducts.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id}, categoryId: ${p.categoryId})`);
    });
  } else {
    console.log('❌ Categoria VTM não encontrada');
  }

  process.exit(0);
}

checkCategories().catch(console.error);
