import 'dotenv/config';
import { db } from '../src/lib/db';
import { files, products } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function checkFilesTable() {
  console.log('🔍 Verificando tabela de arquivos (files)...\n');

  // 1. Contagem total de arquivos
  const totalFiles = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(files);

  console.log(`📊 Total de arquivos na tabela files: ${totalFiles[0]?.count || 0}`);

  // 2. Arquivos por produto
  const filesByProduct = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(files)
    .where(sql`${files.productId} IS NOT NULL`);

  console.log(`📊 Arquivos vinculados a produtos: ${filesByProduct[0]?.count || 0}`);

  // 3. Arquivos por variação
  const filesByVariation = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(files)
    .where(sql`${files.variationId} IS NOT NULL`);

  console.log(`📊 Arquivos vinculados a variações: ${filesByVariation[0]?.count || 0}`);

  // 4. Total de produtos
  const totalProducts = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(products);

  console.log(`📊 Total de produtos no banco: ${totalProducts[0]?.count || 0}`);

  // 5. Produtos SEM arquivo
  const productsWithoutFiles = await db.execute(sql`
    SELECT COUNT(DISTINCT p.id)::int as count
    FROM products p
    LEFT JOIN files f ON f.product_id = p.id
    WHERE f.id IS NULL
  `);

  const productsWithoutFilesCount = (productsWithoutFiles[0] as Record<string, unknown>)?.count || 0;
  console.log(`📊 Produtos SEM arquivo: ${productsWithoutFilesCount}`);

  // 6. Se houver arquivos, mostrar amostra
  if ((totalFiles[0]?.count || 0) > 0) {
    console.log('\n📦 Amostra de 5 arquivos:');
    const sampleFiles = await db
      .select({
        id: files.id,
        name: files.name,
        path: files.path,
        productId: files.productId,
        variationId: files.variationId,
      })
      .from(files)
      .limit(5);

    for (const file of sampleFiles) {
      console.log(`   - Nome: ${file.name}`);
      console.log(`     Path: ${file.path}`);
      console.log(`     Product ID: ${file.productId || 'NULL'}`);
      console.log(`     Variation ID: ${file.variationId || 'NULL'}`);
      console.log('');
    }
  } else {
    console.log('\n❌ PROBLEMA ENCONTRADO: Nenhum arquivo na tabela files!');
    console.log('   Sem arquivos, o botão de download não pode funcionar.');
    console.log('   É necessário importar os arquivos do WordPress ou fazer upload manual.');
  }

  console.log('\n✅ Verificação concluída!');
}

checkFilesTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
