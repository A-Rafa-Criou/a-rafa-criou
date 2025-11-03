'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type TranslatedProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: string;
  categoryId?: string;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TranslatedAttribute = {
  id: string;
  name: string;
  value: string;
};

/**
 * Hook para buscar produto traduzido
 */
export function useTranslatedProduct(productId: string | null) {
  const { i18n } = useTranslation();
  const [product, setProduct] = useState<TranslatedProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}?locale=${i18n.language}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data);
        }
      } catch (error) {
        console.error('Error fetching translated product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, i18n.language]);

  return { product, loading };
}

/**
 * Hook para traduzir atributos de produtos
 */
export function useTranslatedAttributes(
  attributes: Array<{ name: string; value: string }> | undefined
) {
  const { i18n } = useTranslation();
  const [translatedAttrs, setTranslatedAttrs] = useState<TranslatedAttribute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attributes || attributes.length === 0) {
      setTranslatedAttrs([]);
      return;
    }

    // Se for português, não precisa traduzir
    if (i18n.language === 'pt') {
      setTranslatedAttrs(
        attributes.map((attr, idx) => ({
          id: `${idx}`,
          name: attr.name,
          value: attr.value,
        }))
      );
      return;
    }

    const translateAttrs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/i18n/translate-attributes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributes,
            locale: i18n.language,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setTranslatedAttrs(data.attributes);
        } else {
          // Fallback para atributos originais
          setTranslatedAttrs(
            attributes.map((attr, idx) => ({
              id: `${idx}`,
              name: attr.name,
              value: attr.value,
            }))
          );
        }
      } catch (error) {
        console.error('Error translating attributes:', error);
        // Fallback
        setTranslatedAttrs(
          attributes.map((attr, idx) => ({
            id: `${idx}`,
            name: attr.name,
            value: attr.value,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    translateAttrs();
  }, [attributes, i18n.language]);

  return { attributes: translatedAttrs, loading };
}

/**
 * Hook para obter nome de produto traduzido do carrinho
 */
export function useCartItemTranslation(productId: string, productName: string) {
  const { i18n } = useTranslation();
  const [translatedName, setTranslatedName] = useState(productName);

  useEffect(() => {
    if (i18n.language === 'pt') {
      setTranslatedName(productName);
      return;
    }

    const fetchTranslation = async () => {
      try {
        const response = await fetch(
          `/api/i18n/product-name?id=${productId}&locale=${i18n.language}`
        );
        if (response.ok) {
          const data = await response.json();
          setTranslatedName(data.name || productName);
        }
      } catch (error) {
        console.error('Error fetching product translation:', error);
      }
    };

    fetchTranslation();
  }, [productId, productName, i18n.language]);

  return translatedName;
}
