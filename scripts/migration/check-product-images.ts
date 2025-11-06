import 'dotenv/config';
import { db } from '../../src/lib/db';
import { products } from '../../src/lib/db/schema';
import { sql, isNotNull } from 'drizzle-orm';

async function checkProductImages() {
  console.log('🖼️  Verificando imagens dos produtos...\n');

  // Produtos com imagem
  const withImages = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .where(isNotNull(products.wpImageUrl));

  // Produtos sem imagem
  const withoutImages = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(products);

  const totalWithImages = withImages[0]?.count || 0;
  const totalProducts = withoutImages[0]?.count || 0;
  const totalWithoutImages = totalProducts - totalWithImages;

  console.log(`📊 Total de produtos: ${totalProducts}`);
  console.log(`✅ Produtos COM imagem: ${totalWithImages}`);
  console.log(`❌ Produtos SEM imagem: ${totalWithoutImages}`);
  console.log(
    `📈 Percentual com imagem: ${((totalWithImages / totalProducts) * 100).toFixed(1)}%\n`
  );

  // Amostra de produtos COM imagem
  if (totalWithImages > 0) {
    console.log('📦 Amostra de produtos COM imagem:');
    const samplesWithImage = await db
      .select({
        name: products.name,
        wpImageUrl: products.wpImageUrl,
      })
      .from(products)
      .where(isNotNull(products.wpImageUrl))
      .limit(5);

    samplesWithImage.forEach((p, i) => {
      console.log(`   ${i + 1}. "${p.name}"`);
      console.log(`      Imagem: ${p.wpImageUrl}\n`);
    });
  }

  // Amostra de produtos SEM imagem
  if (totalWithoutImages > 0) {
    console.log('📦 Amostra de produtos SEM imagem:');
    const samplesWithoutImage = await db
      .select({
        name: products.name,
      })
      .from(products)
      .where(sql`${products.wpImageUrl} IS NULL`)
      .limit(5);

    samplesWithoutImage.forEach((p, i) => {
      console.log(`   ${i + 1}. "${p.name}"`);
    });
  }

  console.log('\n✅ Verificação concluída!');
}

checkProductImages().catch(console.error);
