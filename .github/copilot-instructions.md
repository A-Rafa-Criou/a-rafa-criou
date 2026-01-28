# Instruções do Projeto A-Rafa-Criou

## ⚠️ REGRAS CRÍTICAS - NUNCA VIOLAR

### 🚫 NUNCA Apagar Dados do Banco

- **NUNCA** criar migrations com `DROP TABLE`, `DELETE FROM`, `TRUNCATE`
- **NUNCA** apagar produtos, orders, users, affiliates ou qualquer dado
- **SEMPRE** usar `ALTER TABLE ADD COLUMN IF NOT EXISTS` em migrations
- **SEMPRE** preservar dados existentes em qualquer operação
- Se precisar remover coluna, apenas marcar como deprecated com comentário
- **BACKUP obrigatório** antes de qualquer migration em produção

### ♻️ SEMPRE Reutilizar o Que Existe

- **ANTES de criar** qualquer tabela/coluna/API, verificar se JÁ existe
- **USAR** schemas, rotas e componentes existentes
- **NÃO duplicar** funcionalidades - buscar e adaptar o existente
- **CONSULTAR** docs/sistema-afiliados-analise-completa-stripe-connect.md para status atual

---

## 📋 Contexto do Projeto

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind + Shadcn UI + Drizzle (Postgres) + Auth.js
**Público**: 25–70 anos (e-commerce de PDFs digitais)
**Cores**: bg #F4F4F4, primária #FED466, secundária #FD9555

## 🎯 Funcionalidades Principais

### ✅ Implementado

- E-commerce completo com carrinho e checkout
- Pagamentos: Stripe, PayPal, PIX (PagSeguro)
- Sistema de afiliados (2 tipos: comum + licença comercial)
- Entrega automática de PDFs via Cloudflare R2 (URLs assinadas)
- Promoções com cupons de desconto
- Cupons de desconto
- Conversão de moeda (BRL/USD/EUR)
- i18n da interface (PT/EN)
- Admin dashboard completo
- Sistema financeiro com transações
- Rastreamento de cliques de afiliados
- Comissões automáticas via webhooks

### 🚧 Em Desenvolvimento (conforme docs/)

- APIs de vendas/materiais para afiliados
- Sistema de emails completo (Resend)
- Upload para R2 (assinaturas/contratos)
- Gestão de materiais de afiliados (admin)
- Aprovação manual de licença comercial

### 📦 Integrações Ativas

- Stripe (pagamentos + webhooks)
- PayPal (pagamentos + webhooks)
- MercadoPago (pagamentos)
- MercadoPago (PIX)
- Cloudflare R2 (storage privado de PDFs)
- Auth.js (autenticação)
- Gmail (envio de emails)
- Cloudinary (imagens de produtos)

## 🗄️ Estrutura do Banco (NUNCA APAGAR)

### Tabelas Principais

- `users` - Usuários e autenticação
- `products` - Produtos (PDFs)
- `orders` - Pedidos
- `order_items` - Itens dos pedidos
- `affiliates` - Afiliados (common + commercial_license)
- `affiliate_commissions` - Comissões
- `affiliate_links` - Links de rastreamento
- `affiliate_clicks` - Rastreamento de cliques
- `affiliate_materials` - Materiais de divulgação
- `affiliate_file_access` - Acesso temporário (comercial)
- `coupons` - Cupons de desconto
- `transactions` - Transações financeiras

### Campos Importantes (NÃO REMOVER)

- `orders.affiliateId` - Rastreamento de afiliado
- `orders.stripePaymentIntentId` - Idempotência Stripe
- `affiliates.affiliateType` - 'common' ou 'commercial_license'
- `products.fileType` - Tipo do arquivo
- `users.role` - 'user' ou 'admin'

## 📝 Padrões de Código

### APIs e Rotas

- Validação com Zod em todas as APIs
- Rate limiting em: login, reset, download, webhooks, cadastro de afiliados
- Idempotência em webhooks (verificar antes de criar)
- Sempre verificar `session.user.role` para admin
- Imports absolutos: `@/lib`, `@/components`, `@/app`

### Segurança

- 5 dias de expiração em acessos temporários (comercial)
- NUNCA expor dados sensíveis no cliente
- Logs de IP em ações críticas (aceite de termos, etc.)
- Proteção contra fraude em comissões de afiliados

### Performance

- Indexes em campos de busca frequente
- Eager loading com Drizzle relations
- Paginação em listagens grandes

### Acessibilidade

- Padrão AA em todos componentes
- Labels em formulários
- Alt text em imagens
- Contraste adequado

## 🔄 Workflow de Desenvolvimento

1. **ANTES de criar**: Buscar se já existe no schema/código
2. **Migrations**: Sempre aditivas (ADD COLUMN IF NOT EXISTS)
3. **Testes**: Validar em dev antes de production
4. **Documentação**: Atualizar docs/ quando necessário

## 📚 Documentação de Referência

- `docs/sistema-afiliados-analise-completa-stripe-connect.md` - Status completo do sistema de afiliados
- `docs/sistema-financeiro.md` - Sistema de transações
- `drizzle/` - Histórico de migrations (NUNCA apagar arquivos)

---

**Última atualização**: 26/01/2026
