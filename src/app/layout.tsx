import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConditionalHeader } from "@/components/ConditionalHeader";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import ToastProvider from "@/components/ToastProvider";
import MobileBottomMenu from '@/components/sections/MobileBottomMenu';
import { generateSEOMetadata } from '@/components/seo/metadata';
import { Analytics } from '@/components/Analytics';
import { cookies } from 'next/headers';

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Weights para acessibilidade
  display: 'swap', // Otimizar carregamento de fonte
  preload: true,
  fallback: ['system-ui', 'arial'],
});

// Metadata otimizada para SEO com foco em Testemunhas de Jeová
export async function generateMetadata(): Promise<Metadata> {
  return generateSEOMetadata({
    title: undefined, // Usa o título padrão completo
    description: 'Descubra uma coleção de arquivos teocráticos digitais para ajudar você a dar seu melhor a Jeová! PDFs personalizados para Testemunhas de Jeová, incluindo abas para bíblia, calendários, cartões de pregação, materiais para pioneiros e muito mais. Download imediato após a compra.',
    keywords: [
      'organização pessoal',
      'vida cristã',
      'serviço de campo',
      'pioneiro',
      'auxílio teocrático',
      'materiais para congregação',
      'PDF imprimível',
      'download digital',
      'Rafaela Pereira',
    ],
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://arafacriou.com.br',
    type: 'website',
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
      <body
        className={`${poppins.variable} font-sans antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning={true}
      >
        <Analytics
          googleAnalyticsId={process.env.NEXT_PUBLIC_GA_ID || undefined}
          facebookPixelId={process.env.NEXT_PUBLIC_FB_PIXEL_ID || undefined}
        />
        <Providers>
          <ConditionalHeader />
          <main className="flex-1">
            {children}
          </main>
          <ConditionalFooter />
          <ToastProvider />
          <MobileBottomMenu />
        </Providers>
      </body>
    </html>
  );
}
