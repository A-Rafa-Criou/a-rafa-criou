import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "@/lib/suppress-hmr-errors"; // Suppress HMR ping errors in development
import { Providers } from "@/components/providers";
import { ConditionalHeader } from "@/components/ConditionalHeader";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import ToastProvider from "@/components/ToastProvider";
import MobileBottomMenu from '@/components/sections/MobileBottomMenu';
import { generateSEOMetadata } from '@/components/seo/metadata';
import { Analytics } from '@/components/Analytics';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { OneSignalProvider } from '@/components/onesignal-provider';
import { AffiliateProvider } from '@/contexts/AffiliateContext';
import { cookies } from 'next/headers';
import { FontPreload } from './font-preload';
// import { ImagePopup } from '@/components/ImagePopup';

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Weights para acessibilidade
  display: 'swap', // Otimizar carregamento de fonte
  preload: true, // Preload fonts to reduce LCP blocking
  fallback: ['system-ui', 'arial'],
});

// Metadata otimizada para SEO com foco em Testemunhas de Jeová
export async function generateMetadata(): Promise<Metadata> {
  return generateSEOMetadata({
    title: undefined, // Usa o título padrão completo
    description: 'A Rafa Criou: Loja #1 de materiais e arquivos digitais teocráticos em pdf para ajuda você a dar seu melhor a Jeová! Imprima quantas vezes quiser. Jw, lembrancinhas, envelopes, Bíblia, pioneiros, anciãos, batismo, superintendente, paraíso. Materiais em português, espanhol.',
    keywords: [
      // Produtos mais procurados
      'lembrancinha batismo TJ',
      'lembrancinha pioneiro',
      'lembrancinha assembleia',
      'cartão pregação',
      'abas bíblia',
      'calendário teocrático 2024',
      'agenda pioneiro',
      'papéis carta JW',
      'Bíblia',
      'pioneiros',
      'assembleia anual',
      'batismo',
      'anciãos',
      'superintendente',
      'paraíso',
      'congresso',

      // Ocasiões e eventos
      'presente superintendente',
      'lembrancinha anciãos',
      'inauguração salão reino',
      'escola pioneiros',
      'visita superintendente circuito',

      // Geral
      'materiais teocráticos digitais',
      'PDF Testemunhas Jeová',
      'loja TJ online',
      'download imediato',
      'arquivos personalizáveis',
      'multilíngue português espanhol inglês',
      'A Rafa Criou',
      'Rafaela Pereira',
      'JW',
      'lembrancinhas digitais TJ',
      'materiais teocráticos JW',
      'lembrancinhas TJ',
      'lembrancinhas JW',
    ],
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br',
    type: 'website',
    // Google Search Console Verification - Adicione seu código aqui
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    },
  });
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ler locale do cookie para <html lang>
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'pt';

  return (
    <html lang={locale}>
      <head>
        <title>A Rafa Criou - Loja de PDFs e materiais teocráticos</title>
        <meta name="description" content="A Rafa Criou: Loja de materiais teocráticos digitais - PDFs, lembrancinhas, agendas e muito mais. Download imediato após a compra." />

        {/* 🍎 Meta tags Apple para iOS/Safari Web Push */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="A Rafa Criou" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* 📱 PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FED466" />

        {/* Critical Hero CSS (small set to reduce render-blocking and improve LCP) */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .hero-critical{background:#F4F4F4;min-height:240px;display:flex;align-items:center;justify-content:center}
          .hero-h1{font-family:'Scripter', var(--font-poppins), system-ui, Arial, sans-serif;color:#FD9555;font-weight:700;line-height:1}
          .hero-video{width:100%;height:auto;object-fit:cover}
        `}} />
        <FontPreload />
        {/* Defer non-critical Next.js compiled CSS from blocking render by converting it to preload
            This is safe because we keep critical hero CSS inline via `CriticalCSS` and ensure fonts
            are preloaded. This reduces LCP render-blocking caused by CSS chunks that include @font-face. */}
        <script dangerouslySetInnerHTML={{
          __html: `
          (function(){
            if (typeof window === 'undefined') return;
            var prefix = '/_next/static/css/';
            var links = Array.prototype.slice.call(document.querySelectorAll('link[rel=stylesheet]'));
            links.forEach(function(l){
              try{
                if (l.href && l.href.indexOf(prefix) !== -1) {
                  l.rel = 'preload';
                  l.as = 'style';
                  l.onload = function(){ this.rel = 'stylesheet'; };
                }
              } catch(e) { /* ignore */ }
            });
          })();
        `}} />
        {/* Dynamically fetch Google Fonts CSS for Poppins (400/600/700) and inject preload links for woff2 files.
            This avoids hardcoding woff2 URLs, provides robust preloading for the weights we use, and helps LCP. */}
        <script dangerouslySetInnerHTML={{
          __html: `
          (function(){
            if (typeof window === 'undefined') return;
            try {
              const cssUrl = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap';
              fetch(cssUrl, {mode: 'cors'})
                .then(function(r){ return r.text(); })
                .then(function(css){
                  const re = /url\(([^)]*?\.woff2)[^)]+\)/g;
                  let m;
                  while ((m = re.exec(css)) !== null) {
                    const url = (m[1] || '').replace(/["']/g, '').trim();
                    if (!url) continue;
                    if (!document.querySelector('link[rel="preload"][href="'+url+'"]')) {
                      const l = document.createElement('link');
                      l.rel = 'preload';
                      l.as = 'font';
                      l.crossOrigin = 'anonymous';
                      l.href = url;
                      l.type = 'font/woff2';
                      document.head.appendChild(l);
                    }
                  }
                }).catch(function(){ /* Ignore errors starightforwardly */ });
            } catch(e){ /* ignore */ }
          })();
        `}} />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning={true}
      >
        <Analytics
          googleAnalyticsId={process.env.NEXT_PUBLIC_GA_ID || undefined}
          facebookPixelId={process.env.NEXT_PUBLIC_FB_PIXEL_ID || undefined}
        />
        <Providers>
          <AffiliateProvider>
            <OneSignalProvider />
            <ConditionalHeader />
            <main id="maincontent" role="main" className="flex-1">
              {children}
            </main>
            <ConditionalFooter />
            <ToastProvider />
            <MobileBottomMenu />
            {/* <ImagePopup /> */}
            <VercelAnalytics />
          </AffiliateProvider>
        </Providers>
      </body>
    </html>
  );
}
