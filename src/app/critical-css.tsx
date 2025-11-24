/**
 * Critical CSS Inline
 * Coloca CSS crítico inline para evitar blocking render (resolve 670ms)
 * Carrega resto do CSS de forma assíncrona
 */
export function CriticalCSS() {
    return (
        <style
            dangerouslySetInnerHTML={{
                __html: `
          /* Critical CSS - Above the fold */
          *,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}
          html{line-height:1.5;-webkit-text-size-adjust:100%;font-family:system-ui,-apple-system,sans-serif;tab-size:4}
          body{margin:0;line-height:inherit}
          h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}
          img,svg,video{display:block;vertical-align:middle;max-width:100%;height:auto}
          
          /* Layout básico */
          .min-h-screen{min-height:100vh}
          .flex{display:flex}
          .flex-col{flex-direction:column}
          .items-center{align-items:center}
          .justify-center{justify-content:center}
          
          /* Background e cores críticas */
          .bg-\\[\\#F4F4F4\\]{background-color:#F4F4F4}
          .text-\\[\\#FD9555\\]{color:#FD9555}
          .text-\\[\\#FED466\\]{color:#FED466}
          
          /* Hero Section */
          .relative{position:relative}
          .absolute{position:absolute}
          .inset-0{inset:0}
          .w-full{width:100%}
          .h-auto{height:auto}
          
          /* Poppins fallback */
          body{font-family:var(--font-poppins),system-ui,arial,sans-serif}
          
          /* Prevenir FOUC */
          html{visibility:visible;opacity:1}
        `,
            }}
        />
    );
}
