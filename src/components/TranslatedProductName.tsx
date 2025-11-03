'use client';

import { useCartItemTranslation } from '@/hooks/use-i18n-product';

type TranslatedProductNameProps = {
    productId: string;
    productName: string;
    className?: string;
};

export function TranslatedProductName({
    productId,
    productName,
    className = '',
}: TranslatedProductNameProps) {
    const translatedName = useCartItemTranslation(productId, productName);

    return <span className={className}>{translatedName}</span>;
}
