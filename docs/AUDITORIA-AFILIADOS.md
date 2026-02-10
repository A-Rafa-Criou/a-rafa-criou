# 🧹 AUDITORIA - Sistema de Afiliados (06/02/2026)

## ❌ PROBLEMAS IDENTIFICADOS

### 1. Taxa de Comissão - Configuração Confusa

#### Atualmente:

- ❌ NO SCHEMA: `affiliates.commissionValue` - Taxa POR AFILIADO
- ❌ Não existe configuração GLOBAL pelo admin
- ⚠️ Código assume taxa fixa (ex: 50%) hardcoded

#### O que deveria ser:

- ✅ Admin define taxa GLOBAL em `/admin/configuracoes`
- ✅ Novos afiliados herdam essa taxa automaticamente
- ✅ Admin pode ajustar taxa individual se necessário

---

### 2. Páginas Duplicadas

#### Páginas ativas:

```
/afiliados-da-rafa/page.tsx                      ✅ Landing page (usar)
/afiliados-da-rafa/cadastro/comum/page.tsx      ✅ Cadastro comum (usar)
/afiliados-da-rafa/cadastro/licenca-comercial/page.tsx  ✅ Cadastro comercial (usar)
/afiliados-da-rafa/cadastro/aguardando-aprovacao/page.tsx ❓ Usada?
/afiliados-da-rafa/dashboard/page.tsx            ❌ DUPLICADA (tem componente separado)
/afiliados-da-rafa/configurar-pagamentos/page.tsx ⚠️ DUPLICADA abaixo
/[locale]/afiliados-da-rafa/configurar-pagamentos/page.tsx ⚠️ DUPLICADA
```

---

### 3. APIs Não Usadas / Deprecadas

#### APIs relacionadas a Stripe/MercadoPago Split (NÃO USAMOS MAIS):

```
❌ /api/affiliates/onboarding/stripe/start
❌ /api/affiliates/onboarding/stripe/status
❌ /api/affiliates/onboarding/mercadopago/start
❌ /api/affiliates/onboarding/mercadopago/callback
❌ /api/affiliates/onboarding/mercadopago/status
```

**Motivo:** Agora usamos PIX direto, sem onboarding de contas.

#### APIs que podem ser consolidadas:

```
⚠️ /api/affiliates/me - Retorna dados do afiliado logado
⚠️ /api/affiliates/dashboard - Retorna dados do dashboard
→ CONSOLIDAR em /api/affiliates/me (incluir dados dashboard)
```

```
⚠️ /api/affiliates/orders - Lista pedidos do afiliado
⚠️ /api/affiliates/sales - Lista vendas do afiliado
→ CONSOLIDAR em /api/affiliates/sales (já tem tudo)
```

#### APIs OK (manter):

```
✅ /api/affiliates/track - Rastreamento de cliques
✅ /api/affiliates/register/common - Cadastro comum
✅ /api/affiliates/register/commercial-license - Cadastro comercial
✅ /api/affiliates/sales - Vendas do afiliado
✅ /api/affiliates/materials - Materiais de divulgação
✅ /api/affiliates/profile - Atualizar perfil
✅ /api/affiliates/links - Criar links personalizados
✅ /api/affiliates/products - Listar produtos disponíveis
✅ /api/affiliates/file-access/[accessId] - Acesso a arquivos (licença comercial)
```

---

### 4. Campos do Schema Não Usados

#### Stripe Connect (remover):

```typescript
❌ stripeAccountId
❌ stripeOnboardingStatus
❌ stripeDetailsSubmitted
❌ stripeChargesEnabled
❌ stripePayoutsEnabled
❌ stripeOnboardedAt
```

#### MercadoPago Split (remover):

```typescript
❌ mercadopagoAccountId
❌ mercadopagoSplitStatus
❌ mercadopagoAccessToken
❌ mercadopagoPublicKey
❌ mercadopagoPayoutsEnabled
❌ mercadopagoOnboardedAt
```

#### Campos duplicados (consolidar):

```typescript
⚠️ minimumPayoutAmount (decimal) - R$ 0,01
⚠️ minimumPayout (decimal) - R$ 0,01
→ MANTER APENAS: minimumPayout
```

```typescript
⚠️ commissionType (percent/fixed)
⚠️ commissionValue (valor da comissão)
→ SIMPLIFICAR: Apenas commissionRate (sempre porcentagem)
```

#### Campos OK (manter):

```typescript
✅ pixKey - Chave PIX
✅ pixAutoTransferEnabled - Pagamento automático
✅ pixVerificationStatus - Verificação PIX
✅ affiliateType - common ou commercial_license
✅ status - active, inactive, suspended
✅ totalClicks, totalOrders, totalRevenue
✅ totalCommission, pendingCommission, paidCommission
✅ termsAccepted, contractSigned
```

---

## ✅ PLANO DE LIMPEZA

### Fase 1: Adicionar Configuração Global de Taxa

#### 1.1 - Criar tabela de configurações

```sql
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(100) UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamp DEFAULT NOW()
);

INSERT INTO settings (key, value, description) VALUES
('affiliate_commission_rate', '50.00', 'Taxa padrão de comissão para novos afiliados (%)'),
('affiliate_commercial_license_rate', '15.00', 'Taxa para afiliados com licença comercial (%)');
```

#### 1.2 - Interface Admin

- Adicionar em `/admin/configuracoes`: campo para definir taxa padrão
- Validação: 0% a 100%
- Salvar em `settings.affiliate_commission_rate`

#### 1.3 - Usar na criação de afiliados

- Ao cadastrar, buscar taxa padrão de `settings`
- Salvar em `affiliates.commissionValue`
- Admin pode ajustar individualmente depois

---

### Fase 2: Remover Código Morto

#### 2.1 - Remover APIs de onboarding (5 arquivos)

```bash
rm -rf src/app/api/affiliates/onboarding/stripe/
rm -rf src/app/api/affiliates/onboarding/mercadopago/
```

#### 2.2 - Remover página duplicada

```bash
rm -rf src/app/[locale]/afiliados-da-rafa/
```

#### 2.3 - Consolidar APIs

- Mover lógica de `/api/affiliates/orders` para `/api/affiliates/sales`
- Mover lógica de `/api/affiliates/dashboard` para `/api/affiliates/me`
- Deletar rotas antigas

---

### Fase 3: Limpar Schema

#### 3.1 - Migration para remover colunas

```sql
-- Remover Stripe Connect
ALTER TABLE affiliates DROP COLUMN IF EXISTS stripe_account_id;
ALTER TABLE affiliates DROP COLUMN IF EXISTS stripe_onboarding_status;
ALTER TABLE affiliates DROP COLUMN IF EXISTS stripe_details_submitted;
ALTER TABLE affiliates DROP COLUMN IF EXISTS stripe_charges_enabled;
ALTER TABLE affiliates DROP COLUMN IF EXISTS stripe_payouts_enabled;
ALTER TABLE affiliates DROP COLUMN IF EXISTS stripe_onboarded_at;

-- Remover MercadoPago Split
ALTER TABLE affiliates DROP COLUMN IF EXISTS mercadopago_account_id;
ALTER TABLE affiliates DROP COLUMN IF EXISTS mercadopago_split_status;
ALTER TABLE affiliates DROP COLUMN IF EXISTS mercadopago_access_token;
ALTER TABLE affiliates DROP COLUMN IF EXISTS mercadopago_public_key;
ALTER TABLE affiliates DROP COLUMN IF EXISTS mercadopago_payouts_enabled;
ALTER TABLE affiliates DROP COLUMN IF EXISTS mercadopago_onboarded_at;

-- Remover campo duplicado
ALTER TABLE affiliates DROP COLUMN IF EXISTS minimum_payout_amount;

-- Remover campos antigos de pagamento
ALTER TABLE affiliates DROP COLUMN IF EXISTS bank_name;
ALTER TABLE affiliates DROP COLUMN IF EXISTS bank_account;
ALTER TABLE affiliates DROP COLUMN IF EXISTS preferred_payment_method;
ALTER TABLE affiliates DROP COLUMN IF EXISTS payment_automation_enabled;

-- Simplificar comissão (sempre porcentagem)
ALTER TABLE affiliates DROP COLUMN IF EXISTS commission_type;
ALTER TABLE affiliates RENAME COLUMN commission_value TO commission_rate;
ALTER TABLE affiliates ALTER COLUMN commission_rate SET DEFAULT 50.00;
COMMENT ON COLUMN affiliates.commission_rate IS 'Taxa de comissão em % (ex: 50.00 = 50%)';
```

#### 3.2 - Atualizar schema.ts

- Remover campos deletados
- Renomear `commissionValue` → `commissionRate`
- Adicionar comentários claros

---

### Fase 4: Documentar Estrutura Limpa

#### Estrutura Final de Rotas:

```
📁 Páginas Públicas:
/afiliados-da-rafa                              → Landing page
/afiliados-da-rafa/cadastro/comum              → Cadastro comum
/afiliados-da-rafa/cadastro/licenca-comercial  → Cadastro comercial
/afiliados-da-rafa (logado)                     → Dashboard (componente)

📁 APIs:
POST /api/affiliates/register/common           → Cadastro
POST /api/affiliates/register/commercial-license → Cadastro comercial
GET  /api/affiliates/me                        → Dados + dashboard
GET  /api/affiliates/sales                     → Vendas e comissões
GET  /api/affiliates/materials                 → Materiais
PUT  /api/affiliates/profile                   → Atualizar chave PIX
POST /api/affiliates/links                     → Criar link personalizado
GET  /api/affiliates/products                  → Produtos disponíveis
POST /api/affiliates/track                     → Rastreamento de clique
GET  /api/affiliates/file-access/:id           → Download (licença comercial)

📁 Admin:
/admin/afiliados                                → Gerenciar afiliados
/admin/configuracoes                            → Taxa de comissão padrão
```

---

## 🎯 PRIORIDADES

### 1️⃣ CRÍTICO (fazer agora):

- ✅ Criar configuração global de taxa de comissão no admin
- ✅ Atualizar cadastro para usar taxa padrão

### 2️⃣ IMPORTANTE (fazer logo):

- 🔄 Remover APIs de onboarding (Stripe/MercadoPago)
- 🔄 Remover campos do schema não usados
- 🔄 Consolidar APIs duplicadas

### 3️⃣ PODE ESPERAR:

- 📋 Refatorar componentes de dashboard
- 📋 Adicionar testes automatizados
- 📋 Melhorar documentação

---

## 📊 IMPACTO DAS MUDANÇAS

### Antes:

- ❌ 23 APIs de afiliados (muitas não usadas)
- ❌ 20+ campos no schema (metade não usada)
- ❌ Taxa hardcoded ou configurada manualmente
- ❌ Código confuso e desorganizado

### Depois:

- ✅ 11 APIs essenciais (tudo usado)
- ✅ 15 campos no schema (tudo necessário)
- ✅ Taxa configurável pelo admin
- ✅ Código limpo e documentado

---

**Próxima ação:** Implementar configuração global de taxa de comissão?
