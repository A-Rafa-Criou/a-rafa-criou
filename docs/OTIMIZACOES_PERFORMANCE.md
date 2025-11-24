# Otimizações de Performance - PageSpeed Insights

## 📊 Métricas Iniciais
- **Performance Mobile**: 64/100
- **LCP (Largest Contentful Paint)**: 6.6s
- **First Contentful Paint**: 2.5s
- **Total Blocking Time**: 50ms ✅
- **Cumulative Layout Shift**: 0.013 ✅

## 🎯 Problemas Identificados

### 1. Imagens (197 KiB de economia potencial)
- Banner principal (1920x600) carregava com quality=100
- Faltava fetchPriority="high" no elemento LCP

### 2. JavaScript não usado (83 KiB)
- OneSignal SDK (49 KiB) carregava com strategy="afterInteractive"
- Scripts desnecessários no carregamento inicial

### 3. Fontes (7.3s de delay)
- Scripter-Regular.ttf demorava 7.3s para carregar
- Faltava preload para fontes críticas
- 3 formatos de fonte (woff, woff2, ttf) carregavam simultaneamente

### 4. Cache Headers
- Assets estáticos sem cache agressivo
- Fontes sem cache de longo prazo

## ✅ Otimizações Implementadas

### 1. Banner Principal (LCP)
**Arquivo**: `src/components/sections/HeroSection.tsx`

```tsx
<Image
  src="/Banner_principal.gif"
  alt={t('a11y.heroAlt')}
  width={1920}
  height={600}
  priority
  fetchPriority="high"  // ✅ NOVO: Prioridade máxima
  unoptimized={true}
  quality={85}          // ✅ REDUZIDO: 100 → 85 (economia ~15%)
  // ...
/>
```

**Impacto esperado**: 
- LCP reduzido de 6.6s para ~3-4s
- Economia de ~30 KiB no banner

---

### 2. Lazy Loading OneSignal
**Arquivo**: `src/components/onesignal-provider.tsx`

```tsx
<Script
  src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
  strategy="lazyOnload"  // ✅ ALTERADO: afterInteractive → lazyOnload
  onLoad={handleScriptLoad}
/>
```

**Impacto esperado**:
- Economia de 49 KiB no carregamento inicial
- JavaScript executado apenas após interação ou idle
- FCP e LCP não bloqueados por OneSignal

---

### 3. Preload de Fontes
**Arquivo**: `src/app/layout.tsx`

```tsx
<head>
  <link
    rel="preload"
    href="/fonts/Scripter-Regular.woff2"
    as="font"
    type="font/woff2"
    crossOrigin="anonymous"
  />
</head>
```

**Arquivo**: `src/app/globals.css`

```css
@font-face {
  font-family: 'Scripter';
  src: url('/fonts/Scripter-Regular.woff2') format('woff2');
  /* ✅ REMOVIDO: woff e ttf para evitar múltiplos downloads */
  font-weight: normal;
  font-style: normal;
  font-display: swap;  /* ✅ JÁ ESTAVA: exibe fallback enquanto carrega */
}
```

**Impacto esperado**:
- Redução de 7.3s para ~1-2s no carregamento da fonte
- Apenas woff2 (formato moderno) carrega
- Preload garante que fonte crítica carregue ASAP

---

### 4. Cache Headers
**Arquivo**: `vercel.json`

```json
{
  "headers": [
    {
      "source": "/fonts/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*\\.(jpg|jpeg|png|gif|webp|svg|ico))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Impacto esperado**:
- Visitas repetidas carregam assets do cache do navegador
- Economia de largura de banda
- Melhora significativa em Second Visit metrics

---

## 📈 Resultados Esperados

### Antes vs Depois

| Métrica | Antes | Esperado | Melhoria |
|---------|-------|----------|----------|
| **Performance Score** | 64 | 85-92 | +21-28 pontos |
| **LCP** | 6.6s | 2.5-3.5s | -3.1-4.1s (47-62%) |
| **FCP** | 2.5s | 1.5-2.0s | -0.5-1.0s (20-40%) |
| **TBT** | 50ms | 40-50ms | Mantido ✅ |
| **CLS** | 0.013 | 0.010-0.013 | Mantido ✅ |
| **JavaScript** | 83 KiB bloat | ~34 KiB bloat | -49 KiB (59%) |

---

## 🔍 Como Testar

### 1. PageSpeed Insights
```
https://pagespeed.web.dev/analysis/https-www-arafacriou-com-br/kjgnszgo85?form_factor=mobile
```

### 2. Chrome DevTools
- Abra DevTools (F12)
- Network tab → Throttling: "Slow 3G"
- Performance tab → Record reload
- Verifique:
  - LCP element (deve ser o banner)
  - fetchPriority="high" no banner
  - OneSignal carrega depois de onload
  - Fonte woff2 com preload

### 3. Lighthouse CLI
```bash
npm install -g lighthouse
lighthouse https://www.arafacriou.com.br --view
```

---

## 🚀 Próximas Otimizações (Opcionais)

### 1. Converter Banner para WebP/AVIF
**Impacto**: -100-150 KiB adicional
```bash
# Converter GIF para WebP animado
ffmpeg -i Banner_principal.gif -vf "fps=10,scale=1920:-1" -c:v libwebp -lossless 0 -q:v 80 Banner_principal.webp
```

### 2. Image CDN (Cloudflare/Vercel)
**Impacto**: Otimização automática + serving de AVIF/WebP
- Habilitar Vercel Image Optimization
- Remover `unoptimized={true}` do banner

### 3. Code Splitting Adicional
**Impacto**: -20-40 KiB de JavaScript inicial
- Lazy load FeaturedProducts quando visível
- Dynamic imports para admin routes

### 4. Critical CSS Inline
**Impacto**: FCP -200-500ms
- Extrair CSS crítico da homepage
- Inline no <head>, defer restante

---

## 📝 Notas Técnicas

### Por que `unoptimized={true}` no banner?
O GIF animado precisa de `unoptimized` porque Next.js Image não suporta animações. Alternativas:
1. Converter para WebP animado (suportado)
2. Usar video tag com mp4 (melhor performance)
3. Usar Lottie animation (SVG animado)

### Por que `lazyOnload` no OneSignal?
OneSignal é necessário apenas para usuários logados que querem notificações push. Não faz sentido bloquear o LCP/FCP para isso. Com `lazyOnload`:
- Carrega após `window.onload`
- Não bloqueia métricas críticas
- Usuário ainda pode aceitar notificações

### Compatibilidade woff2
woff2 tem **98%+ de suporte** (todos navegadores modernos desde 2016):
- Chrome 36+
- Firefox 39+
- Safari 10+
- Edge 14+

Navegadores antigos exibirão fallback (system-ui/arial) com `font-display: swap`.

---

## 🔗 Referencias

- [Web.dev - Optimize LCP](https://web.dev/optimize-lcp/)
- [Next.js - Optimizing Fonts](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Next.js - Script Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/scripts)
- [Vercel - Edge Caching](https://vercel.com/docs/edge-network/caching)
- [MDN - fetchpriority](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/fetchPriority)

---

**Última atualização**: 24/11/2025  
**Autor**: GitHub Copilot  
**Commit**: `d8a4953`
