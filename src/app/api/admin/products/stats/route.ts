import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, productVariations } from '@/lib/db/schema';

export async function GET() {
  try {
    // Buscar todos os produtos para calcular estatísticas
    const allProducts = await db.select().from(products);

    // Buscar todas as variações para calcular preços reais
    const allVariations = await db.select().from(productVariations);

    // Criar um mapa de variações por produto
    const variationsByProduct = new Map<string, typeof allVariations>();
    allVariations.forEach(v => {
      if (!variationsByProduct.has(v.productId)) {
        variationsByProduct.set(v.productId, []);
      }
      variationsByProduct.get(v.productId)?.push(v);
    });

    // Calcular preço real de cada produto (considerando variações)
    let totalRevenue = 0;
    let productCount = 0; // Contador apenas de produtos válidos (acima de R$ 0,50)

    allProducts.forEach(p => {
      const variations = variationsByProduct.get(p.id) || [];
      let productPrice = 0;

      if (variations.length > 0) {
        // Se tem variações, usar o menor preço das variações ativas
        const activeVariations = variations.filter(v => v.isActive);
        if (activeVariations.length > 0) {
          productPrice = Math.min(...activeVariations.map(v => parseFloat(v.price || '0')));
        } else {
          // Se não tem variações ativas, usar o menor preço de todas
          productPrice = Math.min(...variations.map(v => parseFloat(v.price || '0')));
        }
      } else {
        // Se não tem variações, usar o preço do produto
        productPrice = parseFloat(p.price || '0');
      }

      // Apenas contar produtos com preço acima de R$ 0,50 (excluir produtos de teste)
      if (productPrice > 0.5) {
        totalRevenue += productPrice;
        productCount++;
      }
    });

    const stats = {
      total: allProducts.length,
      active: allProducts.filter(p => p.isActive === true).length,
      inactive: allProducts.filter(p => p.isActive === false).length,
      revenue: totalRevenue,
      productCount, // Quantidade de produtos válidos para cálculo de média
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
