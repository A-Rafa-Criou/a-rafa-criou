'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type Product } from '@/hooks/use-products';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { AddToCartSheet } from '@/components/sections/AddToCartSheet';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PromotionalPrice, PriceRange } from '@/components/ui/promotional-price';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation('common');
  const [showAddToCart, setShowAddToCart] = useState(false);

  // Verifica se tem múltiplas variações com atributos
  const hasVariations = product.variations && product.variations.length > 1 &&
    product.variations.some(v => v.isActive && v.attributeValues && v.attributeValues.length > 0);

  // Calcular faixa de preços se houver múltiplas variações
  const hasPriceRange = product.variations && product.variations.length > 1;
  
  let priceDisplay;
  if (hasPriceRange) {
    const prices = product.variations!.map(v => v.price);
    const originalPrices = product.variations!.map(v => v.originalPrice || v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minOriginalPrice = Math.min(...originalPrices);
    const maxOriginalPrice = Math.max(...originalPrices);
    const hasAnyPromotion = product.variations!.some(v => v.hasPromotion);
    const firstPromotionName = product.variations!.find(v => v.hasPromotion)?.promotion?.name;

    priceDisplay = (
      <PriceRange
        minPrice={minPrice}
        maxPrice={maxPrice}
        minOriginalPrice={minOriginalPrice}
        maxOriginalPrice={maxOriginalPrice}
        hasPromotion={hasAnyPromotion}
        promotionName={firstPromotionName}
        size="md"
        showBadge={true}
      />
    );
  } else {
    priceDisplay = (
      <PromotionalPrice
        price={product.price}
        originalPrice={product.originalPrice}
        hasPromotion={product.hasPromotion}
        promotionName={product.variations?.[0]?.promotion?.name}
        discount={product.variations?.[0]?.discount}
        discountType={product.variations?.[0]?.promotion?.discountType}
        size="md"
        showBadge={true}
        showDiscountBadge={false}
      />
    );
  }

  return (
    <>
      <Card className='group h-full transition-all hover:shadow-lg'>
        <CardHeader className='pb-2'>
          {/* Imagem do produto */}
          {product.mainImage?.data && (
            <div className='relative aspect-square w-full overflow-hidden rounded-lg mb-2'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.mainImage.data}
                alt={product.mainImage.alt || product.name}
                className='w-full h-full object-cover transition-transform group-hover:scale-105'
              />

              {/* Botão de Favorito - SOBRE A IMAGEM, canto superior esquerdo */}
              <div className='absolute top-2 left-2 z-10'>
                <FavoriteButton
                  productId={product.id}
                  productSlug={product.slug}
                  productName={product.name}
                  productPrice={product.price}
                  productImage={product.mainImage?.data || '/file.svg'}
                  size="md"
                />
              </div>
            </div>
          )}

          {product.isFeatured && (
            <Badge className='mb-2 w-fit bg-secondary text-secondary-foreground text-xs'>
              {t('product.featured', 'Destaque')}
            </Badge>
          )}
          <CardTitle className='line-clamp-2 text-base sm:text-lg group-hover:text-primary'>
            {t(`productNames.${product.slug}`, product.name)}
          </CardTitle>
          {product.shortDescription && (
            <CardDescription className='line-clamp-2 text-sm'>
              {product.shortDescription}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className='flex flex-col justify-between gap-2 pt-0'>
          <div className='mb-1'>
            {priceDisplay}
          </div>

          <div className='flex gap-2'>
            {hasVariations ? (
              <Button
                onClick={() => setShowAddToCart(true)}
                className='w-full bg-primary hover:bg-secondary text-sm h-10'
              >
                {t('product.addToCart', 'Adicionar ao Carrinho')}
              </Button>
            ) : (
              <Button asChild className='w-full bg-primary hover:bg-secondary text-sm h-10'>
                <Link href={`/produtos/${product.slug}`}>
                  {t('product.viewDetails', 'Ver detalhes')}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AddToCartSheet
        open={showAddToCart}
        onOpenChange={setShowAddToCart}
        product={product}
      />
    </>
  );
}