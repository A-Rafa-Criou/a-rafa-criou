import { db } from '../src/lib/db';
import { products, productVariations, productImages } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function investigate() {
  // Buscar produto
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, 'lembrancinha-televisao-broadcasting'));

  if (!product) {
    console.log('❌ Produto não encontrado');
    return;
  }

  console.log('📦 PRODUTO:', product.name);
  console.log('ID:', product.id);
  console.log('\n');

  // Buscar variações
  const variations = await db
    .select()
    .from(productVariations)
    .where(eq(productVariations.productId, product.id));

  console.log('🔹 VARIAÇÕES:', variations.length);

  for (const variation of variations) {
    console.log('\n' + '='.repeat(80));
    console.log('Variação:', variation.name);
    console.log('ID:', variation.id);

    // Buscar imagens desta variação
    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.variationId, variation.id));

    console.log('Imagens:', images.length);

    for (const img of images) {
      console.log('\n  📷', img.alt || 'Sem nome');
      console.log('     URL:', img.url);
      console.log('     Cloudinary ID:', img.cloudinaryId);
      console.log('     isMain:', img.isMain);
      console.log('     sortOrder:', img.sortOrder);

      // Testar URL
      try {
        const response = await fetch(img.url, { method: 'HEAD' });
        console.log('     Status:', response.status, response.ok ? '✅' : '❌');
        console.log('     Content-Type:', response.headers.get('content-type'));
      } catch (error: any) {
        console.log('     Status: ERRO ❌', error.message);
      }
    }
  }
}

investigate().catch(console.error);
