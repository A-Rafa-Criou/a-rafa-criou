import Head from 'next/head';
import { useRouter } from 'next/router';

export interface SEOProps {
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
    jsonLd?: Record<string, unknown>;
}

const defaultKeywords = [
    'Testemunhas de Jeová',
    'TJ',
    'JW',
    'Jehovah\'s Witnesses',
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
];

export function SEO({
    title,
    description = 'Descubra uma coleção de arquivos teocráticos digitais para ajudar você a dar seu melhor a Jeová! PDFs personalizados para Testemunhas de Jeová, incluindo abas para bíblia, calendários, cartões de pregação e muito mais.',
    keywords = [],
    image = '/og-image.jpg',
    canonical,
    noindex = false,
    nofollow = false,
    type = 'website',
    author = 'Rafaela Pereira - A Rafa Criou',
    publishedTime,
    modifiedTime,
    product,
    jsonLd,
}: SEOProps) {
    const router = useRouter();
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';

    // Construir título completo
    const fullTitle = title
        ? `${title} | A Rafa Criou - Arquivos Teocráticos Digitais JW`
        : 'A Rafa Criou - Arquivos Teocráticos Digitais para Testemunhas de Jeová | JW | TJ';

    // URL canônica
    const canonicalUrl = canonical || `${siteUrl}${router.asPath}`;

    // Imagem Open Graph completa
    const ogImage = image.startsWith('http') ? image : `${siteUrl}${image}`;

    // Combinar keywords padrão com as fornecidas
    const allKeywords = [...new Set([...defaultKeywords, ...keywords])];

    // Schema.org padrão
    const defaultJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'A Rafa Criou',
        description,
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
            sameAs: [
                'https://www.instagram.com/arafacriou',
            ],
        },
    };

    // Schema.org para produtos
    const productJsonLd = product ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: title,
        description,
        image: ogImage,
        brand: {
            '@type': 'Brand',
            name: product.brand || 'A Rafa Criou',
        },
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: product.currency,
            availability: `https://schema.org/${product.availability === 'instock' ? 'InStock' : 'OutOfStock'}`,
            url: canonicalUrl,
            seller: {
                '@type': 'Organization',
                name: 'A Rafa Criou',
            },
        },
        category: product.category,
        audience: {
            '@type': 'Audience',
            audienceType: 'Testemunhas de Jeová',
        },
    } : null;

    const finalJsonLd = jsonLd || productJsonLd || defaultJsonLd;

    return (
        <Head>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={allKeywords.join(', ')} />
            <meta name="author" content={author} />

            {/* Robots */}
            <meta
                name="robots"
                content={`${noindex ? 'noindex' : 'index'}, ${nofollow ? 'nofollow' : 'follow'}`}
            />

            {/* Canonical */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:site_name" content="A Rafa Criou" />
            <meta property="og:locale" content="pt_BR" />
            <meta property="og:locale:alternate" content="en_US" />
            <meta property="og:locale:alternate" content="es_ES" />

            {/* Open Graph - Article/Product specific */}
            {type === 'article' && publishedTime && (
                <meta property="article:published_time" content={publishedTime} />
            )}
            {type === 'article' && modifiedTime && (
                <meta property="article:modified_time" content={modifiedTime} />
            )}
            {type === 'article' && (
                <meta property="article:author" content={author} />
            )}
            {type === 'product' && product && (
                <>
                    <meta property="product:price:amount" content={product.price} />
                    <meta property="product:price:currency" content={product.currency} />
                </>
            )}

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {/* Additional SEO */}
            <meta name="theme-color" content="#FED466" />
            <meta name="msapplication-TileColor" content="#FED466" />

            {/* Alternate languages */}
            <link rel="alternate" hrefLang="pt-BR" href={`${siteUrl}${router.asPath}?lang=pt`} />
            <link rel="alternate" hrefLang="en" href={`${siteUrl}${router.asPath}?lang=en`} />
            <link rel="alternate" hrefLang="es" href={`${siteUrl}${router.asPath}?lang=es`} />
            <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

            {/* Schema.org JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(finalJsonLd) }}
            />
        </Head>
    );
}

// Componente simplificado para páginas que não usam Next.js Head
export function SEOMetadata(props: SEOProps) {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br';

    const fullTitle = props.title
        ? `${props.title} | A Rafa Criou - Arquivos Teocráticos Digitais JW`
        : 'A Rafa Criou - Arquivos Teocráticos Digitais para Testemunhas de Jeová | JW | TJ';

    const description = props.description || 'Descubra uma coleção de arquivos teocráticos digitais para ajudar você a dar seu melhor a Jeová! PDFs personalizados para Testemunhas de Jeová.';

    const ogImage = props.image?.startsWith('http') ? props.image : `${siteUrl}${props.image || '/og-image.jpg'}`;

    const allKeywords = [...new Set([...defaultKeywords, ...(props.keywords || [])])];

    return {
        title: fullTitle,
        description,
        keywords: allKeywords.join(', '),
        openGraph: {
            type: props.type || 'website',
            title: fullTitle,
            description,
            images: [{ url: ogImage }],
            siteName: 'A Rafa Criou',
            locale: 'pt_BR',
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
            images: [ogImage],
        },
        robots: {
            index: !props.noindex,
            follow: !props.nofollow,
        },
        alternates: {
            canonical: props.canonical,
            languages: {
                'pt-BR': `${siteUrl}?lang=pt`,
                'en': `${siteUrl}?lang=en`,
                'es': `${siteUrl}?lang=es`,
            },
        },
    };
}

export default SEO;
