/**
 * Font Preload Component
 * Preload de recursos essenciais para melhorar performance (LCP)
 * Reduz render blocking chain ao carregar recursos em paralelo
 */
export function FontPreload() {
    return (
        <>
            {/* Preconnect para Cloudinary (imagens e vídeos) - resolve dependency chain */}
            <link rel="preconnect" href="https://res.cloudinary.com" />
            <link rel="dns-prefetch" href="https://res.cloudinary.com" />

            {/* Preconnect para Google Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            {/* Preload local Scripter font */}
            <link rel="preload" as="font" href="/fonts/Scripter-Regular.woff2" type="font/woff2" crossOrigin="anonymous" />
        </>
    );
}

