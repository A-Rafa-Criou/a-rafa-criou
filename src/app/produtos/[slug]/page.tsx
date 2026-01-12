import { ProductDetailEnhanced } from "@/components/product-detail-enhanced";
import { getProductBySlug } from "@/lib/db/products";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

interface ProductPageProps {
    params: Promise<{ slug: string }>;
}

// 🔥 ISR OTIMIZADO: Revalida a cada 5 minutos (atualização rápida de promoções)
export const revalidate = 300; // 5 minutos

// 🚀 OTIMIZAÇÃO: Pré-renderizar top 100 produtos no build (economia de 70% de transfer)
export async function generateStaticParams() {
    try {
        const topProducts = await db
            .select({ slug: products.slug })
            .from(products)
            .where(eq(products.isActive, true))
            .orderBy(desc(products.isFeatured), desc(products.createdAt))
            .limit(100);

        return topProducts.map((p) => ({
            slug: p.slug,
        }));
    } catch (error) {
        console.error('❌ Erro ao gerar static params:', error);
        return [];
    }
}

// Metadata dinâmico para SEO OTIMIZADO
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const p = await params;
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pt';
    const product = await getProductBySlug(p.slug, locale);

    if (!product) {
        return {
            title: 'Produto não encontrado | A Rafa Criou',
        };
    }

    // Gerar keywords específicas do produto
    const productKeywords = [
        product.name,
        'PDF digital',
        'download imediato',
        'material teocrático',
        'Testemunhas de Jeová',
        'A Rafa Criou',
    ];

    // Adicionar keywords específicas baseadas no nome do produto
    if (product.name.toLowerCase().includes('lembrancinha')) {
        productKeywords.push('lembrancinha JW', 'presente teocrático', 'lembrancinha congregação');

        if (product.name.toLowerCase().includes('batismo')) productKeywords.push('batismo', 'presente batizado', 'lembrancinha batismo TJ');
        if (product.name.toLowerCase().includes('pioneiro')) productKeywords.push('pioneiro auxiliar', 'pioneiro regular', 'presente pioneiro');
        if (product.name.toLowerCase().includes('ancião') || product.name.toLowerCase().includes('anciãos')) productKeywords.push('anciãos', 'escola anciãos', 'presente ancião');
        if (product.name.toLowerCase().includes('servo')) productKeywords.push('servo ministerial', 'presente servo');
        if (product.name.toLowerCase().includes('superintendente')) productKeywords.push('superintendente circuito', 'visita superintendente');
        if (product.name.toLowerCase().includes('assembleia') || product.name.toLowerCase().includes('congresso')) productKeywords.push('assembleia regional', 'congresso', 'evento teocrático');
    }

    if (product.name.toLowerCase().includes('carta') || product.name.toLowerCase().includes('papel')) {
        productKeywords.push('papel de carta', 'carta teocrática', 'papelaria JW', 'carta personalizada');
    }

    if (product.name.toLowerCase().includes('cartão') || product.name.toLowerCase().includes('pregação')) {
        productKeywords.push('cartão pregação', 'serviço campo', 'ministério cristão', 'pregação casa em casa');
    }

    if (product.name.toLowerCase().includes('aba') || product.name.toLowerCase().includes('bíblia')) {
        productKeywords.push('abas bíblia', 'marcadores bíblia', 'organização estudo bíblico');
    }

    if (product.name.toLowerCase().includes('calendário') || product.name.toLowerCase().includes('agenda')) {
        productKeywords.push('calendário teocrático', 'agenda ministerial', 'planner JW', 'organização pessoal');
    }

    // Descrição otimizada com CTA
    const enhancedDescription = product.description
        ? `${product.description} ⚡ Download imediato após a compra! PDF de alta qualidade para impressão. Perfeito para presentear irmãos da congregação ou organizar sua vida cristã.`
        : `${product.name} - Material teocrático digital de alta qualidade para Testemunhas de Jeová. Download imediato após a compra! PDF otimizado para impressão em A4. Feito com amor pela Rafa para ajudar você no ministério cristão.`;

    return {
        title: `${product.name} - PDF Digital | A Rafa Criou`,
        description: enhancedDescription,
        keywords: productKeywords,
        openGraph: {
            title: `${product.name} | A Rafa Criou`,
            description: enhancedDescription,
            type: 'website',
            images: product.images && product.images.length > 0 ? [
                {
                    url: product.images[0],
                    width: 1200,
                    height: 630,
                    alt: product.name,
                }
            ] : [],
            siteName: 'A Rafa Criou',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | A Rafa Criou`,
            description: enhancedDescription,
            images: product.images && product.images.length > 0 ? [product.images[0]] : [],
            creator: '@arafacriou',
        },
        alternates: {
            canonical: `https://arafacriou.com.br/produtos/${p.slug}`,
            languages: {
                'pt-BR': `https://arafacriou.com.br/pt/produtos/${p.slug}`,
                'en': `https://arafacriou.com.br/en/produtos/${p.slug}`,
                'es': `https://arafacriou.com.br/es/produtos/${p.slug}`,
            },
        },
    };
}

export default async function ProductPage({ params }: ProductPageProps) {
    const p = await params;

    // Decodificar e normalizar slug (remover acentos)
    const decodedSlug = decodeURIComponent(p.slug);
    const normalizedSlug = decodedSlug
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pt';

    // Tentar buscar com slug decodificado primeiro, depois com normalizado
    let product = await getProductBySlug(decodedSlug, locale);
    if (!product && decodedSlug !== normalizedSlug) {
        product = await getProductBySlug(normalizedSlug, locale);
    }

    if (!product) {
        return notFound();
    }

    // Structured Data (JSON-LD) OTIMIZADO para SEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': product.name,
        'description': product.description || `${product.name} - Material teocrático digital de alta qualidade`,
        'image': product.images && product.images.length > 0 ? product.images : [],
        'brand': {
            '@type': 'Brand',
            'name': 'A Rafa Criou',
        },
        'offers': {
            '@type': 'Offer',
            'price': product.basePrice.toFixed(2),
            'priceCurrency': 'BRL',
            'availability': 'https://schema.org/InStock',
            'url': `https://arafacriou.com.br/produtos/${p.slug}`,
            'priceValidUntil': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 ano
            'itemCondition': 'https://schema.org/NewCondition',
            'seller': {
                '@type': 'Organization',
                'name': 'A Rafa Criou',
                'url': 'https://arafacriou.com.br',
            },
        },
        'category': 'Materiais Teocráticos Digitais',
        'audience': {
            '@type': 'Audience',
            'audienceType': 'Testemunhas de Jeová',
        },
        'inLanguage': locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es' : 'en',
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductDetailEnhanced product={product} />
        </>
    );
}
