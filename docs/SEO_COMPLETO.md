# 🚀 Sistema de SEO - A Rafa Criou

Sistema completo de SEO implementado para otimizar a visibilidade do site nos mecanismos de busca, com foco especial em Testemunhas de Jeová (JW/TJ).

---

## ✅ Componentes Implementados

### 1. **robots.txt** ✅

- **Localização:** `public/robots.txt`
- **Função:** Controla o crawling dos bots de busca
- **Configurações:**
  - ✅ Permite indexação de páginas públicas
  - ✅ Bloqueia áreas administrativas (`/admin`, `/conta`, `/api`)
  - ✅ Bloqueia páginas de checkout e carrinho
  - ✅ Bloqueia bots indesejados (AhrefsBot, SemrushBot, etc.)
  - ✅ Define localização do sitemap
  - ✅ Crawl delay configurável

### 2. **Sitemap Dinâmico** ✅

- **Pacote:** `next-sitemap`
- **Configuração:** `next-sitemap.config.js`
- **Recursos:**
  - ✅ Geração automática no build (`postbuild`)
  - ✅ Suporte a múltiplos idiomas (pt-BR, en, es)
  - ✅ Prioridades customizadas por tipo de página
  - ✅ Change frequency otimizada
  - ✅ Exclusão automática de rotas privadas
  - ✅ Index sitemap para sites grandes

**Gerar sitemap manualmente:**

```bash
npm run postbuild
```

### 3. **Meta Tags SEO** ✅

- **Componente:** `src/components/seo/metadata.ts`
- **Funções disponíveis:**
  - `generateSEOMetadata()` - Meta tags gerais
  - `generateProductMetadata()` - Meta tags para produtos
  - `generateCategoryMetadata()` - Meta tags para categorias

**Uso no App Router (Next.js 15):**

```tsx
import { generateSEOMetadata } from '@/components/seo/metadata';

export async function generateMetadata() {
  return generateSEOMetadata({
    title: 'Minha Página',
    description: 'Descrição da página',
    keywords: ['keyword1', 'keyword2'],
    canonical: 'https://arafacriou.com.br/pagina',
  });
}
```

### 4. **Open Graph Tags** ✅

Implementado automaticamente em `generateSEOMetadata()`:

- ✅ `og:type` (website, article, product)
- ✅ `og:title`
- ✅ `og:description`
- ✅ `og:image` (1200x630px)
- ✅ `og:url` (canonical)
- ✅ `og:site_name`
- ✅ `og:locale` (pt_BR, en_US, es_ES)

### 5. **Twitter Card** ✅

- ✅ `twitter:card` - summary_large_image
- ✅ `twitter:title`
- ✅ `twitter:description`
- ✅ `twitter:image`
- ✅ `twitter:creator` (@arafacriou)

### 6. **Schema.org (JSON-LD)** ✅

- **Funções disponíveis:**
  - `generateWebsiteSchema()` - Schema do site
  - `generateOrganizationSchema()` - Schema da organização
  - `generateProductSchema()` - Schema de produto
  - `generateBreadcrumbSchema()` - Schema de breadcrumb

**Uso:**

```tsx
import { generateWebsiteSchema } from '@/components/seo/metadata';

const schema = generateWebsiteSchema();

// Adicionar ao head
<script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
```

### 7. **Redirecionamentos 301** ✅

- **Tabela:** `url_map` (PostgreSQL)
- **Middleware:** `src/middleware.ts`
- **Script:** `scripts/seed-url-redirects.ts`

**Como funciona:**

1. Middleware intercepta todas as requisições
2. Busca no banco se existe redirecionamento para a URL
3. Se existe, retorna HTTP 301 (ou código configurado)
4. Preserva query params na URL de destino

**Adicionar redirecionamentos:**

```bash
npm run seed-redirects
```

**Adicionar redirecionamentos manualmente no banco:**

```sql
INSERT INTO url_map (old_url, new_url, status_code, is_active)
VALUES ('/produto/old-product', '/produtos/new-product', 301, true);
```

---

## 🎯 Otimizações para Testemunhas de Jeová (JW/TJ)

### Keywords Incluídas Automaticamente:

- ✅ Testemunhas de Jeová
- ✅ TJ
- ✅ JW
- ✅ Jehovah's Witnesses
- ✅ Arquivos teocráticos
- ✅ Arquivos digitais JW
- ✅ PDF para Testemunhas de Jeová
- ✅ Materiais teocráticos
- ✅ Organização de estudo bíblico
- ✅ Pioneiro auxiliar
- ✅ Pioneiro regular
- ✅ Abas para bíblia
- ✅ Calendário teocrático
- ✅ Estudo pessoal
- ✅ Pregação
- ✅ Ministério
- ✅ Materiais para congregação
- ✅ Vida cristã
- ✅ Adoração em família
- ✅ Serviço de campo

### Audience Schema:

Todos os produtos incluem automaticamente:

```json
{
  "audience": {
    "@type": "Audience",
    "audienceType": "Testemunhas de Jeová"
  }
}
```

---

## 📊 Configurações por Tipo de Página

### **Home Page (/):**

- **Priority:** 1.0
- **Change Frequency:** daily
- **Schema:** WebSite + Organization
- **Keywords:** Genéricas + JW/TJ

### **Catálogo (/produtos):**

- **Priority:** 0.9
- **Change Frequency:** daily
- **Schema:** WebSite + BreadcrumbList

### **PDP (/produtos/[slug]):**

- **Priority:** 0.9
- **Change Frequency:** weekly
- **Schema:** Product + Organization + BreadcrumbList
- **Open Graph:** type="product"

### **Categorias:**

- **Priority:** 0.7
- **Change Frequency:** weekly
- **Schema:** CollectionPage + BreadcrumbList

### **Páginas Estáticas:**

- **Priority:** 0.6
- **Change Frequency:** monthly
- **Schema:** WebPage

---

## 🔧 Manutenção

### **Atualizar Sitemap:**

```bash
npm run build  # Gera sitemap automaticamente
```

### **Adicionar Redirecionamentos:**

```bash
npm run seed-redirects  # Executa seed de redirecionamentos
```

### **Testar Redirecionamentos:**

```bash
curl -I https://arafacriou.com.br/produto/old-product
# Deve retornar HTTP 301 e Location: /produtos/new-product
```

### **Verificar Schema.org:**

- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/

### **Verificar Open Graph:**

- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

---

## 📈 Métricas de SEO

### **Ferramentas Recomendadas:**

- **Google Search Console** - Monitorar indexação e erros
- **Google Analytics 4** - Tráfego orgânico
- **SEMrush / Ahrefs** - Rankings e backlinks
- **PageSpeed Insights** - Performance
- **Lighthouse** - Auditoria técnica

### **KPIs para Monitorar:**

- Taxa de indexação (páginas indexadas vs. totais)
- Posições médias nas SERPs
- CTR orgânico
- Tráfego de busca orgânica
- Conversões de busca orgânica
- Core Web Vitals (LCP, FID, CLS)

---

## 🚀 Próximos Passos

### **Fase 1: Conteúdo** (Recomendado)

- [ ] Criar blog com conteúdo relevante para JW/TJ
- [ ] Adicionar FAQs nas páginas de produto
- [ ] Criar guias de uso para cada produto
- [ ] Adicionar reviews de clientes

### **Fase 2: Técnico** (Opcional)

- [ ] Implementar AMP para páginas críticas
- [ ] Lazy loading de imagens
- [ ] WebP/AVIF automático
- [ ] Critical CSS inline

### **Fase 3: Link Building** (Futuro)

- [ ] Parcerias com influencers JW
- [ ] Guest posts em blogs teocráticos
- [ ] Presença em fóruns e comunidades
- [ ] Marketing de conteúdo

---

## 📄 Recursos Úteis

- **Next.js SEO:** https://nextjs.org/learn/seo/introduction-to-seo
- **Schema.org:** https://schema.org/
- **Google SEO Guide:** https://developers.google.com/search/docs
- **Open Graph Protocol:** https://ogp.me/
- **Twitter Cards:** https://developer.twitter.com/en/docs/twitter-for-websites/cards

---

## 📞 Suporte

Para questões sobre SEO, entre em contato com a equipe de desenvolvimento.

**Desenvolvido com ❤️ para A Rafa Criou**
