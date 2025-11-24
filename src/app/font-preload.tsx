/**
 * Font Preload Component
 * Preload crítico da fonte Scripter para melhorar performance (LCP)
 */
export function FontPreload() {
  return (
    <>
      <link
        rel="preload"
        href="/fonts/Scripter-Regular.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
    </>
  );
}
