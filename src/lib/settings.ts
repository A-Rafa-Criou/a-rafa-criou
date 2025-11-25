import { db } from '@/lib/db';
import { siteSettings } from '@/lib/db/schema';

/**
 * Busca as configurações do site do banco de dados
 * Utilizado para SEO dinâmico e outras configurações globais
 */
export async function getSiteSettings() {
  try {
    const settings = await db.select().from(siteSettings).limit(1);

    if (settings.length === 0) {
      // Retornar valores padrão se não houver configurações
      return {
        siteName: 'A Rafa Criou',
        siteDescription: 'E-commerce de PDFs educacionais de qualidade',
        siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br',
        supportEmail: 'arafacriou@gmail.com',
        pixEnabled: true,
        stripeEnabled: true,
        maxDownloadsPerProduct: 3,
        downloadLinkExpiration: 24,
        enableWatermark: false,
        metaTitle: 'A Rafa Criou - PDFs Educacionais de Qualidade',
        metaDescription:
          'Encontre os melhores PDFs educacionais para seu aprendizado. Materiais de alta qualidade com entrega instantânea.',
        metaKeywords: 'pdf, educação, aprendizado, ebooks, material educacional',
        googleAnalyticsId: '',
        facebookPixelId: '',
      };
    }

    return settings[0];
  } catch (error) {
    console.error('Erro ao buscar configurações do site:', error);
    // Retornar valores padrão em caso de erro
    return {
      siteName: 'A Rafa Criou',
      siteDescription: 'E-commerce de PDFs educacionais de qualidade',
      siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br',
      supportEmail: 'arafacriou@gmail.com',
      pixEnabled: true,
      stripeEnabled: true,
      maxDownloadsPerProduct: 3,
      downloadLinkExpiration: 24,
      enableWatermark: false,
      metaTitle: 'A Rafa Criou - PDFs Educacionais de Qualidade',
      metaDescription:
        'Encontre os melhores PDFs educacionais para seu aprendizado. Materiais de alta qualidade com entrega instantânea.',
      metaKeywords: 'pdf, educação, aprendizado, ebooks, material educacional',
      googleAnalyticsId: '',
      facebookPixelId: '',
    };
  }
}

/**
 * Gera metadata do Next.js baseado nas configurações do site
 */
export async function generateSiteMetadata() {
  const settings = await getSiteSettings();

  return {
    title: settings.metaTitle || settings.siteName,
    description: settings.metaDescription || settings.siteDescription || undefined,
    keywords: settings.metaKeywords || undefined,
    openGraph: {
      title: settings.metaTitle || settings.siteName,
      description: settings.metaDescription || settings.siteDescription || undefined,
      url: settings.siteUrl || undefined,
      siteName: settings.siteName,
      locale: 'pt_BR',
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: settings.metaTitle || settings.siteName,
      description: settings.metaDescription || settings.siteDescription || undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
  };
}
