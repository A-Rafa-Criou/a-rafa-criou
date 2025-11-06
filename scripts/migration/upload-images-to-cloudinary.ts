import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../../src/lib/db';
import { products } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CSV_PATH = 'C:\\Users\\eddua\\a-rafa-criou\\data\\migration\\product-images.csv';

interface ProductImageRow {
  product_id: string;
  product_name: string;
  post_type: string;
  parent_product_id: string;
  image_url: string;
  gallery_ids: string;
}

async function uploadImagesToCloudinary() {
  console.log('🎨 MIGRAÇÃO DE IMAGENS PARA CLOUDINARY\n');

  // 1. Ler CSV de imagens do WordPress
  console.log('📄 Lendo CSV de imagens...\n');

  let csvContent: string;
  try {
    csvContent = readFileSync(CSV_PATH, 'utf-8');
  } catch (error) {
    console.error(`❌ Arquivo CSV não encontrado: ${CSV_PATH}`);
    console.log('\n⚠️  ANTES DE CONTINUAR:');
    console.log('1. Execute a query: scripts/migration/export-product-images.sql');
    console.log('2. Exporte o resultado como CSV');
    console.log('3. Salve em: data/migration/product-images.csv');
    console.log('4. Execute este script novamente');
    return;
  }

  // Remover BOM se existir
  if (csvContent.charCodeAt(0) === 0xfeff) {
    csvContent = csvContent.substring(1);
  }

  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as ProductImageRow[];

  console.log(`📊 Total de registros no CSV: ${rows.length}\n`);

  // 2. Filtrar apenas produtos com imagem
  const rowsWithImages = rows.filter(row => row.image_url && row.image_url.trim() !== '');

  console.log(`🖼️  Produtos com imagem: ${rowsWithImages.length}`);
  console.log(`⚠️  Produtos sem imagem: ${rows.length - rowsWithImages.length}\n`);

  if (rowsWithImages.length === 0) {
    console.log('⚠️  Nenhuma imagem para processar.');
    return;
  }

  // 3. Upload para Cloudinary
  console.log('☁️  Iniciando upload para Cloudinary...\n');

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;
  let updated = 0;

  for (let i = 0; i < rowsWithImages.length; i++) {
    const row = rowsWithImages[i];
    const progress = `[${i + 1}/${rowsWithImages.length}]`;
    const wpProductId = parseInt(row.product_id);

    try {
      // Buscar produto no banco
      const product = await db
        .select()
        .from(products)
        .where(eq(products.wpProductId, wpProductId))
        .limit(1);

      if (product.length === 0) {
        console.log(`${progress} ⏭️  WP #${wpProductId} - Produto não encontrado no banco`);
        skipped++;
        continue;
      }

      const dbProduct = product[0];

      // Verificar se já foi migrado
      if (dbProduct.wpImageUrl && dbProduct.wpImageUrl.includes('cloudinary')) {
        console.log(`${progress} ⏭️  "${dbProduct.name}" - JÁ MIGRADO`);
        skipped++;
        continue;
      }

      // Upload para Cloudinary
      console.log(`${progress} 📤 Uploading "${dbProduct.name}"...`);

      const result = await cloudinary.uploader.upload(row.image_url, {
        folder: 'products',
        public_id: `product-${wpProductId}`,
        overwrite: false,
        resource_type: 'image',
        format: 'webp', // Converter para WebP automaticamente
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamanho máximo
          { quality: 'auto:best' }, // Otimização automática
        ],
      });

      // Atualizar no banco
      await db
        .update(products)
        .set({
          wpImageUrl: result.secure_url,
        })
        .where(eq(products.id, dbProduct.id));

      console.log(`${progress} ✅ "${dbProduct.name}"`);
      console.log(`         → ${result.secure_url}\n`);

      uploaded++;
      updated++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`${progress} ❌ WP #${wpProductId} - ERRO: ${errorMessage}\n`);
      errors++;
    }
  }

  console.log('\n📊 Resumo do Upload:');
  console.log(`   ✅ Enviados: ${uploaded}`);
  console.log(`   🔄 Atualizados no banco: ${updated}`);
  console.log(`   ⏭️  Pulados: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);

  console.log('\n✅ Migração de imagens concluída!');
  console.log('\n📸 As imagens agora estão no Cloudinary com:');
  console.log('   - Formato WebP (otimizado)');
  console.log('   - Tamanho máximo 1200x1200');
  console.log('   - Qualidade automática');
  console.log('   - URLs no campo wpImageUrl');
}

uploadImagesToCloudinary().catch(console.error);
