import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../../src/lib/db';
import { products } from '../../src/lib/db/schema';
import { isNotNull, eq } from 'drizzle-orm';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrateImagesToCloudinary() {
  console.log('🎨 MIGRAÇÃO DE IMAGENS PARA CLOUDINARY\n');

  // Buscar produtos com imagem do WordPress
  const productsWithImages = await db
    .select()
    .from(products)
    .where(isNotNull(products.wpImageUrl));

  console.log(`📊 Total de produtos com imagem: ${productsWithImages.length}\n`);

  if (productsWithImages.length === 0) {
    console.log('⚠️  Nenhum produto com imagem encontrado.');
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < productsWithImages.length; i++) {
    const product = productsWithImages[i];
    const progress = `[${i + 1}/${productsWithImages.length}]`;

    try {
      // Verificar se já foi migrado para Cloudinary
      if (product.wpImageUrl.includes('cloudinary.com') || product.wpImageUrl.includes('res.cloudinary')) {
        console.log(`${progress} ⏭️  "${product.name}" - JÁ NO CLOUDINARY`);
        skipped++;
        continue;
      }

      console.log(`${progress} 📤 Migrando: "${product.name}"`);
      console.log(`         De: ${product.wpImageUrl.substring(0, 80)}...`);

      // Upload para Cloudinary
      const result = await cloudinary.uploader.upload(product.wpImageUrl, {
        folder: process.env.CLOUDINARY_FOLDER || 'products',
        public_id: `product-${product.wpProductId || product.id.substring(0, 8)}`,
        overwrite: false,
        resource_type: 'image',
        format: 'webp', // Converter para WebP
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:best' },
        ],
      });

      // Atualizar no banco com URL do Cloudinary
      await db
        .update(products)
        .set({ 
          wpImageUrl: result.secure_url,
        })
        .where(eq(products.id, product.id));

      console.log(`${progress} ✅ Migrado!`);
      console.log(`         Para: ${result.secure_url}\n`);
      
      uploaded++;

      // Delay pequeno para não sobrecarregar API
      if (i % 10 === 0 && i > 0) {
        console.log('⏸️  Pausando 2s para evitar rate limit...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`${progress} ❌ ERRO ao migrar "${product.name}": ${errorMessage}\n`);
      errors++;
      
      // Se erro de rate limit, pausar mais tempo
      if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
        console.log('⏸️  Rate limit detectado. Pausando 10s...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  console.log('\n📊 RESUMO DA MIGRAÇÃO:');
  console.log(`   ✅ Migrados: ${uploaded}`);
  console.log(`   ⏭️  Já estavam no Cloudinary: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log(`   📦 Total processado: ${productsWithImages.length}`);

  if (uploaded > 0) {
    console.log('\n✅ Migração concluída!');
    console.log('\n📸 As imagens agora estão no Cloudinary com:');
    console.log('   - Formato WebP (otimizado)');
    console.log('   - Tamanho máximo 1200x1200');
    console.log('   - Qualidade automática');
    console.log('   - CDN global');
    console.log('\n🔍 Verifique o resultado:');
    console.log('   npx tsx scripts/migration/check-product-images.ts');
  }
}

migrateImagesToCloudinary().catch(console.error);
