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

export interface BreadcrumbItem {
  name: string;
  url: string;
}

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';

const defaultKeywords = [
  // Termos principais - Testemunhas de Jeová
  'Testemunhas de Jeová',
  'TJ',
  'JW',
  "Jehovah's Witnesses",
  'arquivos teocráticos',
  'arquivos digitais JW',
  'PDF para Testemunhas de Jeová',
  'materiais teocráticos digitais',
  'downloads JW',
  'arquivos para congregação',

  // Atividades teocráticas
  'organização de estudo bíblico',
  'estudo pessoal da Bíblia',
  'preparo para reuniões',
  'pregação de casa em casa',
  'serviço de campo',
  'ministério cristão',
  'vida cristã',
  'adoração em família',
  'estudo familiar',

  // Designações e privilégios
  'pioneiro auxiliar',
  'pioneiro regular',
  'escola de pioneiros',
  'anciãos',
  'servos ministeriais',
  'escola ministerial teocrática',
  'superintendente',
  'indicadores',
  'acomodadores',
  'microfone volante',
  'som e vídeo',
  'operador de vídeo',

  // Produtos específicos - Lembrancinhas
  'lembrancinha batismo',
  'lembrancinha pioneiro',
  'lembrancinha assembleia',
  'lembrancinha congresso',
  'lembrancinha visita superintendente',
  'lembrancinha inauguração salão',
  'lembrancinha anciãos',
  'lembrancinha servos ministeriais',
  'lembrancinha saída de campo',
  'lembrancinha novos batizados',
  'presente teocrático',
  'brinde congregação',

  // Materiais de organização
  'abas para bíblia',
  'calendário teocrático',
  'agenda teocrática',
  'planner JW',
  'organizador ministerial',
  'registro de pregação',
  'controle de horas',
  'cartões de pregação',
  'cartões para território',
  'mapa de território',

  // Papelaria e cartas
  'papéis de carta teocráticos',
  'papel timbrado JW',
  'envelopes decorados',
  'cartas personalizadas',
  'cartões de agradecimento',
  'convites teocrátcos',

  // Eventos e ocasiões
  'assembleia regional',
  'congresso',
  'visita superintendente',
  'inauguração salão do reino',
  'limpeza do salão',
  'churrasco congregação',
  'confraternização irmãos',
  'escola bíblica',

  // Idiomas e tradução
  'materiais português',
  'materiais espanhol',
  'materiais inglês',
  'PDFs multilíngue',
  'arquivos personalizáveis',
  'escreva sua mensagem',

  // Tipo de produto
  'PDF imprimível',
  'download imediato',
  'material digital',
  'arquivo editável',
  'impressão A4',
  'papel kraft',
  'papel colorido',

  // Marca e criadora
  'A Rafa Criou',
  'Rafaela Pereira',
  'loja teocrática online',
  'e-commerce JW',
  'materiais Rafa',

  // Long-tail keywords
  'onde comprar materiais teocráticos',
  'loja de PDFs para TJ',
  'arquivos digitais para Testemunhas de Jeová',
  'materiais para congregação download',
  'lembrancinhas personalizadas JW',
  'presente para pioneiro',
  'material para escola de pioneiros',
  'organização ministerial digital',
  'organização pessoal',
];

const defaultDescription =
  'A Rafa Criou: sua loja online de materiais teocráticos digitais para Testemunhas de Jeová. PDFs personalizados com download imediato! Lembrancinhas para batismo, assembleia, pioneiros, anciãos e todas as ocasiões especiais da congregação. Papéis de carta, cartões de pregação, abas para bíblia, calendários teocráticos, agendas ministeriais e muito mais. Materiais em português, espanhol e inglês. Presenteie com amor e organize seu ministério cristão com qualidade profissional!';

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
      creator: '@/arafacriou',
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
      sameAs: ['https://www.instagram.com/arafacriou/'],
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
      geographicArea: {
        '@type': 'Place',
        name: 'Brasil',
      },
    },
    inLanguage: ['pt-BR', 'es', 'en'],
    keywords:
      'materiais teocráticos, lembrancinhas JW, PDF Testemunhas de Jeová, arquivos digitais congregação',
  };
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
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

/**
 * Gera FAQ Schema para perguntas frequentes
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Gera ItemList Schema para listagens de produtos
 */
export function generateItemListSchema(items: { name: string; url: string; position: number }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: `${siteUrl}${item.url}`,
    })),
  };
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'A Rafa Criou',
    alternateName: 'A Rafa Criou - Materiais Teocráticos',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: defaultDescription,
    foundingDate: '2023-10',
    founder: {
      '@type': 'Person',
      name: 'Rafaela Pereira',
    },
    sameAs: ['https://www.instagram.com/arafacriou/'],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+55-11-998274504',
      contactType: 'Customer Service',
      email: 'arafacriou@gmail.com',
      areaServed: 'BR',
      availableLanguage: ['Portuguese', 'English', 'Spanish'],
      hoursAvailable: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
      ],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Guarulhos',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '500',
      bestRating: '5',
      worstRating: '1',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: '4.50',
      highPrice: '25.00',
      offerCount: '62',
    },
  };
}
