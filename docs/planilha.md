Perfeito. Dá para implementar tudo isso como uma “planilha web” (tabelas editáveis + cálculos + relatórios/gráficos) dentro do seu site já existente, mantendo o visual que você quiser.

Não consigo abrir o link de referência por aqui, então vou me basear 100% na sua lista e te entregar um blueprint completo (estrutura, campos, regras de cálculo e como organizar no sistema).

---

## 1) Estrutura recomendada no app (menus/seções)

### A) Dashboard (Resumo do mês)

- Saldo inicial (definido pelo usuário por mês)
- Entradas (soma)
- Saídas (soma)
- Saldo atual (calculado)
- Gráficos:
  - Fluxo de caixa diário (linha)
  - Entradas x Saídas por semana/mês (barras)
  - Loja x Pessoal (pizza/barras)

### B) Fundos / Provisionamentos

1. **Contas anuais (guardar mensalmente)**
2. **Investimentos (guardar mensalmente)**

Ambos com:

- Lista de “metas/fundos”
- Controle mensal de “guardou? sim/não”
- Indicador de atraso (meses não guardados)
- Progresso (quanto já foi provisionado vs meta)

### C) Loja

1. **Entradas automáticas (por site/afiliação)**
2. **Contas mensais (fixas)**
3. **Contas variáveis**

### D) Pessoal

1. **Contas pessoais mensais**
2. **Contas pessoais dia a dia**

### E) Relatórios

- Total gastos loja e pessoal + gráfico comparativo
- Formas de pagamento mais usadas + gráfico
- Tabela de gastos por categoria (pivot)
- “Onde mais gastei” (ranking) — para isso é essencial ter um campo “Descrição/Fornecedor/Loja”

---

## 2) Modelo de dados (campos) — o mais eficiente

A forma mais sólida é **unificar tudo em uma tabela de lançamentos** (tipo livro-caixa) e “enxergar” isso em telas separadas por filtros (Loja/Pessoal, Fixo/Variável, Entrada/Saída etc.). Isso evita duplicação e facilita os relatórios.

### Tabela: `transactions` (lançamentos)

Campos essenciais:

- `id`
- `date` (data do lançamento/pagamento previsto)
- `type` = `INCOME` | `EXPENSE`
- `scope` = `STORE` | `PERSONAL`
- `recurrence` = `ONE_OFF` | `MONTHLY` | `ANNUAL` (opcional)
- `expense_kind` = `FIXED` | `VARIABLE` | `DAILY` (para saídas)
- `category_id`
- `description` (ex.: “Hospedagem”, “Mercado”, “Conta de luz”, “Shopee afiliado”)
- `payment_method` = `PIX` | `CARD` | `BOLETO` | `CASH` | etc.
- `installments_total` (ex.: 12)
- `installment_number` (ex.: 3) **(se parcelado)**
- `amount_total` (valor cheio, quando fizer sentido)
- `amount_monthly` (valor da parcela/mensal)
- `amount` (valor efetivo do lançamento daquela linha — normalmente igual a `amount_monthly`)
- `paid` = true/false
- `paid_at` (opcional)

> Parcelamento: você pode criar 12 linhas automaticamente (uma por mês), já com `installment_number` e `amount`.

### Tabela: `monthly_balance` (saldo inicial por mês)

- `month` (YYYY-MM)
- `opening_balance` (saldo inicial informado)
- (opcional) `closing_balance_locked` se quiser “fechar mês”

### Tabelas auxiliares

- `categories` (com `scope` STORE/PERSONAL/BOTH e cor/ícone)
- `funds` (para contas anuais e investimentos)
- `fund_contributions` (controle “guardou? sim/não” por mês)

---

## 3) Fundos (contas anuais e investimentos)

### Tabela: `funds`

- `id`
- `fund_type` = `ANNUAL_BILL` | `INVESTMENT`
- `category_id`
- `title` (ex.: “IPTU”, “Contador anual”, “Reserva de investimento”)
- `start_date`
- `end_date` (ou `due_date` no caso anual)
- `total_amount`
- `monthly_amount` (pode ser calculado automaticamente, mas editável)
- `active`

### Tabela: `fund_contributions`

- `fund_id`
- `month` (YYYY-MM)
- `expected_amount` (normalmente `monthly_amount`)
- `saved` (sim/não)
- `saved_amount` (se quiser permitir parcial)
- `saved_at`

Regras úteis:

- Progresso do fundo = soma(`saved_amount`) / `total_amount`
- Atraso = meses até hoje com `saved = não`
- Indicador: “Você deveria ter guardado X até agora; guardou Y; falta Z”.

---

## 4) Cálculos (o que o sistema precisa computar)

### Saldo do mês

Para um mês `M`:

- **Entradas(M)** = Σ `amount` onde `type=INCOME` e `date` dentro do mês
- **Saídas(M)** = Σ `amount` onde `type=EXPENSE` e `date` dentro do mês
- **Saldo inicial(M)** = `opening_balance` daquele mês
- **Saldo atual(M)** = `Saldo inicial(M) + Entradas(M) - Saídas(M)`

Você pode ter um filtro adicional:

- considerar apenas `paid=true` (visão “realizado”)
- considerar tudo (visão “previsto”)

### Totais “Loja x Pessoal”

- Gastos Loja(M) = Σ despesas `scope=STORE`
- Gastos Pessoal(M) = Σ despesas `scope=PERSONAL`

### Formas de pagamento mais usadas

- ranking por **contagem** e/ou por **valor total**:
  - Σ `amount` por `payment_method`

### Gastos por categoria

- Σ `amount` por `category_id` (filtrando despesas)

### “Onde mais gastei”

- Σ `amount` por `description` (ou por `merchant`, se você preferir criar esse campo)

---

## 5) Telas/tabelas exatamente como você listou (com o mínimo de campos)

Abaixo está o mapeamento 1:1 do que você pediu:

### Entradas da loja automaticamente

Tabela (INCOME + STORE):

- Data
- Site/Afiliação (descrição)
- Valor total do dia (amount)
- Observação (opcional)

Implementação “automática” (opções):

- Integração via API (se existir)
- Importação CSV (muito comum e rápido)
- Lançamento manual (fallback)

### Contas da loja mensais (fixas)

Tabela (EXPENSE + STORE + FIXED):

- Data de pagamento
- Categoria
- Forma de pagamento
- Parcelas (se houver)
- Valor total
- Valor mensal (parcela)
- Pago? (Sim/Não)
- TOTAL (rodapé: soma do mês / soma em aberto)

### Contas variáveis da loja

Tabela (EXPENSE + STORE + VARIABLE):

- mesmos campos acima

### Contas pessoais mensais

Tabela (EXPENSE + PERSONAL + FIXED):

- mesmos campos acima

### Contas pessoais dia a dia

Tabela (EXPENSE + PERSONAL + DAILY):

- Data de pagamento
- Categoria
- Forma de pagamento
- Valor
- Pago? (Sim/Não)
- TOTAL

---

## 6) UX que deixa isso “cara de planilha”, mas com poder de app

- Tabelas com edição inline (clicou, editou, salvou)
- Atalhos: Enter para próxima célula, setas, copiar/colar linhas
- Filtros por mês, categoria, escopo (Loja/Pessoal), pago (Sim/Não), forma de pagamento
- Botão “Marcar como pago” em massa
- Rodapé com totais dinâmicos (Total do filtro atual)
- Exportar CSV por tela

---

## 7) Implementação técnica (se você estiver em NextJS)

Um stack típico e muito eficiente para isso:

- UI: NextJS + Tailwind + shadcn/ui
- Tabela: TanStack Table (com edição)
- Gráficos: Recharts (rápido para dashboards)
- Banco: Postgres (Neon/Supabase) + Drizzle ORM
- Validação: Zod
- Persistência: Server Actions / API Routes

---

## 8) O “pacote de funcionalidades” (checklist de desenvolvimento)

1. CRUD de categorias
2. CRUD de lançamentos (transactions)
3. Parcelamento automático (gerar N lançamentos futuros)
4. Controle de saldo inicial por mês
5. Dashboard com filtros (mês / realizado vs previsto)
6. Módulo Fundos (contas anuais + investimentos) com “guardou sim/não” por mês
7. Relatórios (loja/pessoal, forma pgto, categoria, top gastos)
8. Importador CSV para entradas automáticas (opcional, mas altamente recomendado)

---

## 9) Integração com o Sistema A-Rafa-Criou (E-commerce existente) + Afiliados

### 🎯 APROVEITAMENTO DO BANCO DE DADOS ATUAL

O seu site já possui um sistema robusto de vendas **E AFILIAÇÃO**. **NÃO CRIE DUPLICIDADE**. Use os dados que já existem:

#### Tabelas existentes que serão aproveitadas:

##### 📦 `orders` (Pedidos/Vendas)

Campos relevantes para a planilha:

- `id`, `userId`, `email`
- `status` → filtrar apenas `completed` para entradas confirmadas
- `total` → valor da venda (já convertido para a moeda)
- `currency` → moeda da transação (BRL, USD, EUR, MXN)
- `paymentProvider` → stripe, paypal, pix (já é sua "forma de pagamento")
- `paymentStatus` → confirmation do pagamento
- `affiliateId`, `affiliateLinkId` → para rastreamento de comissões
- `couponCode`, `discountAmount` → descontos aplicados
- `paidAt` → data de pagamento confirmado
- `createdAt` → data do pedido

##### 🛍️ `order_items` (Itens dos pedidos)

- `productId`, `variationId` → qual produto foi vendido
- `name` → snapshot do nome (histórico)
- `price`, `quantity`, `total` → valores

##### 👥 `affiliates` (Afiliados)

Sistema completo com dois tipos:

- **common** (comissão por venda)
- **commercial_license** (acesso temporário a arquivos)

Campos importantes:

- `id`, `userId`, `code`, `name`, `email`, `phone`
- `affiliateType` → common ou commercial_license
- `status` → active, inactive, suspended
- `commissionType`, `commissionValue` → regra de comissão
- `pixKey`, `bankName`, `bankAccount` → dados para pagamento
- `totalClicks`, `totalOrders`, `totalRevenue` → estatísticas
- `totalCommission`, `pendingCommission`, `paidCommission` → financeiro
- `termsAccepted`, `contractSigned` → compliance
- `materialsSent`, `autoApproved` → controle de acesso

##### 💰 `affiliate_commissions` (Comissões)

Comissões a pagar (são SAÍDAS da loja):

- `affiliateId`, `orderId`, `linkId`
- `orderTotal`, `commissionRate`, `commissionAmount`
- `status` → pending, approved, paid, cancelled
- `approvedBy`, `approvedAt`, `paidAt`
- `paymentMethod`, `paymentProof` → controle de pagamento
- `currency` → BRL, USD, EUR, MXN

##### 🔗 `affiliate_links` (Links de Afiliação)

- `id`, `affiliateId`, `productId`
- `url`, `shortCode` → links rastreáveis
- `clicks`, `conversions`, `revenue` → métricas

##### 📊 `affiliate_clicks` (Rastreamento de Cliques)

- `affiliateId`, `linkId`, `orderId`
- `ip`, `userAgent`, `referer`, `country`, `deviceType`
- `converted` → se resultou em venda
- `clickedAt` → timestamp

##### 📁 `affiliate_materials` (Materiais para Afiliados)

- `title`, `description`, `fileUrl`, `fileName`
- `affiliateType` → common, commercial_license, both
- `isActive`, `displayOrder`

##### 🔓 `affiliate_file_access` (Acesso Temporário - Commercial License)

- `affiliateId`, `orderId`, `productId`
- `fileUrl`, `grantedAt`, `expiresAt` → 5 dias de acesso
- `viewCount`, `printCount` → controle de uso
- `buyerName`, `buyerEmail`, `buyerPhone` → dados do comprador

#### 🔗 Mapeamento automático para a planilha

### A) Entradas automáticas da loja (VENDAS DO SITE)

**NÃO CRIAR NOVA TABELA**. Criar uma VIEW/QUERY que busca de `orders`:

```sql
SELECT
  DATE(paid_at) as date,
  payment_provider as source, -- "Stripe", "PayPal", "PIX"
  SUM(total) as daily_total,
  COUNT(*) as order_count,
  currency
FROM orders
WHERE status = 'completed'
  AND paid_at >= '2025-01-01' -- filtro por período
GROUP BY DATE(paid_at), payment_provider, currency
ORDER BY date DESC
```

Implementação no código:

- Criar query helper em `/src/lib/db/financial.ts`
- Endpoint: `GET /api/financial/income` → retorna vendas agrupadas
- Dashboard consome essa API

**Campos na tela "Entradas da Loja":**

- Data (paid_at agrupado por dia)
- Origem (Stripe/PayPal/PIX/MercadoPago)
- Qtd. Pedidos
- Valor BRL (converter usando exchange rates)
- Valor Original (se USD/EUR/MXN)
- Status: sempre "Recebido" (já que veio de orders completed)

### B) Comissões de Afiliados (SAÍDA da loja)

**JÁ EXISTE A TABELA**: `affiliate_commissions`

Mapeamento direto para despesas:

- `type` = EXPENSE
- `scope` = STORE
- `category` = "Comissões de Afiliados" (criar categoria)
- `date` = `approvedAt` ou `paidAt` ou `createdAt`
- `amount` = `commissionAmount`
- `paid` = `status === 'paid'`
- `description` = "Comissão - ${affiliate.name} - Pedido #${order_id}"
- `payment_method` = `paymentMethod` (PIX, transferência)
- `affiliate_id` = referência ao afiliado
- `affiliate_type` = `common` ou `commercial_license`

Query:

```sql
SELECT
  ac.id,
  ac.created_at as date,
  ac.approved_at,
  ac.paid_at,
  ac.commission_amount as amount,
  ac.currency,
  ac.status,
  ac.order_id,
  ac.affiliate_id,
  a.name as affiliate_name,
  a.affiliate_type,
  a.email as affiliate_email,
  ac.payment_method,
  ac.payment_proof
FROM affiliate_commissions ac
JOIN affiliates a ON a.id = ac.affiliate_id
WHERE ac.created_at >= '2025-01-01'
ORDER BY ac.created_at DESC
```

### C) Métricas de Afiliados (para dashboard)

**Totais por tipo de afiliado:**

```sql
SELECT
  a.affiliate_type,
  COUNT(DISTINCT a.id) as total_affiliates,
  COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_affiliates,
  SUM(ac.commission_amount) as total_commissions,
  SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END) as pending_commissions,
  SUM(CASE WHEN ac.status = 'paid' THEN ac.commission_amount ELSE 0 END) as paid_commissions
FROM affiliates a
LEFT JOIN affiliate_commissions ac ON ac.affiliate_id = a.id
GROUP BY a.affiliate_type
```

**Top afiliados (mais comissões):**

```sql
SELECT
  a.name,
  a.affiliate_type,
  a.email,
  COUNT(ac.id) as total_sales,
  SUM(ac.order_total) as total_revenue,
  SUM(ac.commission_amount) as total_commission,
  SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END) as pending,
  SUM(CASE WHEN ac.status = 'paid' THEN ac.commission_amount ELSE 0 END) as paid
FROM affiliates a
JOIN affiliate_commissions ac ON ac.affiliate_id = a.id
WHERE ac.created_at >= '2025-01-01'
GROUP BY a.id, a.name, a.affiliate_type, a.email
ORDER BY total_commission DESC
LIMIT 10
```

**Acessos temporários (Commercial License):**

```sql
SELECT
  afa.id,
  afa.granted_at,
  afa.expires_at,
  afa.view_count,
  afa.print_count,
  a.name as affiliate_name,
  p.name as product_name,
  afa.buyer_name,
  afa.buyer_email,
  CASE
    WHEN afa.expires_at < NOW() THEN 'expired'
    WHEN afa.is_active = false THEN 'revoked'
    ELSE 'active'
  END as status
FROM affiliate_file_access afa
JOIN affiliates a ON a.id = afa.affiliate_id
JOIN products p ON p.id = afa.product_id
WHERE afa.granted_at >= '2025-01-01'
ORDER BY afa.granted_at DESC
```

### D) Relatórios com dados reais

**Total de vendas por categoria de produto:**

```sql
SELECT
  c.name as category,
  COUNT(DISTINCT o.id) as orders,
  SUM(oi.total) as revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status = 'completed'
  AND o.paid_at BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY c.name
ORDER BY revenue DESC
```

**Vendas por forma de pagamento:**

```sql
SELECT
  payment_provider,
  COUNT(*) as transactions,
  SUM(total) as total_amount,
  AVG(total) as avg_ticket
FROM orders
WHERE status = 'completed'
  AND paid_at BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY payment_provider
```

---

## 10) Nova Estrutura de Tabelas (APENAS O QUE FALTA)

### ✅ O que NÃO precisa criar (JÁ EXISTE):

- ❌ Vendas/entradas → usar `orders`
- ❌ Comissões afiliados → usar `affiliate_commissions`
- ❌ Dados de afiliados → usar `affiliates`
- ❌ Links de afiliação → usar `affiliate_links`
- ❌ Rastreamento de cliques → usar `affiliate_clicks`
- ❌ Materiais para afiliados → usar `affiliate_materials`
- ❌ Acessos temporários → usar `affiliate_file_access`
- ❌ Categorias de produtos → usar `categories`
- ❌ Usuários → usar `users`

### ✨ O que PRECISA criar (NOVO):

#### Tabela: `financial_transactions` (despesas e outras entradas)

```typescript
export const financialTransactions = pgTable('financial_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: timestamp('date').notNull(), // data do lançamento
  type: varchar('type', { length: 20 }).notNull(), // INCOME | EXPENSE
  scope: varchar('scope', { length: 20 }).notNull(), // STORE | PERSONAL
  recurrence: varchar('recurrence', { length: 20 }), // ONE_OFF | MONTHLY | ANNUAL
  expenseKind: varchar('expense_kind', { length: 20 }), // FIXED | VARIABLE | DAILY

  categoryId: uuid('category_id').references(() => financialCategories.id),
  description: varchar('description', { length: 500 }).notNull(),
  merchant: varchar('merchant', { length: 255 }), // Loja/fornecedor

  paymentMethod: varchar('payment_method', { length: 50 }), // PIX | CARD | BOLETO | Stripe | PayPal

  // Parcelamento
  installmentsTotal: integer('installments_total'),
  installmentNumber: integer('installment_number'),
  amountTotal: decimal('amount_total', { precision: 10, scale: 2 }),
  amountMonthly: decimal('amount_monthly', { precision: 10, scale: 2 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),

  paid: boolean('paid').default(false).notNull(),
  paidAt: timestamp('paid_at'),

  // Relacionamento com vendas (se for referente a uma despesa de uma venda específica)
  orderId: uuid('order_id').references(() => orders.id),

  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Tabela: `financial_categories` (categorias de despesas/entradas)

```typescript
export const financialCategories = pgTable('financial_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  scope: varchar('scope', { length: 20 }).notNull(), // STORE | PERSONAL | BOTH
  color: varchar('color', { length: 7 }), // hex color
  icon: varchar('icon', { length: 50 }), // nome do ícone
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### Tabela: `monthly_balances` (saldo inicial por mês)

```typescript
export const monthlyBalances = pgTable('monthly_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  month: varchar('month', { length: 7 }).notNull().unique(), // YYYY-MM
  scope: varchar('scope', { length: 20 }).notNull(), // STORE | PERSONAL
  openingBalance: decimal('opening_balance', { precision: 10, scale: 2 }).notNull(),
  closingBalanceLocked: decimal('closing_balance_locked', { precision: 10, scale: 2 }),
  isLocked: boolean('is_locked').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Tabela: `funds` (contas anuais e investimentos)

```typescript
export const funds = pgTable('funds', {
  id: uuid('id').defaultRandom().primaryKey(),
  fundType: varchar('fund_type', { length: 20 }).notNull(), // ANNUAL_BILL | INVESTMENT
  categoryId: uuid('category_id').references(() => financialCategories.id),
  title: varchar('title', { length: 255 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  dueDate: timestamp('due_date'), // para contas anuais
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  monthlyAmount: decimal('monthly_amount', { precision: 10, scale: 2 }).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Tabela: `fund_contributions` (controle de guardado mensal)

```typescript
export const fundContributions = pgTable('fund_contributions', {
  id: uuid('id').defaultRandom().primaryKey(),
  fundId: uuid('fund_id')
    .notNull()
    .references(() => funds.id, { onDelete: 'cascade' }),
  month: varchar('month', { length: 7 }).notNull(), // YYYY-MM
  expectedAmount: decimal('expected_amount', { precision: 10, scale: 2 }).notNull(),
  saved: boolean('saved').default(false).notNull(),
  savedAmount: decimal('saved_amount', { precision: 10, scale: 2 }),
  savedAt: timestamp('saved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 11) Estrutura de pastas recomendada

```
src/
├── app/
│   ├── financeiro/               # Nova seção - APENAS arafacriou@gmail.com
│   │   ├── page.tsx              # Dashboard
│   │   ├── loja/
│   │   │   ├── entradas/page.tsx    # Vendas (READ-ONLY de orders)
│   │   │   ├── despesas/page.tsx    # Despesas da loja
│   │   │   └── comissoes/page.tsx   # Comissões (READ-ONLY de affiliate_commissions)
│   │   ├── pessoal/
│   │   │   ├── despesas-fixas/page.tsx
│   │   │   └── despesas-diarias/page.tsx
│   │   ├── fundos/
│   │   │   ├── contas-anuais/page.tsx
│   │   │   └── investimentos/page.tsx
│   │   ├── afiliados/           # NOVO
│   │   │   ├── page.tsx            # Visão geral (métricas, gráficos)
│   │   │   ├── comum/page.tsx      # Afiliados common (comissões)
│   │   │   ├── licenca/page.tsx    # Afiliados commercial_license
│   │   │   └── acessos/page.tsx    # Acessos temporários ativos
│   │   └── relatorios/page.tsx
│   └── api/
│       └── financial/
│           ├── income/route.ts          # GET vendas de orders
│           ├── expenses/route.ts        # CRUD financial_transactions
│           ├── commissions/route.ts     # GET affiliate_commissions + stats
│           ├── affiliates/              # NOVO
│           │   ├── stats/route.ts          # Estatísticas de afiliados
│           │   ├── top-performers/route.ts # Top afiliados
│           │   └── file-access/route.ts    # Acessos temporários ativos
│           ├── categories/route.ts      # CRUD financial_categories
│           ├── balances/route.ts        # CRUD monthly_balances
│           ├── funds/route.ts           # CRUD funds
│           └── reports/route.ts         # Relatórios agregados
├── components/
│   └── financial/
│       ├── IncomeTable.tsx              # Tabela de vendas
│       ├── ExpenseTable.tsx             # Tabela de despesas
│       ├── FundCard.tsx                 # Card de fundo
│       └── DashboardCharts.tsx          # Gráficos
└── lib/
    └── db/
        └── financial.ts                 # Queries helpers
```

---

## 12) Queries Helpers (src/lib/db/financial.ts)

```typescript
import { db } from '@/lib/db';
import { orders, orderItems, affiliateCommissions, financialTransactions } from '@/lib/db/schema';
import { eq, and, gte, lte, sum, count } from 'drizzle-orm';

/**
 * Buscar vendas (entradas) de um período
 */
export async function getIncome(startDate: Date, endDate: Date) {
  return await db
    .select({
      date: orders.paidAt,
      provider: orders.paymentProvider,
      amount: orders.total,
      currency: orders.currency,
      orderId: orders.id,
      status: orders.status,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'completed'),
        gte(orders.paidAt, startDate),
        lte(orders.paidAt, endDate)
      )
    )
    .orderBy(orders.paidAt);
}

/**
 * Buscar comissões (saídas) de um período
 */
export async function getCommissions(startDate: Date, endDate: Date) {
  return await db
    .select()
    .from(affiliateCommissions)
    .where(
      and(gte(affiliateCommissions.dueDate, startDate), lte(affiliateCommissions.dueDate, endDate))
    )
    .orderBy(affiliateCommissions.dueDate);
}

/**
 * Total de vendas por método de pagamento
 */
export async function getSalesByPaymentMethod(month: string) {
  // month formato: "2025-01"
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  return await db
    .select({
      paymentProvider: orders.paymentProvider,
      totalAmount: sum(orders.total),
      orderCount: count(orders.id),
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'completed'),
        gte(orders.paidAt, startDate),
        lte(orders.paidAt, endDate)
      )
    )
    .groupBy(orders.paymentProvider);
}

/**
 * Calcular saldo do mês
 */
export async function getMonthBalance(month: string, scope: 'STORE' | 'PERSONAL') {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

  // Entradas: apenas para STORE vêm de orders
  let income = 0;
  if (scope === 'STORE') {
    const sales = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          gte(orders.paidAt, startDate),
          lte(orders.paidAt, endDate)
        )
      );
    income = Number(sales[0]?.total || 0);
  }

  // Saídas: de financial_transactions
  const expenses = await db
    .select({ total: sum(financialTransactions.amount) })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.type, 'EXPENSE'),
        eq(financialTransactions.scope, scope),
        gte(financialTransactions.date, startDate),
        lte(financialTransactions.date, endDate)
      )
    );
  const totalExpenses = Number(expenses[0]?.total || 0);

  return {
    income,
    expenses: totalExpenses,
    balance: income - totalExpenses,
  };
}
```

---

## 13) Evitando duplicidade - Checklist Final

✅ **Vendas/Entradas da Loja** → Ler de `orders` (já existe)  
✅ **Comissões** → Ler de `affiliate_commissions` (já existe)  
✅ **Categorias de produtos** → `categories` (já existe)  
✅ **Usuários/Clientes** → `users` (já existe)

⚠️ **Despesas da loja/pessoal** → Criar `financial_transactions` (NOVO)  
⚠️ **Categorias financeiras** → Criar `financial_categories` (NOVO)  
⚠️ **Saldo inicial** → Criar `monthly_balances` (NOVO)  
⚠️ **Fundos/Investimentos** → Criar `funds` e `fund_contributions` (NOVO)

---

## 14) Migração segura (passo a passo)

1. **Criar schema no Drizzle**
   - Adicionar novas tabelas em `src/lib/db/schema.ts`
   - Rodar `npm run db:generate` → gera SQL
   - Rodar `npm run db:push` → aplica no banco

2. **Criar queries helpers**
   - Criar arquivo `src/lib/db/financial.ts`
   - Implementar funções de leitura (getIncome, getCommissions, etc.)

3. **Criar API routes**
   - `/api/financial/income` → READ-ONLY de orders
   - `/api/financial/commissions` → READ-ONLY de affiliate_commissions
   - `/api/financial/expenses` → CRUD de financial_transactions

4. **Criar interfaces/UI**
   - Dashboard com gráficos
   - Tabelas editáveis (TanStack Table)
   - Filtros por mês/categoria/pago

5. **Testar em ambiente local**
   - Verificar que não quebra nada existente
   - Validar que dados de vendas estão corretos
   - Testar cálculos de saldo

6. **Deploy gradual**
   - Deploy das migrations
   - Deploy das APIs
   - Deploy do frontend
   - Monitorar logs

---

## 16) Segurança e Permissões - RESTRIÇÃO EXTREMA

- ⚠️ **CRITICAL**: Rota `/financeiro` deve ser APENAS para `arafacriou@gmail.com`
- **NENHUM outro admin pode acessar**, mesmo com `role='admin'`
- Validar `session.user.email === 'arafacriou@gmail.com'` em todas as páginas
- Todas as APIs em `/api/financial/*` devem verificar email exato
- Dados de vendas e comissões são ultra-sensíveis: nunca expor
- Logs de auditoria para alterações em saldo/fundos/comissões

```typescript
// Middleware de proteção EXTREMA (app/financeiro/layout.tsx)
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';

const ALLOWED_EMAIL = 'arafacriou@gmail.com';

export default async function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Bloquear TODOS exceto o email específico
  if (!session || session.user?.email !== ALLOWED_EMAIL) {
    redirect('/'); // ou /403
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            🔒 Área restrita - Acesso exclusivo financeiro
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

```typescript
// Helper de validação (lib/auth/financial-guard.ts)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

const ALLOWED_EMAIL = 'arafacriou@gmail.com';

export async function validateFinancialAccess(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.email === ALLOWED_EMAIL;
}

export async function requireFinancialAccess() {
  const hasAccess = await validateFinancialAccess();
  if (!hasAccess) {
    throw new Error('Acesso negado: área financeira restrita');
  }
}

// Uso em API routes:
export async function GET(req: NextRequest) {
  await requireFinancialAccess();
  // ... resto do código
}
```

---

## 16) Próximos Passos Recomendados

1. ✅ Revisar este documento com a equipe
2. ✅ Criar branch `feature/financial-module`
3. ✅ Implementar schema (migrations)
4. ✅ Implementar queries helpers
5. ✅ Criar API /financial/income (leitura de orders)
6. ✅ Criar dashboard básico
7. ✅ Testar localmente
8. ✅ Deploy em staging
9. ✅ Validar com dados reais
10. ✅ Deploy em produção

**Estimativa**: 3-5 dias de desenvolvimento full-time para MVP funcional.
