/**
 * Font Preload Component
 * Preload crítico da fonte Scripter para melhorar performance (LCP)
 */
export function FontPreload() {
  return (
    <>
      {/* Preload fonte crítica */}
      <link
        rel="preload"
        href="/fonts/Scripter-Regular.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      {/* Preconnect para Cloudinary (imagens e vídeos) */}
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      {/* Preconnect para Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </>
  );
}
