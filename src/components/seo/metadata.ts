import { Metadata } from 'next';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  product?: {
    price: string;
    currency: string;
    availability: 'instock' | 'outofstock' | 'preorder';
    brand?: string;
    category?: string;
  };
}

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';

const defaultKeywords = [
  'Testemunhas de Jeová',
  'TJ',
  'JW',
  "Jehovah's Witnesses",
  'arquivos teocráticos',
  'arquivos digitais JW',
  'PDF para Testemunhas de Jeová',
  'materiais teocráticos',
  'organização de estudo bíblico',
  'pioneiro auxiliar',
  'pioneiro regular',
  'abas para bíblia',
  'calendário teocrático',
  'estudo pessoal',
  'pregação',
  'ministério',
  'A Rafa Criou',
  'materiais para congregação',
  'vida cristã',
  'adoração em família',
  'serviço de campo',
  'PDF imprimível',
  'download imediato',
  'material digital',
  'organização pessoal',
];

const defaultDescription =
  'Descubra uma coleção de arquivos teocráticos digitais para ajudar você a dar seu melhor a Jeová! PDFs personalizados para Testemunhas de Jeová, incluindo abas para bíblia, calendários, cartões de pregação e muito mais.';

export function generateSEOMetadata(config: SEOConfig = {}): Metadata {
  const {
    title,
    description = defaultDescription,
    keywords = [],
    image = '/og-image.jpg',
    canonical,
    noindex = false,
    nofollow = false,
    type = 'website',
    author = 'Rafaela Pereira - A Rafa Criou',
  } = config;

  // Título completo
  const fullTitle = title
    ? `${title} | A Rafa Criou - Arquivos Teocráticos Digitais JW`
    : 'A Rafa Criou - Arquivos Teocráticos Digitais para Testemunhas de Jeová | JW | TJ';

  // Imagem Open Graph completa
  const ogImage = image.startsWith('http') ? image : `${siteUrl}${image}`;

  // Combinar keywords
  const allKeywords = [...new Set([...defaultKeywords, ...keywords])];

  return {
    title: fullTitle,
    description,
    keywords: allKeywords,
    authors: [{ name: author }],
    creator: author,
    publisher: 'A Rafa Criou',
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: canonical || siteUrl,
      languages: {
        'pt-BR': `${siteUrl}?lang=pt`,
        en: `${siteUrl}?lang=en`,
        es: `${siteUrl}?lang=es`,
      },
    },
    openGraph: {
      type: type as 'website' | 'article',
      title: fullTitle,
      description,
      url: canonical || siteUrl,
      siteName: 'A Rafa Criou',
      locale: 'pt_BR',
      alternateLocale: ['en_US', 'es_ES'],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title || 'A Rafa Criou - Arquivos Teocráticos Digitais',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@byrafaelapereirajw',
    },
    category: 'Materiais Teocráticos',
    other: {
      'theme-color': '#FED466',
      'msapplication-TileColor': '#FED466',
    },
  };
}

export function generateProductMetadata(
  productName: string,
  productDescription: string,
  price: string,
  currency: string,
  imageUrl: string,
  category?: string,
  keywords: string[] = []
): Metadata {
  const config: SEOConfig = {
    title: productName,
    description: productDescription,
    keywords: [...keywords, 'comprar', 'download', 'PDF'],
    image: imageUrl,
    type: 'product',
    product: {
      price,
      currency,
      availability: 'instock',
      brand: 'A Rafa Criou',
      category,
    },
  };

  return generateSEOMetadata(config);
}

export function generateCategoryMetadata(
  categoryName: string,
  categoryDescription: string,
  imageUrl?: string
): Metadata {
  return generateSEOMetadata({
    title: categoryName,
    description: categoryDescription,
    image: imageUrl,
    keywords: [categoryName, 'categoria', 'produtos'],
  });
}

// Schema.org JSON-LD generators
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'A Rafa Criou',
    description: defaultDescription,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/produtos?busca={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'A Rafa Criou',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
      sameAs: ['https://www.instagram.com/byrafaelapereirajw/'],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+55-11-998274504',
        contactType: 'Customer Service',
        email: 'arafacriou@gmail.com',
        areaServed: 'BR',
        availableLanguage: ['Portuguese', 'English', 'Spanish'],
      },
    },
  };
}

export function generateProductSchema(
  name: string,
  description: string,
  price: string,
  currency: string,
  image: string,
  url: string,
  brand: string = 'A Rafa Criou',
  category?: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url,
      seller: {
        '@type': 'Organization',
        name: 'A Rafa Criou',
      },
    },
    category,
    audience: {
      '@type': 'Audience',
      audienceType: 'Testemunhas de Jeová',
    },
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.url}`,
    })),
  };
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'A Rafa Criou',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: defaultDescription,
    sameAs: ['https://www.instagram.com/byrafaelapereirajw/'],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+55-11-998274504',
      contactType: 'Customer Service',
      email: 'arafacriou@gmail.com',
      areaServed: 'BR',
      availableLanguage: ['Portuguese', 'English', 'Spanish'],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Guarulhos',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
  };
}
