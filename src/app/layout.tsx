import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConditionalHeader } from "@/components/ConditionalHeader";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import ToastProvider from "@/components/ToastProvider";
import MobileBottomMenu from '@/components/sections/MobileBottomMenu';
import { generateSiteMetadata, getSiteSettings } from '@/lib/settings';
import { Analytics } from '@/components/Analytics';

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Weights para acessibilidade
});

// Metadata dinâmica baseada nas configurações do banco
export async function generateMetadata(): Promise<Metadata> {
  return await generateSiteMetadata();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Buscar configurações para Analytics
  const settings = await getSiteSettings();

  return (
    <html lang={process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'pt'}>
      <body
        className={`${poppins.variable} font-sans antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning={true}
      >
        <Analytics
          googleAnalyticsId={settings.googleAnalyticsId || undefined}
          facebookPixelId={settings.facebookPixelId || undefined}
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
