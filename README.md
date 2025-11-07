# 🚀 A Rafa Criou - E-commerce de PDFs

E-commerce moderno para venda de produtos digitais (PDFs) com migração completa do WooCommerce. Sistema otimizado para público 25-70 anos com foco em acessibilidade e experiência de usuário.

---

## 🎉 Migração WordPress → Next.js COMPLETA!

### ✅ Dados Migrados com Sucesso

- **1.225 clientes** (senhas WordPress compatíveis com conversão automática)
- **89 produtos** (todos os produtos ativos)
- **1.632 pedidos** (sem duplicatas)
- **1.844 items** de pedidos
- **1.844 permissões** de download (ilimitadas, sem expiração)

### 📋 Documentação da Migração

- `PROGRESSO_MIGRACAO.md` - Relatório completo da migração
- `MIGRACAO_CHECKLIST.md` - Checklist detalhado
- `MIGRACAO_WORDPRESS_COMPLETA.md` - Documentação técnica
- `PRODUTOS_NAO_ENCONTRADOS_ANALISE.md` - Análise de produtos

---

## 🎨 Identidade Visual

- **Background:** `#F4F4F4`
- **Cor Primária:** `#FED466` (Amarelo)
- **Cor Secundária:** `#FD9555` (Laranja)
- **Tipografia:** Poppins ≥16px (acessibilidade AA)
- **Componentes:** Tailwind CSS + Shadcn UI

---

## 🛠️ Stack Tecnológica

- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + Shadcn UI
- **Banco de Dados:** PostgreSQL + Drizzle ORM
- **Autenticação:** Auth.js (NextAuth v5)
- **Storage Arquivos:** Cloudflare R2 (S3-compatible) - PDFs
- **Storage Imagens:** Cloudinary (CDN otimizado) - Imagens de produtos
- **Pagamentos:** Stripe + PayPal + PIX (em desenvolvimento)
- **E-mail:** Resend (em desenvolvimento)
- **Validação:** Zod

---

## ✅ Status de Implementação

### 🟢 **1. FUNDAÇÃO** (COMPLETO - 100%)

- ✅ Next.js 15 + TypeScript + Tailwind configurado
- ✅ Shadcn UI com cores customizadas (#FED466, #FD9555, #F4F4F4)
- ✅ Drizzle ORM + PostgreSQL funcionando
- ✅ Auth.js configurado (Credentials + Magic Link)
- ✅ ESLint + Prettier
- ✅ Variáveis de ambiente documentadas (`.env.example`)

### 🟢 **2. BANCO DE DADOS** (COMPLETO - 100%)

- ✅ **Auth:** `users`, `accounts`, `sessions`, `verification_tokens`
- ✅ **Produtos:** `products`, `product_variations`, `product_images` (Cloudinary), `files`, `categories`
- ✅ **Atributos:** `attributes`, `attribute_values`, `product_attributes`, `variation_attribute_values`
- ✅ **Pedidos:** `orders`, `order_items`, `downloads`, `download_permissions` ✨
- ✅ **Cupons:** `coupons`, `coupon_products`, `coupon_variations`, `coupon_redemptions`
- ✅ **Migração:** Campos `wpOrderId`, `wpProductId`, `legacyPasswordType`, `legacyPasswordHash` ✨
- ✅ **Outros:** `invites`, `url_map`
- 🔵 **Notificações:** `notifications`, `notification_settings` (Opcional/Futuro)
- 🔵 **Afiliação:** `affiliates`, `affiliate_links`, `affiliate_commissions` (Opcional/Futuro)

### 🟢 **3. AUTENTICAÇÃO** (COMPLETO - 100%)

- ✅ Auth.js configurado e funcional
- ✅ Login com Credentials (email + senha)
- ✅ Registro de usuários
- ✅ Roles (admin, member, customer)
- ✅ Proteção de rotas (middleware para /admin e /conta)
- ✅ Script para criar/promover admins
- ✅ Sessão JWT segura
- ✅ Estrutura para reset de senha (`password_reset_tokens`)
- ✅ **Compatibilidade phpass para migração WooCommerce** ✨ (Conversão automática para bcrypt)
- ✅ Recuperação de senha funcional

### 🟢 **4. PAINEL ADMINISTRATIVO** (COMPLETO - 100%)

- ✅ Layout admin (`/admin`)
- ✅ **Dashboard com estatísticas:**
  - ✅ Total de produtos, clientes, pedidos, receita
  - ✅ Breakdown de receita por moeda (BRL/USD/EUR) com conversão
  - ✅ Pedidos recentes com suporte multi-moeda
  - ✅ Downloads do mês
- ✅ **Produtos:**
  - ✅ Listagem com busca, filtros e paginação **OTIMIZADA** (N+1 queries resolvido)
  - ✅ CRUD completo (criar, editar, excluir)
  - ✅ Upload de imagens para **Cloudinary** (CDN global, otimização automática)
  - ✅ Upload de PDFs para Cloudflare R2
  - ✅ Cleanup automático de imagens (delete antigas ao atualizar/deletar)
  - ✅ Variações de produtos
  - ✅ Atributos personalizados
  - ✅ SEO por produto
  - ✅ Performance: **88% mais rápida** (de 40+ queries para 5 queries fixas)
  - ✅ Estatísticas de produtos (total, ativos, inativos, receita média)
- ✅ **Categorias:**
  - ✅ CRUD completo
  - ✅ Ordenação e ativação
- ✅ **Usuários:**
  - ✅ Listagem
  - ✅ Promoção/demoção de admins
  - ✅ Confirmação por senha
- ✅ **Cupons:** Interface admin
- ✅ **Pedidos:**
  - ✅ Gestão de pedidos
  - ✅ Estatísticas (total, receita, status)
  - ✅ Suporte multi-moeda com conversão
  - ✅ Filtros e busca

### 🟢 **5. CLOUDINARY (Otimização de Imagens)** (COMPLETO - 100%)

- ✅ Migração completa de base64 → Cloudinary
- ✅ Upload otimizado (max 1200x1200, quality auto, WebP/AVIF)
- ✅ API `/api/cloudinary/upload` e `/api/cloudinary/delete`
- ✅ Cleanup automático (delete imagens antigas ao editar/deletar produtos)
- ✅ CDN global com edge caching
- ✅ Suporte para pastas (`products`, `variations`)
- ✅ Schema atualizado (`cloudinaryId`, `url`, `width`, `height`, `format`)
- ✅ Frontend integrado (ProductForm, ProductsCards, EditProductDialog)
- ✅ Performance: Imagens carregam **instantaneamente** via CDN

### 🟢 **6. CATÁLOGO E PRODUTOS** (COMPLETO - 100%) ✨

- ✅ **Página de Catálogo (`/produtos`):**
  - ✅ Grid responsivo de produtos
  - ✅ **Busca Inteligente no Header:**
    - ✅ Desktop: Barra no header com dropdown de resultados ao vivo
    - ✅ Mobile: Busca oculta, aparece ao clicar no botão "BUSCAR"
    - ✅ Live Search com debounce (300ms)
    - ✅ Busca case-insensitive em:
      - ✅ Nomes de produtos, variações, categorias
      - ✅ Valores de atributos (cores, tamanhos, etc)
    - ✅ Preview: imagem + nome + preço
    - ✅ Link "Ver todos os resultados"
  - ✅ Filtros avançados:
    - ✅ Por categoria
    - ✅ Por faixa de preço (mín/máx)
  - ✅ Ordenação:
    - ✅ Mais recentes/antigos
    - ✅ Menor/maior preço
    - ✅ Nome (A-Z / Z-A)
  - ✅ Paginação completa
  - ✅ Skeleton loaders
  - ✅ Filtros mobile (Sheet lateral)
  - ✅ Breadcrumbs de navegação
- ✅ **Estrutura `/produtos/[slug]` criada**
- ✅ **API de produtos OTIMIZADA** com suporte a filtros
- ✅ **Hook `useProducts`** para buscar produtos
- ✅ **PDP (Product Detail Page) completa:**
  - ✅ Galeria de imagens otimizada
  - ✅ Seletor de variações inteligente
  - ✅ Preço dinâmico ao selecionar variação
  - ✅ Add to Cart e Buy Now funcionais
  - ✅ SEO básico (JSON-LD Schema.org Product)
- ❌ Produtos relacionados (FALTA)
- ❌ Sistema de reviews/avaliações (FUTURO)

### � **7. CARRINHO E CHECKOUT** (COMPLETO - 100%) ✨

- ✅ Context API para carrinho
- ✅ localStorage para persistência
- ✅ Página `/carrinho`
- ✅ **Página `/checkout` completa com:**
  - ✅ Resumo do pedido (produtos, quantidades, total)
  - ✅ Integração Stripe Elements
  - ✅ Integração PayPal
  - ✅ Integração PIX (Mercado Pago)
  - ✅ Estados de loading e erro
  - ✅ Validação de preços no backend (segurança)
- ✅ Página `/obrigado` (confirmação)
- ✅ **Gateway Stripe:**
  - ✅ API criar Payment Intent (`/api/stripe/create-payment-intent`)
  - ✅ API webhook (`/api/stripe/webhook`)
  - ✅ Validação de assinatura
  - ✅ Idempotência (campo `stripePaymentIntentId`)
  - ✅ Criação automática de pedidos no banco
  - ✅ API Version: `2025-08-27.basil` (latest stable)
- ✅ **Gateway PayPal:**
  - ✅ API criar ordem (`/api/paypal/create-order`)
  - ✅ API capturar ordem (`/api/paypal/capture-order`)
  - ✅ API webhook (`/api/paypal/webhook`)
  - ✅ Componente PayPalCheckout
- ✅ **Gateway PIX (Mercado Pago):**
  - ✅ API criar PIX (`/api/mercado-pago/pix`)
  - ✅ Componente PixCheckout com QR Code
  - ✅ Polling de status
- ✅ **Área do Cliente:**
  - ✅ Página `/conta/pedidos` (histórico)
  - ✅ Página `/conta/pedidos/[id]` (detalhes)
  - ✅ Download de produtos comprados
  - ✅ Re-download funcional
  - ✅ Validação de cupons no checkout

### 🟢 **7. CLOUDFLARE R2 (Storage)** (COMPLETO - 100%)

- ✅ Configuração R2 (variáveis `.env`)
- ✅ Upload de PDFs (`/api/r2/upload`)
- ✅ Delete de arquivos (`/api/r2/delete`)
- ✅ URLs assinadas para download (`/api/download/generate-link`)
- ✅ Integração com admin de produtos
- ✅ Entrega automática pós-pagamento (via webhook)
- ✅ Área do cliente com downloads (`/conta/pedidos`)
- ✅ Re-download funcional (gera novos links)
- ✅ Logs de auditoria (tabela `downloads`)
- ✅ **Permissões de download** (`download_permissions`) ✨
- 🔵 Proteção avançada: watermark, limite ativo (Opcional/Futuro)

### 🔴 **8. SISTEMA DE CUPONS** (EM DESENVOLVIMENTO - 20%)

- ✅ Estrutura no banco criada
- ✅ CRUD no painel admin
- ✅ Validação backend no checkout
- ✅ Aplicar desconto e recalcular totais
- ✅ Registro em `coupon_redemptions`
- ✅ Limites de uso e datas

### 🔴 **10. NOTIFICAÇÕES EXTERNAS** (PLANEJADO - 0%)

- 🔵 Tabelas `notifications`, `notification_settings` (Planejado)
- 🔵 E-mail transacional (Resend) (Planejado)
- 🔵 WhatsApp (API Meta) opcional (Planejado)
- 🔵 SMS (Twilio/Zenvia) opcional (Planejado)
- 🔵 Web Push (OneSignal/FCM) opcional (Planejado)
- 🔵 Preferências de notificação (Planejado)
- 🔵 DND (Não Perturbe) (Planejado)

### 🔴 **11. SISTEMA DE AFILIAÇÃO** (PLANEJADO - 0%)

- 🔵 Tabelas `affiliates`, `affiliate_links`, `affiliate_commissions` (Planejado)
- 🔵 CRUD de afiliados (Planejado)
- 🔵 Geração de links únicos (Planejado)
- 🔵 Registro de comissões (Planejado)
- 🔵 Painel do afiliado (Planejado)
- 🔵 Rotina de pagamento (Planejado)

### � **12. MIGRAÇÃO WOOCOMMERCE** (COMPLETO - 100%) ✨

- ✅ **Dados Migrados:**
  - ✅ 1.225 clientes (1.054 registrados + 171 convidados)
  - ✅ 89 produtos (todos os produtos ativos)
  - ✅ 1.632 pedidos (sem duplicatas)
  - ✅ 1.844 items de pedidos
  - ✅ 1.844 permissões de download
- ✅ Scripts de importação (`scripts/migration/`)
  - ✅ `import-customers.ts` (clientes)
  - ✅ `import-products-completo.ts` (produtos)
  - ✅ `import-orders.ts` (pedidos)
  - ✅ `create-download-permissions.ts` (permissões)
- ✅ Validação de senhas phpass (WordPress)
- ✅ Rehash automático no login (conversão para bcrypt)
- ✅ Proteção contra duplicatas
- ✅ Histórico de pedidos importado
- ✅ **Documentação completa:**
  - ✅ `PROGRESSO_MIGRACAO.md` - Status 100%
  - ✅ `MIGRACAO_CHECKLIST.md` - 60 tarefas concluídas
  - ✅ `MIGRACAO_WORDPRESS_COMPLETA.md` - Técnica
  - ✅ `PRODUTOS_NAO_ENCONTRADOS_ANALISE.md` - Análise

### 🔴 **13. SEO E REDIRECIONAMENTOS** (PLANEJADO - 0%)

- 🔵 Middleware 301 via `url_map` (Planejado)
- 🔵 next-sitemap (Planejado)
- 🔵 robots.txt (Planejado)
- 🔵 Canonical tags (Planejado)
- 🔵 Open Graph tags (Planejado)
- 🔵 Schema.org (JSON-LD) (Planejado)

### 🔴 **14. PROTEÇÃO DE PDFs** (PLANEJADO - 0%)

- 🔵 Watermark dinâmica (e-mail + data) (Planejado)
- 🔵 Limite de downloads por cliente (Planejado)
- 🔵 Logs detalhados em `downloads` (Planejado)
- 🔵 Fingerprint invisível (metadata) (Planejado)

### � **15. i18n (Interface)** (PARCIAL - 50%)

- ✅ react-i18next configurado
- ✅ Middleware de detecção de idioma
- ✅ Arquivos de tradução PT/EN/ES criados
- ✅ Hook `useTranslation` em uso
- ✅ Cookies e localStorage para persistência
- ✅ Seletor de idioma na interface
- ❌ Tradução de todas as páginas (FALTA)
- ✅ Conversor de moeda (BRL/USD/EUR)

### 🔴 **16. PWA** (PLANEJADO - 0%)

- 🔵 Manifest (Planejado)
- 🔵 Service Worker (Planejado)
- 🔵 Add to Home (iOS/Android) (Planejado)
- 🔵 Push Notifications (Planejado)

### 🔴 **17. TESTES E QUALIDADE** (PLANEJADO - 0%)

- 🔵 Jest (unit tests) (Planejado)
- 🔵 Cypress (e2e tests) (Planejado)
- 🔵 Testes de integração (Planejado)
- 🔵 Coverage reports (Planejado)

### 🔴 **18. DEPLOY E INFRA** (PLANEJADO - 0%)

- 🔵 Vercel/Netlify configurado (Planejado)
- 🔵 CI/CD (GitHub Actions) (Planejado)
- 🔵 Staging (`beta.`) (Planejado)
- 🔵 Monitoramento (Sentry/LogRocket) (Planejado)
- 🔵 Backups automatizados (Planejado)
- 🔵 Rate limiting (Planejado)

---

## 🎯 PRÓXIMOS PASSOS (Prioridade Alta)

### **🔥 FASE 1: Completar Funcionalidades Core** (1-2 semanas)

#### 1.1 Sistema de Notificações por E-mail (Prioridade #1)

- [ ] Integração Resend
  - [ ] Criar conta Resend e API key
  - [ ] Templates de e-mail profissionais
- [ ] E-mails Transacionais
  - [ ] Confirmação de pedido
  - [ ] Download disponível (com links)
  - [ ] Reset de senha
  - [ ] Boas-vindas (novo usuário)
- [ ] Área do Cliente
  - [ ] Preferências de notificação
  - [ ] Histórico de e-mails enviados

#### 1.2 Sistema de Cupons (Prioridade #2)

- [ ] CRUD de Cupons no Admin
  - [ ] Criar/editar/deletar cupons
  - [ ] Tipos: percentual, valor fixo, frete grátis
  - [ ] Datas de validade (início/fim)
  - [ ] Limite de uso global e por cliente
  - [ ] Produtos/categorias específicas
- [ ] Validação no Checkout
  - [ ] API `/api/cupons/validate`
  - [ ] Verificar validade, limites, produtos elegíveis
  - [ ] Aplicar desconto e recalcular total
  - [ ] Feedback visual (cupom aplicado/inválido)
- [ ] Registro de Uso
  - [ ] Inserir em `coupon_redemptions` após compra
  - [ ] Incrementar contador de uso
  - [ ] Bloquear se atingir limite

---

### **FASE 2: Melhorias de UX** (1 semana)

#### 2.1 Produtos Relacionados

- [ ] Algoritmo de recomendação (mesma categoria ou tags similares)
- [ ] Componente de produtos relacionados na PDP
- [ ] Limite de 4-6 produtos sugeridos

#### 2.2 Sistema de Reviews (Opcional)

- [ ] Tabela `product_reviews` no banco
- [ ] Componente de avaliação (estrelas)
- [ ] Validação (apenas quem comprou pode avaliar)
- [ ] Moderação de reviews no admin

---

### **FASE 3: Melhorias Opcionais** (2-3 semanas)

#### 3.1 SEO Avançado

- [ ] Sitemap automático (`next-sitemap`)
- [ ] robots.txt configurado
- [ ] Middleware de redirecionamentos 301
- [ ] Tags canônicas em todas as páginas

#### 3.2 Proteção de PDFs

- [ ] Watermark dinâmica (email + data)
- [ ] Limite ativo de downloads
- [ ] Logs detalhados de acesso
- [ ] Fingerprint em metadata

#### 3.3 Sistema de Afiliação

- [ ] CRUD de afiliados
- [ ] Links únicos com tracking
- [ ] Cálculo de comissões
- [ ] Dashboard para afiliados
- [ ] Rotina de pagamento

---

### **FASE 4: Deploy e Go-Live** (1 semana)

- [ ] Configurar Vercel/Netlify
  - [ ] Variáveis de ambiente
  - [ ] Build e deploy pipeline
  - [ ] Preview deploys (PRs)
- [ ] CI/CD (GitHub Actions)
  - [ ] Lint + Type Check
  - [ ] Testes automáticos
  - [ ] Deploy automático (main branch)
- [ ] Ambiente de Staging (`beta.`)
  - [ ] Testes de integração
  - [ ] Review de stakeholders
- [ ] Monitoramento
  - [ ] Sentry (Error Tracking)
  - [ ] Google Analytics
  - [ ] Hotjar (UX)
- [ ] Trocar DNS (Go-Live)
- [ ] Monitoramento 72h pós-lançamento
- [ ] Plano de rollback documentado

---

## 🚀 Quick Start

### 1. Instalação

```bash
git clone <repository-url>
cd a-rafa-criou
npm install
```

### 2. Configuração do Ambiente

```bash
cp .env.example .env.local
# Configure as variáveis necessárias no .env.local
```

### 3. Banco de Dados

```bash
# Configure seu PostgreSQL e atualize DATABASE_URL no .env.local
npm run db:generate      # Gerar migrations
npm run db:migrate       # Executar migrations
npm run db:studio        # (Opcional) Drizzle Studio
```

### 4. Desenvolvimento

```bash
npm run dev              # Servidor de desenvolvimento
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run start            # Servidor de produção

# Qualidade de código
npm run lint             # ESLint
npm run lint:fix         # ESLint com correção automática
npm run format           # Prettier
npm run format:check     # Verificar formatação
npm run type-check       # Verificação TypeScript

# Banco de dados
npm run db:generate      # Gerar migrations
npm run db:migrate       # Executar migrations
npm run db:studio        # Drizzle Studio
npm run db:push          # Push schema direto (dev)
```

---

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── api/               # API Routes
│   │   ├── admin/         # APIs admin (produtos, usuários, stats)
│   │   ├── auth/          # Auth.js
│   │   ├── products/      # API pública de produtos
│   │   ├── r2/            # Upload/download Cloudflare R2
│   │   └── download/      # URLs assinadas
│   ├── admin/             # Painel administrativo
│   │   ├── produtos/      # Gestão de produtos
│   │   └── usuarios/      # Gestão de usuários
│   ├── auth/              # Páginas de autenticação
│   ├── produtos/          # Catálogo e PDPs
│   ├── carrinho/          # Carrinho de compras
│   ├── checkout/          # Checkout
│   ├── conta/             # Área do cliente
│   └── obrigado/          # Confirmação pós-compra
├── components/            # Componentes React
│   ├── admin/             # Componentes admin
│   ├── header/            # Header e navegação
│   ├── sections/          # Seções reutilizáveis
│   └── ui/                # Componentes Shadcn UI
├── contexts/              # React Context (carrinho, etc)
├── hooks/                 # Custom hooks
├── lib/                   # Utilitários e configurações
│   ├── auth/              # Configuração Auth.js
│   ├── db/                # Drizzle ORM e schemas
│   ├── utils/             # Funções utilitárias
│   ├── r2.ts              # Cliente Cloudflare R2
│   └── r2-utils.ts        # Helpers R2
├── locales/               # Traduções (futuro)
└── types/                 # Definições TypeScript
```

---

## 🔐 Segurança

### Variáveis Sensíveis

Todas as variáveis sensíveis estão em `.env.example`. **Nunca commite `.env.local`**.

### Rate Limiting (Planejado)

- Login: 5 tentativas/minuto
- Downloads: Configurável por usuário
- APIs: 60 requests/minuto

### Proteção de PDFs (Planejado)

- URLs assinadas (TTL 15 min)
- Watermark dinâmica
- Limite de re-downloads
- Logs completos

---

## 🌍 Localização (Planejado)

### Moedas

- BRL (Real) - Padrão
- USD (Dólar)
- EUR (Euro)

### Idiomas (Interface)

- PT (Português) - Padrão
- EN (Inglês)
- ES (Espanhol)

**Nota:** Traduções de PDFs (conteúdo) não serão implementadas - equipe própria de tradução.

---

## 📊 Monitoramento (Planejado)

- Google Analytics
- Sentry (Error Tracking)
- Hotjar (UX)

---

## 📄 Licença

Projeto proprietário - A Rafa Criou

---

## 📞 Suporte

Para questões técnicas, entre em contato pelos canais oficiais.

---

**Desenvolvido com ❤️ para A Rafa Criou**
