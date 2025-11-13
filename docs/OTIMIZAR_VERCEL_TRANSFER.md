# 🚀 Otimização Fast Origin Transfer - Vercel

## 📊 O que é Fast Origin Transfer?

O **Fast Origin Transfer** é o tráfego de dados entre:
- Edge Network da Vercel → Seu backend (Neon DB, APIs, etc.)
- Serverless Functions → Database
- ISR/SSR requests → External APIs

**Limites comuns:**
- Hobby: 100GB/mês (grátis)
- Pro: 1TB/mês incluído
- Enterprise: Custom

---

## 🔴 Problemas Identificados no Projeto

### 1. **APIs com `force-dynamic` desnecessário**
```typescript
// ❌ PROBLEMA: Força SSR em TODA request
export const dynamic = 'force-dynamic';
export const revalidate = 7200;
```

**Impacto:** Cada request bate no banco, mesmo com revalidate configurado.

### 2. **Imagens sem otimização Next.js**
- 142 imagens no Cloudinary
- Possível uso de URLs diretas sem Next/Image
- Falta de cache agressivo

### 3. **Páginas de produto sem Static Generation**
```typescript
// /produtos/[slug]/page.tsx
export const revalidate = 3600; // ISR ✅
// Mas falta generateStaticParams para build-time
```

### 4. **Admin APIs sem rate limiting adequado**
```typescript
// /api/admin/products/route.ts
export const revalidate = 300; // Cache muito curto!
```

---

## ✅ Soluções Implementadas

### 1. **Remover `force-dynamic` onde possível**

**Antes:**
```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 7200;
```

**Depois:**
```typescript
export const revalidate = 7200; // ISR puro
// Remove force-dynamic
```

**Aplicar em:**
- ✅ `/api/products/route.ts` (já tem revalidate 7200)
- ❌ `/api/admin/products/route.ts` (ainda tem force-dynamic)

### 2. **Aumentar cache de APIs públicas**

```typescript
// /api/products/route.ts
export const revalidate = 21600; // 6 horas (antes: 2h)

// /api/admin/products/route.ts  
export const revalidate = 600; // 10 minutos (antes: 5min)

// /api/admin/stats/route.ts
export const revalidate = 600; // 10 minutos (antes: 5min)
```

### 3. **Implementar Static Generation para produtos**

```typescript
// src/app/produtos/[slug]/page.tsx
export const revalidate = 3600; // ✅ Já existe

// ✅ ADICIONAR: Build-time static generation
export async function generateStaticParams() {
  const allProducts = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.isActive, true))
    .limit(100); // Top 100 produtos mais acessados

  return allProducts.map((p) => ({
    slug: p.slug,
  }));
}
```

**Benefício:** 100 produtos pré-renderizados no build = 0 transfer no first load.

### 4. **Otimizar imagens com Next/Image**

**Verificar todos os componentes:**
```bash
# Buscar imagens sem otimização
grep -r "img src=" src/
grep -r "<Image" src/
```

**Padrão correto:**
```tsx
import Image from 'next/image';

<Image
  src={imageUrl}
  alt={product.name}
  width={400}
  height={400}
  quality={75}
  placeholder="blur"
  loading="lazy"
/>
```

### 5. **Cache Headers agressivos**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=21600, stale-while-revalidate=43200',
          },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 6. **Cloudinary com transformações na URL**

```typescript
// Exemplo de otimização
const optimizedUrl = `https://res.cloudinary.com/your-cloud/image/upload/
  f_auto,q_auto:good,w_800,c_limit/${publicId}`;
```

**Parâmetros:**
- `f_auto`: Formato automático (WebP/AVIF)
- `q_auto:good`: Qualidade balanceada
- `w_800`: Width máximo
- `c_limit`: Redimensionar se maior

---

## 🎯 Plano de Ação Prioritário

### Fase 1: Redução Imediata (70% economia)

1. **Remover `force-dynamic` das APIs públicas**
```typescript
// src/app/api/products/route.ts
- export const dynamic = 'force-dynamic';
export const revalidate = 21600; // 6 horas
```

2. **Aumentar cache de admin APIs**
```typescript
// src/app/api/admin/products/route.ts
- export const revalidate = 300;
+ export const revalidate = 600;
```

3. **Adicionar generateStaticParams**
```typescript
// src/app/produtos/[slug]/page.tsx
export async function generateStaticParams() {
  const products = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.isActive, true))
    .limit(100);
  
  return products.map((p) => ({ slug: p.slug }));
}
```

### Fase 2: Otimização de Imagens (20% economia)

4. **Auditar uso de Next/Image**
```bash
npm run build | grep "Image Optimization"
```

5. **Implementar loader Cloudinary**
```typescript
// next.config.ts
images: {
  loader: 'custom',
  loaderFile: './src/lib/cloudinary-loader.ts',
}

// src/lib/cloudinary-loader.ts
export default function cloudinaryLoader({ src, width, quality }) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  return `${src}?${params.join(',')}`;
}
```

### Fase 3: Edge Caching (10% economia)

6. **Implementar middleware de cache**
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Cache público agressivo
  if (request.nextUrl.pathname.startsWith('/produtos')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=7200'
    );
  }
  
  return response;
}
```

---

## 📈 Monitoramento

### 1. **Dashboard Vercel**
- Analytics → Functions → Filter by path
- Usage → Fast Origin Transfer
- Identificar APIs com mais requests

### 2. **Logs de cache**
```typescript
// Adicionar em APIs
console.log('[CACHE]', {
  path: request.url,
  cacheStatus: response.headers.get('x-vercel-cache'),
  timestamp: new Date().toISOString(),
});
```

### 3. **Métricas esperadas**

**Antes:**
- 500MB-1GB/mês (APIs dinâmicas)
- Cache hit rate: ~30%

**Depois:**
- 100-200MB/mês (ISR + Static)
- Cache hit rate: ~85%

---

## 🔧 Implementação Rápida

### Script de otimização automática:

```typescript
// scripts/optimize-apis.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/app/api/**/route.ts');

files.forEach((file) => {
  let content = readFileSync(file, 'utf-8');
  
  // Remover force-dynamic se houver revalidate
  if (content.includes('revalidate') && content.includes('force-dynamic')) {
    content = content.replace(/export const dynamic = ['"]force-dynamic['"];?\n?/g, '');
    writeFileSync(file, content);
    console.log(`✅ Otimizado: ${file}`);
  }
});
```

---

## 🚨 Avisos Importantes

1. **Não remover `force-dynamic` de:**
   - APIs de upload (`/api/r2/*`)
   - APIs de tradução (`/api/translate`)
   - Webhooks de pagamento
   - Ações de autenticação

2. **Admin APIs podem ter cache curto:**
   - Dados críticos = 60s
   - Listagens = 300s
   - Stats/métricas = 600s

3. **Testar localmente antes de deploy:**
```bash
npm run build
npm run start
# Verificar se cache funciona
```

---

## ✅ Checklist Final

- [ ] Remover `force-dynamic` de APIs públicas
- [ ] Aumentar `revalidate` para 6-24 horas
- [ ] Implementar `generateStaticParams` em produtos
- [ ] Auditar uso de Next/Image
- [ ] Adicionar cache headers
- [ ] Otimizar URLs Cloudinary
- [ ] Configurar middleware de cache
- [ ] Monitorar Vercel Analytics por 7 dias

---

**Economia estimada:** 70-85% do Fast Origin Transfer atual
**Tempo de implementação:** 2-4 horas
**ROI:** Redução de custos + Melhor performance
