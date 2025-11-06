import 'dotenv/config';
import { db } from '../../src/lib/db';
import { products } from '../../src/lib/db/schema';
import { isNotNull, like, and, not } from 'drizzle-orm';

async function verifyMigration() {
  console.log('🔍 VERIFICAÇÃO DE MIGRAÇÃO CLOUDINARY\n');

  // Total de produtos com imagem
  const allWithImages = await db.select().from(products).where(isNotNull(products.wpImageUrl));

  // Produtos já no Cloudinary
  const cloudinaryProducts = await db
    .select()
    .from(products)
    .where(and(isNotNull(products.wpImageUrl), like(products.wpImageUrl, '%cloudinary%')));

  // Produtos ainda no WordPress
  const wordpressProducts = await db
    .select()
    .from(products)
    .where(and(isNotNull(products.wpImageUrl), not(like(products.wpImageUrl, '%cloudinary%'))));

  console.log('📊 ESTATÍSTICAS:');
  console.log(`   📸 Total com imagem: ${allWithImages.length}`);
  console.log(`   ✅ No Cloudinary: ${cloudinaryProducts.length}`);
  console.log(`   ⚠️  Ainda no WordPress: ${wordpressProducts.length}`);
  console.log(
    `   📈 Taxa de migração: ${((cloudinaryProducts.length / allWithImages.length) * 100).toFixed(1)}%\n`
  );

  if (cloudinaryProducts.length > 0) {
    console.log('✅ AMOSTRA - Produtos NO CLOUDINARY:');
    cloudinaryProducts.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. "${p.name}"`);
      console.log(`      ${p.wpImageUrl}\n`);
    });
  }

  if (wordpressProducts.length > 0) {
    console.log('⚠️  AMOSTRA - Produtos AINDA NO WORDPRESS:');
    wordpressProducts.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. "${p.name}"`);
      console.log(`      ${p.wpImageUrl}\n`);
    });

    console.log('\n💡 SOLUÇÃO:');
    console.log('   Execute novamente a migração:');
    console.log('   npx tsx scripts/migration/migrate-images-direct.ts');
  } else {
    console.log('🎉 PERFEITO! Todos os produtos foram migrados para o Cloudinary!');
  }
}

verifyMigration().catch(console.error);
