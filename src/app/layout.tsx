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
import { OneSignalProvider } from '@/components/onesignal-provider';
import { AffiliateProvider } from '@/contexts/AffiliateContext';
import { cookies } from 'next/headers';
import { FontPreload } from './font-preload';

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Weights para acessibilidade
  display: 'swap', // Otimizar carregamento de fonte
  preload: false, // Desabilitar preload para evitar warning de recursos não usados
  fallback: ['system-ui', 'arial'],
});

// Metadata otimizada para SEO com foco em Testemunhas de Jeová
export async function generateMetadata(): Promise<Metadata> {
  return generateSEOMetadata({
    title: undefined, // Usa o título padrão completo
    description: 'A Rafa Criou: Loja #1 de materiais teocráticos digitais para Testemunhas de Jeová! 🎁 Lembrancinhas personalizadas para batismo, assembleia, pioneiros, anciãos, superintendente e todas as ocasiões especiais. 📝 Papéis de carta, cartões de pregação, abas para bíblia, calendários e agendas teocráticas. ⚡ Download imediato, materiais em PT/ES/EN, qualidade profissional. Feito com amor por irmãos, para irmãos!',
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
        <FontPreload />
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
            <main className="flex-1">
              {children}
            </main>
            <ConditionalFooter />
            <ToastProvider />
            <MobileBottomMenu />
          </AffiliateProvider>
        </Providers>
      </body>
    </html>
  );
}
