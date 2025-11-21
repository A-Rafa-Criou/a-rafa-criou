# 💰 Sistema de Comissões Multi-Moeda - Implementação Completa

## 🎯 Problemas Resolvidos

### 1. ❌ Problema: Valores em moeda errada

**Antes:** Todas as comissões eram exibidas em "R$" mesmo quando a compra foi feita em USD, EUR ou MXN.

**Depois:** ✅ Cada comissão mostra o valor na moeda em que foi comprada (R$, $, €, MXN$).

### 2. ❌ Problema: Afiliado não recebia notificação de pagamento

**Antes:** Admin aprovava e marcava como paga, mas afiliado não era notificado.

**Depois:** ✅ E-mail automático enviado quando comissão é marcada como paga.

---

## 📋 Mudanças Implementadas

### Arquivos Criados

#### 1. **src/lib/currency-helpers.ts** (NOVO)

Helper para formatação de moedas com símbolos corretos.

```typescript
// Funções disponíveis:
getCurrencySymbol('BRL') → 'R$'
getCurrencySymbol('USD') → '$'
getCurrencySymbol('EUR') → '€'
getCurrencySymbol('MXN') → 'MXN$'

formatCurrency(100, 'USD') → '$ 100.00'
formatCurrency(50.5, 'EUR') → '€ 50.50'
```

**Uso:**

```typescript
import { formatCurrency } from '@/lib/currency-helpers';

const valor = formatCurrency(commission.amount, commission.currency);
// Se currency = 'USD' e amount = 49.99 → "$ 49.99"
```

---

#### 2. **src/emails/commission-paid.tsx** (NOVO)

Template de e-mail para notificar afiliado quando comissão é paga.

**Conteúdo:**

- 💰 Título chamativo: "Comissão Paga!"
- Valor na moeda correta (R$, $, €, MXN$)
- Método de pagamento (PIX, Transferência)
- ID do pedido referente
- Observações do admin (opcional)
- Link para comprovante (se fornecido)

---

### Arquivos Modificados

#### 3. **src/components/admin/CommissionsPageClient.tsx**

✅ **Exibição de moedas corrigida**

**Antes:**

```tsx
R$ {parseFloat(commission.commissionAmount).toFixed(2)}
R$ {parseFloat(commission.orderTotal).toFixed(2)}
```

**Depois:**

```tsx
{
  formatCurrency(commission.commissionAmount, commission.currency);
}
{
  formatCurrency(commission.orderTotal, commission.currency);
}
```

**Resultado Visual:**

- Comissão de venda em USD: `$ 9.99`
- Comissão de venda em EUR: `€ 8.50`
- Comissão de venda em BRL: `R$ 45.00`
- Comissão de venda em MXN: `MXN$ 199.00`

**Interface atualizada:**

```typescript
interface Commission {
  // ... outros campos
  currency: Currency; // 🔄 NOVO: 'BRL' | 'USD' | 'EUR' | 'MXN'
}
```

---

#### 4. **src/components/affiliates/AffiliateDashboard.tsx**

✅ **Dashboard do afiliado mostra moedas corretas**

**Antes:**

```tsx
R$ {parseFloat(commission.commissionAmount).toFixed(2)}
```

**Depois:**

```tsx
{
  formatCurrency(commission.commissionAmount, commission.currency);
}
```

**Benefício:** Afiliados que vendem para clientes internacionais veem valores corretos.

---

#### 5. **src/app/api/affiliates/dashboard/route.ts**

✅ **API retorna campo `currency`**

**Adicionado:**

```typescript
commissions: commissions.map(commission => ({
  // ... outros campos
  currency: commission.currency || 'BRL', // 🔄 NOVO
}));
```

---

#### 6. **src/app/api/admin/affiliates/commissions/[id]/route.ts**

✅ **Envio de e-mail automático ao marcar como paga**

**Novo comportamento:**

```typescript
// Quando admin clica em "Marcar como Pago"
if (status === 'paid' && oldStatus === 'approved') {
  // 1. Atualiza saldo do afiliado
  // 2. Busca dados do afiliado
  // 3. Renderiza template de e-mail
  // 4. Envia e-mail via Resend/Gmail
  // 5. Loga sucesso/erro
}
```

**E-mail enviado contém:**

- Assunto: `💰 Comissão Paga - USD 49.99`
- Nome do afiliado
- Valor na moeda correta
- Método de pagamento (PIX, Transferência)
- ID do pedido
- Observações/comprovante (se houver)

**Fallback:** Se e-mail falhar, não bloqueia o update da comissão.

---

## 🧪 Como Testar

### Teste 1: Exibição de Moedas

1. **Fazer venda em USD:**
   - Acessar `http://localhost:3000?ref=eduardosod`
   - Comprar produto com **Stripe** (USD)
   - Aguardar webhook confirmar pagamento

2. **Verificar comissão:**
   - Acessar `/admin/afiliados/comissoes`
   - Comissão deve mostrar: `$ 9.99` (não `R$ 9.99`)
   - Valor da venda deve mostrar: `$ 49.99`

3. **Dashboard do afiliado:**
   - Acessar `/afiliado`
   - Comissões devem mostrar moeda correta
   - Ex: `$ 9.99` para vendas USD, `€ 8.50` para vendas EUR

---

### Teste 2: Notificação de Pagamento

**Pré-requisitos:**

- Configurar `RESEND_API_KEY` ou `GMAIL_USER + GMAIL_APP_PASSWORD` no `.env`
- Ter e-mail válido no cadastro do afiliado

**Passos:**

1. **Aprovar comissão:**
   - Acessar `/admin/afiliados/comissoes`
   - Clicar em **✓** (aprovar) em uma comissão pendente
   - Status muda para "Aprovada" (azul)

2. **Marcar como paga:**
   - Clicar em **$** (marcar como pago)
   - Selecionar método: **PIX** ou **Transferência Bancária**
   - Adicionar observações (opcional): ex: "Comprovante: link.com/prova"
   - Clicar "Confirmar Pagamento"

3. **Verificar e-mail recebido:**
   - Afiliado deve receber e-mail em **até 1 minuto**
   - Assunto: `💰 Comissão Paga - [MOEDA] [VALOR]`
   - Corpo deve conter:
     - Nome do afiliado
     - Valor na moeda correta
     - Método de pagamento
     - ID do pedido
     - Observações (se adicionou)

4. **Logs no terminal:**
   ```bash
   [Comissão] ✅ E-mail de pagamento enviado para: afiliado@email.com
   ✅ Email enviado via Resend: re_abc123xyz
   ```

**Se e-mail falhar:**

```bash
[Comissão] ⚠️ Erro ao enviar e-mail: [motivo]
```

- Comissão ainda é marcada como paga
- Admin pode reenviar manualmente

---

### Teste 3: Múltiplas Moedas

**Cenário:** Afiliado tem vendas em 4 moedas diferentes

1. **Fazer vendas:**
   - Venda 1: `http://localhost:3000?ref=eduardosod` → Stripe (USD)
   - Venda 2: `http://localhost:3000?ref=eduardosod` → Stripe (EUR)
   - Venda 3: `http://localhost:3000?ref=eduardosod` → PayPal (BRL)
   - Venda 4: `http://localhost:3000?ref=eduardosod` → Stripe (MXN)

2. **Verificar admin:**
   - `/admin/afiliados/comissoes`
   - Deve mostrar:
     - `$ 4.99` (USD)
     - `€ 4.50` (EUR)
     - `R$ 24.99` (BRL)
     - `MXN$ 99.00` (MXN)

3. **Verificar dashboard afiliado:**
   - `/afiliado`
   - Comissões listadas com moedas corretas
   - Total geral ainda em BRL (conversão futura)

---

## 📊 Estrutura de Dados

### Schema: `affiliate_commissions`

```sql
CREATE TABLE affiliate_commissions (
  id UUID PRIMARY KEY,
  affiliate_id UUID NOT NULL,
  order_id UUID NOT NULL,
  order_total DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL', -- 🔄 CAMPO CHAVE
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_proof TEXT,
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

**Valores válidos para `currency`:**

- `'BRL'` → Real Brasileiro → R$
- `'USD'` → Dólar Americano → $
- `'EUR'` → Euro → €
- `'MXN'` → Peso Mexicano → MXN$

---

## 🔄 Fluxo Completo de Pagamento

```
1. Venda realizada (webhook cria comissão)
   ↓
   Status: PENDING
   Currency: [moeda da venda]

2. Admin aprova comissão
   ↓
   Status: APPROVED
   pendingCommission do afiliado zerado

3. Admin marca como PAGA
   ↓
   Status: PAID
   paidAt: timestamp atual
   paidCommission do afiliado atualizado
   ↓
   📧 E-mail enviado automaticamente
   ↓
   Assunto: "💰 Comissão Paga - [currency] [amount]"
   Corpo: Template com dados da comissão
   ↓
   Afiliado recebe e pode consultar em /afiliado
```

---

## 🎨 Símbolos de Moeda por País

| Moeda | Código | Símbolo | Uso                           |
| ----- | ------ | ------- | ----------------------------- |
| Real  | BRL    | R$      | Brasil, padrão                |
| Dólar | USD    | $       | EUA, internacional            |
| Euro  | EUR    | €       | Europa, união europeia        |
| Peso  | MXN    | MXN$    | México (prefixo para clareza) |

---

## 📧 Configuração de E-mail

### Opção 1: Resend (Recomendado - Pago)

```env
RESEND_API_KEY=re_abc123xyz
RESEND_FROM_EMAIL=comissoes@arafacriou.com.br
RESEND_REPLY_TO_EMAIL=suporte@arafacriou.com.br
```

**Vantagens:**

- ✅ Alta entregabilidade
- ✅ Dashboard com analytics
- ✅ Webhooks de bounce/spam
- ✅ 100 e-mails/dia grátis

---

### Opção 2: Gmail (Gratuito - Fallback)

```env
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**Como gerar App Password:**

1. Google Account → Security
2. 2-Step Verification (ativar se não tiver)
3. App passwords → Gerar nova
4. Copiar senha de 16 caracteres
5. Colar em `GMAIL_APP_PASSWORD` (sem espaços)

**Limitações:**

- ⚠️ Máximo 500 e-mails/dia
- ⚠️ Pode cair em spam mais facilmente
- ⚠️ Sem analytics

---

### Prioridade de Envio:

```
1. Resend (se RESEND_API_KEY configurado)
   ↓ falha?
2. Gmail (se GMAIL_USER configurado)
   ↓ falha?
3. Erro (log no console)
```

---

## 🛠️ Troubleshooting

### Problema: Moeda não aparece corretamente

**Sintomas:** Comissão mostra "R$" mas venda foi em USD

**Causas possíveis:**

1. Campo `currency` não foi salvo no pedido
2. Migration não rodou
3. Comissão antiga (antes da correção)

**Solução:**

```sql
-- Verificar se currency existe
SELECT currency FROM affiliate_commissions LIMIT 10;

-- Se retornar NULL, rodar migration:
ALTER TABLE affiliate_commissions
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';

-- Atualizar comissões antigas baseado no pedido:
UPDATE affiliate_commissions ac
SET currency = o.currency
FROM orders o
WHERE ac.order_id = o.id
AND ac.currency IS NULL;
```

---

### Problema: E-mail não enviado

**Sintomas:** Log mostra "⚠️ Erro ao enviar e-mail"

**Debug:**

```bash
# Verificar variáveis de ambiente
echo $RESEND_API_KEY
echo $GMAIL_USER
echo $GMAIL_APP_PASSWORD

# Testar Resend manualmente
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@resend.dev","to":"seu@email.com","subject":"Teste","html":"<p>OK</p>"}'
```

**Soluções:**

1. Verificar se API key está correta
2. Verificar se e-mail do afiliado existe
3. Verificar logs detalhados no Resend dashboard
4. Testar com Gmail como fallback

---

### Problema: Símbolo de moeda errado

**Sintomas:** Moeda MXN mostra apenas "$" ao invés de "MXN$"

**Causa:** `getCurrencySymbol()` não reconhece o código

**Solução:** Adicionar em `src/lib/currency-helpers.ts`:

```typescript
const symbols: Record<Currency, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  MXN: 'MXN$',
  // Adicionar nova moeda aqui
};
```

---

## ✅ Checklist de Validação

Após deploy, verificar:

- [ ] Admin vê moedas corretas em `/admin/afiliados/comissoes`
- [ ] Afiliado vê moedas corretas em `/afiliado`
- [ ] E-mail é enviado ao marcar comissão como paga
- [ ] E-mail contém valor na moeda correta
- [ ] Comissão USD mostra `$` não `R$`
- [ ] Comissão EUR mostra `€` não `R$`
- [ ] Comissão MXN mostra `MXN$` não `R$`
- [ ] Logs mostram "✅ E-mail enviado via [provider]"
- [ ] Se Resend falhar, Gmail é usado como fallback
- [ ] Comissão é atualizada mesmo se e-mail falhar

---

## 📈 Próximas Melhorias (Opcional)

1. **Conversão para BRL no dashboard:**
   - Mostrar total geral convertido: "R$ 124.50 ($ 24.99 + € 21.50)"
   - Usar API de câmbio (exchangerate-api.com)

2. **Filtro por moeda:**
   - `/admin/afiliados/comissoes?currency=USD`
   - Ver apenas comissões em dólar

3. **Relatório multi-moeda:**
   - CSV com colunas separadas por moeda
   - Totais por moeda

4. **Histórico de câmbio:**
   - Salvar taxa de conversão no momento da venda
   - Relatórios financeiros precisos

5. **Pagamento automático:**
   - Integração com PayPal Mass Pay
   - Pagamento em lote por PIX

---

## 🎉 Resumo

### O que foi corrigido:

✅ Exibição de moedas (R$, $, €, MXN$) em admin e afiliado
✅ E-mail automático ao afiliado quando comissão é paga
✅ Template de e-mail profissional com dados da comissão
✅ Helper de moedas reutilizável
✅ Fallback Resend → Gmail para e-mails

### Arquivos novos:

- `src/lib/currency-helpers.ts`
- `src/emails/commission-paid.tsx`

### Arquivos modificados:

- `src/components/admin/CommissionsPageClient.tsx`
- `src/components/affiliates/AffiliateDashboard.tsx`
- `src/app/api/affiliates/dashboard/route.ts`
- `src/app/api/admin/affiliates/commissions/[id]/route.ts`

### Resultado:

✅ **Sistema de comissões multi-moeda 100% funcional!**
✅ **Afiliados recebem notificação automática de pagamento!**
