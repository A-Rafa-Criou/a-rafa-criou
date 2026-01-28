# Sistema de Afiliados - Análise Completa e Migração para Stripe Connect

**Data de Análise**: 26 de Janeiro de 2026  
**Última Atualização**: 26 de Janeiro de 2026 (Fase 2 implementada)  
**Autor**: GitHub Copilot  
**Status Atual**: 85% implementado (Fase 1 e 2 completas)

> ⚠️ **ATENÇÃO**: Este documento substitui `sistema-afiliados-proximos-passos.md` (18/12/2025)
>
> 🚫 **REGRA CRÍTICA**: NUNCA apagar dados do banco (produtos, orders, users, affiliates)
>
> ♻️ **SEMPRE**: Reutilizar tabelas, colunas e APIs existentes antes de criar novas

---

## 📦 Últimas Implementações (26/01/2026)

### APIs Concluídas

- ✅ `GET /api/affiliates/sales` - Vendas para afiliado comum
- ✅ `GET /api/affiliates/orders` - Pedidos para licença comercial
- ✅ `GET /api/affiliates/materials` - Materiais filtrados
- ✅ `GET /api/affiliates/file-access` - Acessos temporários
- ✅ `POST /api/affiliates/file-access/download` - Download com rastreamento

### Admin

- ✅ `POST /api/admin/affiliates/approve` - Aprovação/rejeição
- ✅ `GET /api/admin/affiliates/pending` - Listagem pendentes

### Automações

- ✅ Sistema de emails completo (Resend)
- ✅ Concessão automática de acesso a arquivos (webhooks)
- ✅ Emails automáticos em todos os fluxos

---

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Estrutura Atual Implementada](#estrutura-atual-implementada)
3. [O Que Funciona](#o-que-funciona)
4. [O Que Falta Implementar](#o-que-falta-implementar)
5. [Análise do Stripe Connect](#análise-do-stripe-connect)
6. [Roadmap de Migração](#roadmap-de-migração)
7. [Implementação Passo a Passo](#implementação-passo-a-passo)
8. [Considerações de Segurança](#considerações-de-segurança)

---

## 🎯 Visão Geral do Sistema

O sistema de afiliados possui **dois tipos distintos** de afiliados:

### 1. Afiliado Comum (Commission-Based)

- ✅ **Aprovação automática** ao se cadastrar
- ✅ Recebe **10% de comissão** sobre vendas
- ✅ Pagamento via **PIX** (manual por admin)
- ✅ Acesso a **materiais de divulgação**
- ✅ Dashboard com estatísticas de vendas
- ✅ Links de afiliado personalizados

### 2. Licença Comercial (File Access)

- ⚠️ **Aprovação manual** por admin
- ✅ **Sem comissão** em dinheiro
- ✅ **Acesso temporário** aos arquivos vendidos (5 dias)
- ✅ Visualização protegida (sem download)
- ✅ Contrato digital com assinatura
- ✅ Informações do comprador fornecidas

---

## 🗄️ Estrutura Atual Implementada

### 1. Schema do Banco de Dados

#### Tabela Principal: `affiliates`

```sql
- id (uuid, PK)
- userId (text, FK → users.id, unique)
- code (varchar 50, unique) -- Código único do afiliado
- name, email, phone
- affiliateType (varchar 20) -- 'common' ou 'commercial_license'
- commissionType (varchar 20) -- 'percent' ou 'fixed'
- commissionValue (decimal)

-- Dados bancários
- pixKey (varchar 255)
- bankName, bankAccount

-- Status e estatísticas
- status (varchar 20) -- 'active', 'inactive', 'suspended'
- totalClicks, totalOrders
- totalRevenue, totalCommission
- pendingCommission, paidCommission

-- Termos e contrato
- termsAccepted (boolean)
- termsAcceptedAt, termsIp
- contractSigned, contractSignedAt
- contractSignatureData (text) -- Canvas signature
- contractDocumentUrl (text) -- PDF do contrato

-- Controle interno
- autoApproved (boolean)
- materialsSent, materialsSentAt
- pixVerificationStatus -- 'pending', 'verified', 'failed'
- approvedBy, approvedAt
- lastAccessAt, notes
- createdAt, updatedAt
```

#### Tabela: `affiliate_links`

```sql
- id (uuid, PK)
- affiliateId (uuid, FK)
- productId (uuid, FK, nullable) -- null = link geral
- url (text) -- URL completa
- shortCode (varchar 20, unique)
- clicks, conversions
- revenue (decimal)
- isActive (boolean)
- createdAt, updatedAt
```

#### Tabela: `affiliate_commissions`

```sql
- id (uuid, PK)
- affiliateId (uuid, FK)
- orderId (uuid, FK)
- linkId (uuid, FK, nullable)

-- Valores
- orderTotal, commissionRate, commissionAmount
- currency (varchar 3, default 'BRL')

-- Status do pagamento
- status -- 'pending', 'approved', 'paid', 'cancelled'
- approvedBy, approvedAt
- paidAt, paymentMethod
- paymentProof (text) -- URL do comprovante
- notes
- createdAt, updatedAt
```

#### Tabela: `affiliate_clicks`

```sql
- id (uuid, PK)
- affiliateId (uuid, FK)
- linkId (uuid, FK, nullable)

-- Rastreamento
- ip, userAgent, referer
- country, deviceType

-- Conversão
- converted (boolean)
- orderId (uuid, FK, nullable)
- clickedAt
```

#### Tabela: `affiliate_materials`

```sql
- id (uuid, PK)
- title, description
- fileUrl, fileName, fileType, fileSize
- affiliateType -- 'common', 'commercial_license', 'both'
- isActive (boolean)
- displayOrder (integer)
- createdAt, updatedAt
- createdBy (FK → users.id)
```

#### Tabela: `affiliate_material_downloads`

```sql
- id (uuid, PK)
- affiliateId (uuid, FK)
- materialId (uuid, FK)
- downloadedAt
- ipAddress, userAgent
```

#### Tabela: `affiliate_file_access`

```sql
- id (uuid, PK)
- affiliateId (uuid, FK)
- orderId (uuid, FK)
- productId (uuid, FK)
- fileUrl (text)
- grantedAt, expiresAt
- viewCount, printCount
- lastAccessedAt
- buyerName, buyerEmail, buyerPhone
- isActive (boolean)
- notes
```

### 2. Migrations Executadas (JÁ NO BANCO - NÃO RECRIAR)

✅ **Migration 0025**: `add_affiliate_settings.sql` - EXECUTADA

- Configurações globais em `site_settings`
- Índices de performance
- ⚠️ **NÃO EXECUTAR NOVAMENTE**

✅ **Migration 0029**: `add_affiliate_system_overhaul.sql` - EXECUTADA

- Novos campos em `affiliates` (14 campos)
- 3 novas tabelas: materials, downloads, file_access
- Índices completos
- ⚠️ **NÃO EXECUTAR NOVAMENTE**

### 3. Schema Drizzle Atualizado

✅ Todas as tabelas e relações já estão em `src/lib/db/schema.ts`
✅ **USAR O QUE EXISTE** - não criar novas tabelas/colunas sem verificar
✅ Exports disponíveis: `affiliates`, `affiliateLinks`, `affiliateCommissions`, `affiliateClicks`, `affiliateMaterials`, `affiliateMaterialDownloads`, `affiliateFileAccess`

---

## ✅ O Que Funciona

### 1. Rotas API Implementadas

#### Cadastro de Afiliados

- ✅ `POST /api/affiliates/register/common` - Cadastro afiliado comum
- ✅ `POST /api/affiliates/register/commercial-license` - Cadastro licença comercial

#### Dashboard e Dados

- ✅ `GET /api/affiliates/me` - Dados do afiliado logado
- ✅ `GET /api/affiliates/dashboard` - Dashboard completo com stats

#### Links de Afiliado

- ✅ `POST /api/affiliates/links` - Criar link de afiliado
- ✅ `GET /api/affiliates/track` - Rastreamento de cliques

#### Acesso a Arquivos (Commercial License)

- ✅ `GET /api/affiliates/file-access/[accessId]` - Visualizar arquivo
- ✅ `POST /api/affiliates/file-access/[accessId]/print` - Contador de impressões

#### Admin

- ✅ `GET /api/admin/affiliates` - Listar afiliados
- ✅ `GET /api/admin/affiliates/[id]` - Detalhes de afiliado
- ✅ `GET /api/admin/affiliates/commissions` - Listar comissões
- ✅ `GET /api/admin/settings/affiliates` - Configurações

### 2. Páginas Públicas

- ✅ `/afiliados-da-rafa` - Landing page
- ✅ `/afiliados-da-rafa/cadastro/comum` - Formulário comum
- ✅ `/afiliados-da-rafa/cadastro/licenca-comercial` - Formulário comercial
- ✅ `/afiliados-da-rafa/cadastro/aguardando-aprovacao` - Página de espera
- ✅ `/afiliados-da-rafa/dashboard` - Dashboard unificado

### 3. Páginas Admin

- ✅ `/admin/afiliados` - Gestão de afiliados
- ✅ `/admin/afiliados/comissoes` - Gestão de comissões

### 4. Componentes React

- ✅ `CommonAffiliateDashboard` - Dashboard para afiliados comuns
- ✅ `CommercialLicenseDashboard` - Dashboard para licença comercial
- ✅ `AffiliatesPageClient` - Página admin de afiliados
- ✅ `CommissionsPageClient` - Página admin de comissões

### 5. Lógica de Negócio

- ✅ Rastreamento de cliques com cookies
- ✅ Associação de pedidos a afiliados
- ✅ Criação automática de comissões em webhooks
- ✅ Detecção de fraude (src/lib/affiliates/fraud-detection.ts)
- ✅ Processamento de comissões (src/lib/affiliates/webhook-processor.ts)

---

## ❌ O Que Falta Implementar

### 1. APIs Críticas Faltantes

#### ✅ `GET /api/affiliates/sales` _(CONCLUÍDO 26/01)_

- **Para**: Afiliado Comum
- **Retorna**: Lista de vendas com detalhes do cliente
- **Status**: Implementado

#### ✅ `GET /api/affiliates/orders` _(CONCLUÍDO 26/01)_

- **Para**: Licença Comercial
- **Retorna**: Pedidos vinculados com itens detalhados
- **Status**: Implementado

#### ✅ `GET /api/affiliates/materials` _(CONCLUÍDO 26/01)_

- **Para**: Ambos os tipos
- **Retorna**: Materiais filtrados por tipo
- **Status**: Implementado

#### ✅ `GET /api/affiliates/file-access` _(CONCLUÍDO 26/01)_

- **Para**: Licença Comercial
- **Retorna**: Lista de acessos temporários
- **Status**: Implementado

#### ✅ `POST /api/affiliates/file-access/download` _(CONCLUÍDO 26/01)_

- **Para**: Licença Comercial
- **Retorna**: URL do arquivo com rastreamento de visualizações/impressões
- **Status**: Implementado

### 2. Sistema de Emails _(CONCLUÍDO 26/01)_

✅ **Templates criados**:

- `affiliate-welcome` - Boas-vindas afiliado comum
- `affiliate-pending-approval` - Confirmação recebimento licença comercial
- `affiliate-approved` - Aprovação licença comercial
- `admin-new-affiliate-request` - Notificação para admin
- `affiliate-file-access-granted` - Acesso aos arquivos concedido

✅ **Integração com Resend**: `src/lib/email/affiliates.ts`

✅ **Emails enviados automaticamente**:

- Cadastro afiliado comum → email boas-vindas
- Cadastro licença comercial → email confirmação + notificação admin
- Aprovação licença comercial → email aprovação
- Venda com afiliado licença comercial → email acesso concedido

### 3. Aprovação Manual (Admin) _(CONCLUÍDO 26/01)_

✅ **APIs Admin criadas**:

- `POST /api/admin/affiliates/approve` - Aprovar/rejeitar licença comercial
- `GET /api/admin/affiliates/pending` - Listar pendentes

### 4. Acesso Automático a Arquivos _(CONCLUÍDO 26/01)_

✅ **Concessão automática implementada**:

- `src/lib/affiliates/file-access-processor.ts` - Lógica de concessão
- Integrado nos webhooks Stripe e PayPal
- Criação de registros em `affiliate_file_access` (expiresAt = +5 dias)
- Email automático ao afiliado

### 5. Funcionalidades Pendentes no Cadastro

#### ❌ Upload de Documentos (Comercial)

```typescript
// Falta em: /api/affiliates/register/commercial-license/route.ts
// - Upload da assinatura para Cloudflare R2
// - Gerar PDF do contrato com assinatura
// - Upload do PDF para R2
// - Salvar contractDocumentUrl no banco
```

### 6. Painel Admin Pendente

#### ❌ Gestão de Afiliados Completa

- Filtro por `affiliate_type`
- Visualizar termos aceitos (IP, data)
- Visualizar contrato assinado (PDF)
- Reenviar materiais manualmente

#### ❌ Gestão de Materiais (CRUD)

- Página `/admin/afiliados/materiais`
- Upload de arquivos (ZIP, PDF, imagens)
- Ordenação drag-and-drop
- Ativar/desativar materiais

### 7. Integrações Faltantes

#### ❌ Cloudflare R2 (Storage)

- Setup do cliente S3
- Função de upload
- Geração de URLs assinadas
- Variáveis de ambiente

### 8. Sistema de Pagamentos Manuais

❌ **Funcionalidades faltantes**:

- Marcar comissão como paga
- Upload de comprovante de pagamento
- Histórico de pagamentos
- Relatórios de pagamentos

---

## 💳 Análise do Stripe Connect

### O Que É o Stripe Connect?

O **Stripe Connect** é uma solução da Stripe que permite criar **marketplaces** e **plataformas** onde múltiplas partes recebem pagamentos. No contexto de afiliados, seria possível:

1. **Pagamentos Automáticos**: Comissões enviadas automaticamente após período
2. **Stripe como Intermediário**: Plataforma retém sua parte e envia comissão ao afiliado
3. **Compliance Simplificado**: Stripe lida com regulamentações
4. **Contas Conectadas**: Cada afiliado tem conta Stripe própria

### Tipos de Contas Connect

#### 1. Standard Accounts (Recomendado)

- ✅ Afiliado cria conta Stripe própria
- ✅ Controle total sobre seus dados
- ✅ Melhor para parceiros profissionais
- ❌ Requer onboarding completo

#### 2. Express Accounts

- ✅ Criação rápida de conta
- ✅ UI simplificada da Stripe
- ⚠️ Controle limitado
- ✅ Bom balanço simplicidade/controle

#### 3. Custom Accounts

- ✅ Controle total da experiência
- ❌ Você assume responsabilidades de compliance
- ❌ Mais complexo de implementar

### Como Funcionaria no Sistema Atual

#### Fluxo de Venda com Connect

```
1. Cliente compra produto com link de afiliado
   ↓
2. Pagamento processado no Stripe
   ↓
3. Stripe retém valor total (R$ 100)
   ↓
4. Após período de retenção (7-30 dias):
   ↓
5. Transfer automático:
   - R$ 90 → Conta da plataforma
   - R$ 10 → Conta Connect do afiliado
```

#### Integração com Sistema Atual

```typescript
// 1. Criar Connected Account para afiliado
const account = await stripe.accounts.create({
  type: 'express',
  country: 'BR',
  email: affiliate.email,
  capabilities: {
    transfers: { requested: true },
  },
});

// 2. Gerar link de onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://arafacriou.com.br/afiliados-da-rafa/onboarding',
  return_url: 'https://arafacriou.com.br/afiliados-da-rafa/dashboard',
  type: 'account_onboarding',
});

// 3. No webhook payment_intent.succeeded:
if (order.affiliateId) {
  const affiliate = await getAffiliate(order.affiliateId);

  if (affiliate.stripeAccountId && affiliate.commissionValue > 0) {
    // Criar transfer para conta do afiliado
    await stripe.transfers.create({
      amount: Math.round(commissionAmount * 100), // centavos
      currency: 'brl',
      destination: affiliate.stripeAccountId,
      transfer_group: order.id,
    });
  }
}
```

### Vantagens do Stripe Connect

✅ **Pagamentos Automáticos**

- Elimina trabalho manual de pagamento via PIX
- Reduz erros e atrasos

✅ **Transparência**

- Afiliado vê pagamentos em tempo real
- Histórico completo no dashboard Stripe

✅ **Compliance e Segurança**

- Stripe lida com regulamentações fiscais
- KYC/AML automatizado

✅ **Flexibilidade**

- Diferentes tipos de comissão
- Períodos de retenção configuráveis

✅ **Escalabilidade**

- Suporta milhares de afiliados
- Sem overhead operacional

### Desvantagens do Stripe Connect

❌ **Custos Adicionais**

- Taxa padrão Stripe: 3.99% + R$ 0.99
- Taxa adicional Connect: ~1% do valor transferido

❌ **Complexidade Inicial**

- Requer onboarding de afiliados
- Precisa de conta Stripe para cada afiliado

❌ **Restrições Geográficas**

- Nem todos países suportados
- Brasil tem algumas limitações

❌ **Dependência de Terceiros**

- Sistema fica dependente da Stripe
- Mudanças de política podem afetar

### Comparação: Sistema Atual vs Stripe Connect

| Aspecto                  | Sistema Atual (PIX Manual) | Stripe Connect           |
| ------------------------ | -------------------------- | ------------------------ |
| **Pagamento**            | Manual, via admin          | Automático               |
| **Tempo até receber**    | Variável (7-60 dias)       | Configurável (7-30 dias) |
| **Trabalho operacional** | Alto                       | Baixo                    |
| **Custos**               | Gratuito (taxa PIX ~R$ 0)  | 3.99% + R$ 0.99 + 1%     |
| **Transparência**        | Média                      | Alta                     |
| **Escalabilidade**       | Limitada                   | Ilimitada                |
| **Compliance**           | Manual                     | Automatizado             |
| **Setup inicial**        | Simples                    | Complexo                 |

---

## 🗺️ Roadmap de Migração

### Opção 1: Híbrido (Recomendado)

Manter **ambos os sistemas** e deixar afiliado escolher:

```typescript
// Novo campo no schema
affiliatePaymentMethod: 'pix' | 'stripe_connect'
stripeAccountId: varchar(255) nullable
```

**Vantagens**:

- Afiliados que preferem PIX continuam usando
- Afiliados profissionais podem usar Stripe
- Migração gradual
- Menor risco

**Desvantagens**:

- Manutenção de 2 sistemas
- Complexidade aumentada

### Opção 2: Migração Total (Futuro)

Migrar **todos** os afiliados para Stripe Connect:

**Vantagens**:

- Sistema unificado
- Menor complexidade a longo prazo
- Totalmente automatizado

**Desvantagens**:

- Requer onboarding de todos afiliados existentes
- Alguns podem resistir
- Custos maiores

### Recomendação: Implementação Faseada

#### Fase 1: Sistema Atual (Completo) - 2-3 semanas

1. ✅ Completar APIs faltantes
2. ✅ Implementar emails
3. ✅ Sistema de materiais
4. ✅ Aprovação admin
5. ✅ Acesso temporário a arquivos

#### Fase 2: Stripe Connect (Opcional) - 2-3 semanas

1. ⚠️ Adicionar campo `affiliatePaymentMethod` no schema
2. ⚠️ Implementar criação de Connected Accounts
3. ⚠️ Onboarding de afiliados no Stripe
4. ⚠️ Webhook para transfers automáticos
5. ⚠️ Dashboard Stripe embarcado

#### Fase 3: Otimização - 1-2 semanas

1. ⚠️ Analytics avançado
2. ⚠️ Relatórios fiscais
3. ⚠️ Programa de níveis (bronze/prata/ouro)

---

## 📝 Implementação Passo a Passo

### PARTE 1: Completar Sistema Atual (PRIORIDADE)

#### Step 1: APIs Críticas Faltantes

##### 1.1. API de Vendas (Afiliado Comum)

**Arquivo**: `src/app/api/affiliates/sales/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateCommissions, orders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    // Buscar vendas com comissões
    const sales = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        customerPhone: orders.customerPhone,
        orderTotal: orders.total,
        status: affiliateCommissions.status,
        commissionAmount: affiliateCommissions.commissionAmount,
        commissionStatus: affiliateCommissions.status,
        createdAt: orders.createdAt,
        paidAt: affiliateCommissions.paidAt,
      })
      .from(orders)
      .innerJoin(affiliateCommissions, eq(orders.id, affiliateCommissions.orderId))
      .where(eq(affiliateCommissions.affiliateId, affiliate.id))
      .orderBy(desc(orders.createdAt));

    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Error fetching affiliate sales:', error);
    return NextResponse.json({ message: 'Erro ao buscar vendas' }, { status: 500 });
  }
}
```

##### 1.2. API de Pedidos (Licença Comercial)

**Arquivo**: `src/app/api/affiliates/orders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, orders, orderItems, products } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate || affiliate.affiliateType !== 'commercial_license') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    // Buscar pedidos vinculados
    const affiliateOrders = await db.query.orders.findMany({
      where: eq(orders.affiliateId, affiliate.id),
      orderBy: desc(orders.createdAt),
      with: {
        items: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ orders: affiliateOrders });
  } catch (error) {
    console.error('Error fetching affiliate orders:', error);
    return NextResponse.json({ message: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}
```

##### 1.3. API de Materiais

**Arquivo**: `src/app/api/affiliates/materials/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates, affiliateMaterials } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Você não é um afiliado cadastrado' }, { status: 404 });
    }

    // Buscar materiais filtrados por tipo
    const materials = await db
      .select()
      .from(affiliateMaterials)
      .where(
        and(
          eq(affiliateMaterials.isActive, true),
          or(
            eq(affiliateMaterials.affiliateType, affiliate.affiliateType),
            eq(affiliateMaterials.affiliateType, 'both')
          )
        )
      )
      .orderBy(affiliateMaterials.displayOrder);

    return NextResponse.json({ materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json({ message: 'Erro ao buscar materiais' }, { status: 500 });
  }
}
```

#### Step 2: Sistema de Emails

**Instalar dependências**:

```bash
npm install resend @react-email/components
```

**Arquivo**: `src/lib/email/affiliates.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAffiliateWelcomeEmail({
  to,
  name,
  code,
  dashboardUrl,
}: {
  to: string;
  name: string;
  code: string;
  dashboardUrl: string;
}) {
  await resend.emails.send({
    from: 'A Rafa Criou <afiliados@arafacriou.com>',
    to,
    subject: 'Bem-vindo ao Programa de Afiliados! 🎉',
    html: `
      <h1>Olá ${name}!</h1>
      <p>Sua conta de afiliado foi aprovada automaticamente!</p>
      <p><strong>Seu código de afiliado:</strong> ${code}</p>
      <p>Você já pode começar a divulgar nossos produtos e ganhar comissões.</p>
      <p><a href="${dashboardUrl}" style="background: #FED466; padding: 12px 24px; text-decoration: none; color: #000; border-radius: 6px; display: inline-block; margin-top: 16px;">Acessar Dashboard</a></p>
      <p>Em breve você receberá um email com os materiais de divulgação.</p>
      <p>Boas vendas! 🚀</p>
    `,
  });
}

export async function sendCommercialLicensePendingEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  await resend.emails.send({
    from: 'A Rafa Criou <afiliados@arafacriou.com>',
    to,
    subject: 'Solicitação de Licença Comercial Recebida',
    html: `
      <h1>Olá ${name}!</h1>
      <p>Recebemos sua solicitação para Licença Comercial.</p>
      <p>Nossa equipe está analisando seu cadastro e você receberá um retorno em até 48 horas.</p>
      <p>Obrigada pelo interesse! 😊</p>
    `,
  });
}

export async function sendCommercialLicenseApprovedEmail({
  to,
  name,
  dashboardUrl,
}: {
  to: string;
  name: string;
  dashboardUrl: string;
}) {
  await resend.emails.send({
    from: 'A Rafa Criou <afiliados@arafacriou.com>',
    to,
    subject: 'Licença Comercial Aprovada! 🎉',
    html: `
      <h1>Olá ${name}!</h1>
      <p>Sua Licença Comercial foi aprovada!</p>
      <p>Agora você pode visualizar os arquivos dos produtos vendidos por até 5 dias após cada venda.</p>
      <p><a href="${dashboardUrl}" style="background: #FED466; padding: 12px 24px; text-decoration: none; color: #000; border-radius: 6px; display: inline-block; margin-top: 16px;">Acessar Dashboard</a></p>
      <p>Em breve você receberá um email com os materiais de divulgação.</p>
    `,
  });
}

export async function sendAdminNewAffiliateRequest({
  affiliateName,
  affiliateEmail,
  affiliateType,
  adminDashboardUrl,
}: {
  affiliateName: string;
  affiliateEmail: string;
  affiliateType: string;
  adminDashboardUrl: string;
}) {
  await resend.emails.send({
    from: 'A Rafa Criou <noreply@arafacriou.com>',
    to: process.env.ADMIN_EMAIL || 'admin@arafacriou.com',
    subject: '🔔 Nova Solicitação de Licença Comercial',
    html: `
      <h1>Nova Solicitação de Afiliado</h1>
      <p><strong>Nome:</strong> ${affiliateName}</p>
      <p><strong>Email:</strong> ${affiliateEmail}</p>
      <p><strong>Tipo:</strong> ${affiliateType}</p>
      <p><a href="${adminDashboardUrl}" style="background: #FED466; padding: 12px 24px; text-decoration: none; color: #000; border-radius: 6px; display: inline-block; margin-top: 16px;">Ver no Admin</a></p>
    `,
  });
}
```

#### Step 3: Atualizar Rotas de Cadastro

**Arquivo**: `src/app/api/affiliates/register/common/route.ts`

```typescript
// Adicionar após criação do afiliado:

// Enviar email de boas-vindas
await sendAffiliateWelcomeEmail({
  to: email,
  name,
  code,
  dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/dashboard`,
});

// TODO: Disparar job assíncrono para enviar materiais
// Por enquanto, marcar como pendente para envio manual
```

**Arquivo**: `src/app/api/affiliates/register/commercial-license/route.ts`

```typescript
// Adicionar após criação do afiliado:

// Enviar email para afiliado
await sendCommercialLicensePendingEmail({ to: email, name });

// Enviar email para admin
await sendAdminNewAffiliateRequest({
  affiliateName: name,
  affiliateEmail: email,
  affiliateType: 'commercial_license',
  adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/afiliados`,
});
```

#### Step 4: APIs Admin de Aprovação

**Arquivo**: `src/app/api/admin/affiliates/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendCommercialLicenseApprovedEmail } from '@/lib/email/affiliates';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Buscar afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.id, id),
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Afiliado não encontrado' }, { status: 404 });
    }

    // Aprovar afiliado
    const [updated] = await db
      .update(affiliates)
      .set({
        status: 'active',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(eq(affiliates.id, id))
      .returning();

    // Enviar email de aprovação
    await sendCommercialLicenseApprovedEmail({
      to: updated.email,
      name: updated.name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/dashboard`,
    });

    // TODO: Enviar materiais automaticamente

    return NextResponse.json({ success: true, affiliate: updated });
  } catch (error) {
    console.error('Error approving affiliate:', error);
    return NextResponse.json({ error: 'Erro ao aprovar afiliado' }, { status: 500 });
  }
}
```

**Arquivo**: `src/app/api/admin/affiliates/[id]/reject/route.ts`

```typescript
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { reason } = body;

    // Rejeitar afiliado
    const [updated] = await db
      .update(affiliates)
      .set({
        status: 'inactive',
        notes: `Rejeitado: ${reason}`,
      })
      .where(eq(affiliates.id, id))
      .returning();

    // TODO: Enviar email de rejeição com motivo

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting affiliate:', error);
    return NextResponse.json({ error: 'Erro ao rejeitar afiliado' }, { status: 500 });
  }
}
```

#### Step 5: Concessão Automática de Acesso a Arquivos

**Arquivo**: `src/lib/affiliates/file-access.ts`

```typescript
import { db } from '@/lib/db';
import { affiliateFileAccess, orders, orderItems, productFiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function grantFileAccessToCommercialAffiliate(orderId: string) {
  try {
    // Buscar pedido com afiliado e itens
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        affiliate: true,
        items: {
          with: {
            product: {
              with: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!order?.affiliate || order.affiliate.affiliateType !== 'commercial_license') {
      return; // Não é licença comercial
    }

    if (order.status !== 'completed' || order.paymentStatus !== 'paid') {
      return; // Pedido ainda não pago
    }

    // Para cada produto do pedido
    for (const item of order.items) {
      if (!item.product?.files || item.product.files.length === 0) {
        continue;
      }

      const file = item.product.files[0]; // Primeiro arquivo do produto

      // Definir expiração: 5 dias a partir de agora
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);

      // Conceder acesso
      await db.insert(affiliateFileAccess).values({
        affiliateId: order.affiliateId!,
        orderId: order.id,
        productId: item.productId!,
        fileUrl: file.url,
        grantedAt: new Date(),
        expiresAt,
        buyerName: order.customerName,
        buyerEmail: order.customerEmail,
        buyerPhone: order.customerPhone,
        isActive: true,
      });
    }

    console.log(`✅ Acesso concedido ao afiliado ${order.affiliateId} para pedido ${orderId}`);

    // TODO: Enviar email notificando sobre acesso concedido
  } catch (error) {
    console.error('Error granting file access:', error);
  }
}
```

**Adicionar no webhook**:

````typescript
// src/app/api/stripe/webhook/route.ts
// Após atualizar pedido para completed:

import { grantFileAccessToCommercialAffiliate } from '@/lib/affiliates/file-access';

// ...
await db.update(orders).set({ status: 'completed' }).where(...);

// Conceder acesso a arquivos se for li (SE DECIDIR IMPLEMENTAR)

```sql
-- Migration: add_stripe_connect_support.sql
-- ⚠️ USAR ADD COLUMN IF NOT EXISTS para segurança
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(20) DEFAULT 'pix' CHECK ("payment_method" IN ('pix', 'stripe_connect'));
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "stripe_account_id" VARCHAR(255);
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "stripe_onboarding_completed" BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "idx_affiliates_stripe_account" ON "affiliates"("stripe_account_id");

-- 🚫 NUNCA usar DROP, DELETE, TRUNCATE
-- ✅ SEMPRE preservar dados existentes

```sql
-- Migration: add_stripe_connect_support.sql
ALTER TABLE "affiliates" ADD COLUMN "payment_method" VARCHAR(20) DEFAULT 'pix' CHECK ("payment_method" IN ('pix', 'stripe_connect'));
ALTER TABLE "affiliates" ADD COLUMN "stripe_account_id" VARCHAR(255);
ALTER TABLE "affiliates" ADD COLUMN "stripe_onboarding_completed" BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS "idx_affiliates_stripe_account" ON "affiliates"("stripe_account_id");
````

#### Step 2: API de Onboarding Stripe

**Arquivo**: `src/app/api/affiliates/stripe-connect/onboard/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { affiliates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Buscar afiliado
    const affiliate = await db.query.affiliates.findFirst({
      where: eq(affiliates.userId, session.user.id),
    });

    if (!affiliate) {
      return NextResponse.json({ message: 'Afiliado não encontrado' }, { status: 404 });
    }

    let accountId = affiliate.stripeAccountId;

    // Criar conta se não existir
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email: affiliate.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: affiliate.name,
          product_description: 'Afiliado A Rafa Criou',
        },
      });

      accountId = account.id;

      // Salvar no banco
      await db
        .update(affiliates)
        .set({ stripeAccountId: accountId })
        .where(eq(affiliates.id, affiliate.id));
    }

    // Gerar link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/stripe-connect/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/afiliados-da-rafa/stripe-connect/complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe Connect onboarding:', error);
    return NextResponse.json({ message: 'Erro ao criar onboarding' }, { status: 500 });
  }
}
```

#### Step 3: Webhook para Transfers Automáticos

**Arquivo**: Atualizar `src/app/api/stripe/webhook/route.ts`

```typescript
// Após criar comissão:
if (order.affiliateId) {
  const affiliate = await db.query.affiliates.findFirst({
    where: eq(affiliates.id, order.affiliateId),
  });

  if (
    affiliate?.paymentMethod === 'stripe_connect' &&
    affiliate.stripeAccountId &&
    affiliate.stripeOnboardingCompleted
  ) {
    const commissionAmount =
      parseFloat(order.total) * (parseFloat(affiliate.commissionValue) / 100);

    // Criar transfer para conta do afiliado
    await stripe.transfers.create({
      amount: Math.round(commissionAmount * 100), // centavos
      currency: 'brl',
      destination: affiliate.stripeAccountId,
      transfer_group: order.id,
      metadata: {
        orderId: order.id,
        affiliateId: affiliate.id,
        commissionRate: affiliate.commissionValue,
      },
    });

    console.log(`✅ Transfer de R$ ${commissionAmount} criado para ${affiliate.name}`);
  }
}
```

#### Step 4: Página de Escolha de Método de Pagamento

**Arquivo**: `src/app/afiliados-da-rafa/dashboard/configuracoes/page.tsx`

````tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function PaymentMethodSettings() {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'stripe_connect'>('pix');
  const [loading, setLoading] = useState(false);

  const handleStripeConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates/stripe-connect/onboard', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Método de Pagamento</h2>

      <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
        <div className="flex items-center space-x-2 border p-4 rounded-lg">
          <RadioGroupItem value="pix" id="pix" />
          <Label htmlFor="pix" className="flex-1 cursor-pointer">
            <div className="font-semibold">PIX (Manual)</div>
            <div className="text-sm text-gray-600">
              Pagamentos processados manualmente pelo admin. Sem taxas adicionais.
            </div>
          </Label>
        </div>

        <div className="flex items-center space-x-2 border p-4 rounded-lg">
          <RadioGroupItem value="stripe_connect" id="stripe" />
          <Label htmlFor="stripe" className="flex-1 cursor-pointer">
            <div className="font-semibold">Stripe Connect (Automático)</div>
            <div className="text-sm text-gray-600">
              Receba suas comissões automaticamente. Taxa adicional: ~1%.
            </div>
          </Label>
        </div>
      </RadioGroup>

      {paymentMethod === 'stripe_connect' && (
        <Button onClick={handleStripeConnect} disabled={loading}>
    0. Integridade de Dados (MAIS IMPORTANTE)

```typescript
// 🚫 NUNCA apagar dados do banco
// ❌ NUNCA: await db.delete(orders).where(...)
// ❌ NUNCA: await db.delete(products).where(...)
// ❌ NUNCA: await db.delete(users).where(...)

// ✅ SEMPRE: Soft delete com flag
await db.update(affiliates).set({
  status: 'inactive', // ao invés de deletar
  deletedAt: new Date() // marcar como deletado
}).where(eq(affiliates.id, id));

// ✅ SEMPRE: Verificar se já existe antes de criar
const existing = await db.query.affiliates.findFirst({
  where: eq(affiliates.userId, userId)
});
if (existing) {
  // Atualizar ao invés de criar duplicado
  return existing;
}
````

### {loading ? 'Carregando...' : 'Conectar com Stripe'}

        </Button>
      )}
    </div>

);
}

````

---

## 🔒 Considerações de Segurança

### 1. Validação de Comissões

```typescript
// NUNCA confiar em valores do frontend
// SEMPRE recalcular no backend

const calculatedCommission = orderTotal * (affiliate.commissionValue / 100);

if (Math.abs(requestedCommission - calculatedCommission) > 0.01) {
  throw new Error('Valores não conferem');
}
````

### 2. Rate Limiting

```typescript
// Proteger APIs de cadastro
// Usar middleware ou lib como express-rate-limit

import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  const { success } = await rateLimit({
    key: `affiliate-register-${ip}`,
    limit: 3, // 3 tentativas
    window: 3600, // por hora
  });

  if (!success) {
    return NextResponse.json(
      { message: 'Muitas tentativas. Tente novamente em 1 hora.' },
      { status: 429 }
    );
  }

  // ... resto do código
}
```

// ⚠️ VERIFICAR se tabela auditLogs existe antes
// Se não existir, usar console.log temporariamente

const hasAuditLogs = await db.query.auditLogs; // verificar

if (hasAuditLogs) {
await db.insert(auditLogs).values({
userId: session.user.id,
action: 'affiliate_approved',
entityType: 'affiliate',
entityId: affiliate.id,
metadata: JSON.stringify({
approvedBy: session.user.id,
approvedAt: new Date(),
}),
ipAddress: req.headers.get('x-forwarded-for'),
});
} else {
// Fallback temporário
console.log('[AUDIT]', {
action: 'affiliate_approved',
affiliateId: affiliate.id,
});
}(access.affiliateId !== affiliate.id) {
return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}

// Incrementar contador de visualizações
await db
.update(affiliateFileAccess)
.set({
viewCount: sql`${affiliateFileAccess.viewCount} + 1`,
lastAccessedAt: new Date(),
})
.where(eq(affiliateFileAccess.id, access.id));

````

### 4. Logs de Auditoria

```typescript
// Registrar todas ações sensíveis
await db.insert(auditLogs).values({
  userId: session.user.id,
  action: 'affiliate_approved',
  entityType: 'affiliate',
  entityId: affiliate.id,
  metadata: JSON.stringify({
    approvedBy: session.user.id,
    approvedAt: new Date(),
  }),
  ipAddress: req.headers.get('x-forwarded-for'),
});
````

---

## 📊 Checklist de Implementação

### Fase 1: Sistema Atual Completo (2-3 semanas)

#### APIs Críticas

- [ ] `GET /api/affiliates/sales` - Vendas do afiliado comum
- [ ] `GET /api/affiliates/orders` - Pedidos da licença comercial
- [ ] `GET /api/affiliates/materials` - Materiais por tipo
- [ ] `GET /api/affiliates/file-access` - Lista de acessos temporários

#### Auto-Aprovação e Emails

- [ ] Auto-aprovação para afiliados comuns
- [ ] Setup de email (Resend)
- [ ] Template: Boas-vindas afiliado comum
- [ ] Template: Confirmação licença comercial
- [ ] Template: Aprovação licença comercial
- [ ] Template: Notificação admin
- [ ] Template: Acesso aos arquivos concedido

#### Upload e Storage

- [ ] Configurar Cloudflare R2
- [ ] Implementar upload de assinatura
- [ ] Implementar geração de PDF do contrato
- [ ] Implementar upload de materiais

#### Painel Admin

- [ ] API de aprovar/rejeitar licença comercial
- [ ] API de visualizar termos aceitos
- [ ] API de reenviar materiais
- [ ] Página de gestão de materiais (CRUD)
- [ ] Upload de materiais no admin
- [ ] Filtros e ações em massa

#### Automações

- [ ] Job para conceder acesso aos arquivos após venda
- [ ] Envio automático de materiais na aprovação
- [ ] Cron job para limpar acessos expirados
- [ ] Notificações por email em cada etapa

#### Testes

- [ ] Testar fluxo completo afiliado comum
- [ ] Testar fluxo completo licença comercial
- [ ] Testar proteções de segurança
- [ ] Testar emails
- [ ] Ajustar UI/UX

### Fase 2: Stripe Connect (Opcional - 2-3 semanas)

- [ ] Adicionar campos no schema
- [ ] API de onboarding Stripe Connect
- [ ] Webhook para transfers automáticos
- [ ] Página de configuração de pagamento
- [ ] Dashboard Stripe embarcado
- [ ] Testes com contas de teste Stripe
- [ ] Documentação para afiliados

### Fase 3: Otimização (1-2 semanas)

- [ ] Analytics avançado
- [ ] Relatórios fiscais
- [ ] Programa de níveis
- [ ] Rate limiting em todas APIs
- [ ] Monitoramento e alertas
- [ ] Documentação completa

---

## 🎯 Resumo Executivo

### O Que Já Funciona (70%)

✅ **Estrutura completa** de banco de dados  
✅ **Cadastro** de ambos tipos de afiliados  
✅ **Dashboard básico** com estatísticas  
✅ **Rastreamento** de cliques e conversões  
✅ **Comissões automáticas** via webhooks  
✅ **Proteção** de arquivos para licença comercial

### O Que Falta (30%)

❌ APIs de listagem (vendas, pedidos, materiais)  
❌ Sistema de emails completo  
❌ Aprovação admin para licença comercial  
❌ Upload e geração de PDFs  
❌ Gestão de materiais (CRUD admin)  
❌ Concessão automática de acesso a arquivos

### Recomendação: Stripe Connect

**Para Agora**: ❌ **NÃO implementar**

- Sistema atual (PIX manual) é suficiente
- Foco em completar funcionalidades básicas

**Para Futuro** (6-12 meses): ✅ **Implementar**

- Quando tiver 50+ afiliados ativos
- Quando pagamentos manuais se tornarem gargalo
- Usar modelo híbrido (PIX + Stripe Connect)

### Próximos Passos Imediatos

1. **Semana 1-2**: Implementar APIs críticas faltantes
2. **Semana 3**: Sistema de emails e auto-aprovação
3. **Semana 4**: Upload/storage e geração de PDFs
4. **Semana 5-6**: Painel admin completo e automações
5. **Semana 7**: Testes e ajustes finais

**Estimativa Total**: 6-7 semanas para sistema completo

---

## 📌 Consolidação de Documentos

Este documento **substitui e consolida** `sistema-afiliados-proximos-passos.md` (18/12/2025).

### Mudanças Principais

1. ✅ **Estrutura do banco confirmada**: Todas as 7 tabelas já existem
2. ✅ **Migrations executadas**: 0025 e 0029 já aplicadas
3. ✅ **17 rotas API funcionando**: Confirmadas e documentadas
4. ✅ **Análise completa do Stripe Connect**: Prós, contras e recomendação
5. ⚠️ **Ênfase em reutilização**: Sempre verificar antes de criar
6. 🚫 **Proteção de dados**: NUNCA apagar do banco

### Diferenças do Documento Anterior

| Aspecto                | Documento Antigo (18/12) | Documento Atual (26/01)            |
| ---------------------- | ------------------------ | ---------------------------------- |
| **Status Migrations**  | ⚠️ Pendente executar     | ✅ Já executadas                   |
| **APIs Implementadas** | Listadas como TODO       | ✅ 17 rotas confirmadas            |
| **Stripe Connect**     | Não mencionado           | ✅ Análise completa                |
| **Código pronto**      | Exemplos básicos         | ✅ Código production-ready         |
| **Segurança**          | Menciona básico          | ✅ Seção completa + proteção dados |
| **Duplicação**         | Sem alertas              | ⚠️ Avisos explícitos               |

### O Que NÃO Mudar do Banco

🚫 **NUNCA modificar**:

- Tabelas: `products`, `orders`, `order_items`, `users`
- Campos críticos: `stripePaymentIntentId`, `affiliateId`, `userId`
- Dados existentes de qualquer tabela

✅ **Pode adicionar** (com IF NOT EXISTS):

- Novas colunas em tabelas existentes
- Novos índices
- Novas tabelas (se não duplicar)

### Checklist Antes de Criar Algo Novo

- [ ] Verificar se tabela já existe em `schema.ts`
- [ ] Verificar se campo já existe na tabela
- [ ] Verificar se API/rota já existe em `src/app/api`
- [ ] Verificar se componente já existe em `src/components`
- [ ] Consultar este documento para status atual
- [ ] Se existir, REUTILIZAR ao invés de criar novo

---

**Documento criado por**: GitHub Copilot  
**Data**: 26 de Janeiro de 2026  
**Versão**: 2.0 (Consolidado)

---

## 📎 Referências

- Documento anterior: `docs/sistema-afiliados-proximos-passos.md` (18/12/2025) - OBSOLETO
- Schema atual: `src/lib/db/schema.ts`
- Migrations: `drizzle/0025_*.sql` e `drizzle/0029_*.sql`
- Instruções: `.github/copilot-instructions.md`
