# Implementação de Pagamentos Automáticos para Afiliados

**Data**: 30 de Janeiro de 2026  
**Status**: 🚧 EM IMPLEMENTAÇÃO  
**Objetivo**: Pagamentos automáticos via Stripe Connect e Mercado Pago Split

---

## 🎯 Objetivo

Permitir que afiliados recebam suas comissões automaticamente, sem intervenção manual do admin, através de:
- **Stripe Connect** (internacional, PIX, cartão)
- **Mercado Pago Split** (Brasil, PIX, cartão)
- **Fallback PIX Manual** (caso não conectem)

---

## 📋 Fluxo Completo do Afiliado

### 1️⃣ Cadastro como Afiliado

```
Usuário preenche formulário
    ↓
Aceita termos
    ↓
[NOVO] Escolhe método de recebimento:
    • Stripe Connect (recomendado internacional)
    • Mercado Pago Split (recomendado Brasil)
    • PIX Manual (pagamento manual pelo admin)
    ↓
[NOVO] Completa onboarding da plataforma escolhida
    ↓
Status: ACTIVE + CONNECTED
```

### 2️⃣ Venda Realizada

```
Cliente compra com link do afiliado
    ↓
Webhook confirma pagamento
    ↓
Sistema cria comissão (status: approved)
    ↓
[NOVO] Cron job processa comissões a cada 1 hora
    ↓
[NOVO] Transferência automática para conta conectada
    ↓
Status: PAID
    ↓
Email de confirmação enviado
```

---

## 🗄️ Schema Changes

### Nova Migration: `0035_add_payment_automation.sql`

```sql
-- Adicionar campos de pagamento automático em affiliates
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS preferred_payment_method varchar(20) DEFAULT 'manual_pix';
-- Valores: 'stripe_connect', 'mercadopago_split', 'manual_pix'

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_account_id varchar(255);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_onboarding_status varchar(20) DEFAULT 'not_started';
-- Valores: 'not_started', 'pending', 'completed', 'failed'

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean DEFAULT false;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean DEFAULT false;

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_account_id varchar(255);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_split_status varchar(20) DEFAULT 'not_started';
-- Valores: 'not_started', 'pending', 'completed', 'failed'

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_access_token text;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_public_key text;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS mercadopago_payouts_enabled boolean DEFAULT false;

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS payment_automation_enabled boolean DEFAULT false;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS last_payout_at timestamp;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS total_paid_out decimal(10, 2) DEFAULT 0;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliates_stripe_account ON affiliates(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_mp_account ON affiliates(mercadopago_account_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_payment_method ON affiliates(preferred_payment_method);
CREATE INDEX IF NOT EXISTS idx_affiliates_automation_enabled ON affiliates(payment_automation_enabled);

-- Adicionar campos em affiliate_commissions para rastreamento de transferências
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_id varchar(255);
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_status varchar(20);
-- Valores: 'pending', 'processing', 'succeeded', 'failed', 'cancelled'

ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_error text;
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_attempt_count integer DEFAULT 0;
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS last_transfer_attempt timestamp;

CREATE INDEX IF NOT EXISTS idx_commissions_transfer_id ON affiliate_commissions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_transfer_status ON affiliate_commissions(transfer_status);
CREATE INDEX IF NOT EXISTS idx_commissions_for_payout ON affiliate_commissions(status, transfer_status) 
WHERE status = 'approved' AND (transfer_status IS NULL OR transfer_status = 'failed');
```

---

## 🔌 Integração Stripe Connect

### Configuração Necessária

1. **Stripe Dashboard** → Settings → Connect
2. Criar aplicação Connect
3. Configurar OAuth settings
4. Adicionar variáveis de ambiente:

```env
# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx
NEXT_PUBLIC_STRIPE_CONNECT_REDIRECT=https://arafacriou.com.br/api/affiliates/onboarding/stripe/callback
```

### Fluxo OAuth

```typescript
// Passo 1: Gerar link de onboarding
const accountLink = await stripe.accountLinks.create({
  account: stripeAccountId,
  refresh_url: `${APP_URL}/afiliados-da-rafa/onboarding?refresh=true`,
  return_url: `${APP_URL}/afiliados-da-rafa/onboarding?success=true`,
  type: 'account_onboarding',
});

// Passo 2: Usuário completa onboarding no Stripe
// Passo 3: Stripe redireciona para return_url

// Passo 4: Webhook confirma
// account.updated → charges_enabled: true, payouts_enabled: true
```

### API Endpoints

```
POST /api/affiliates/onboarding/stripe/start
→ Cria Stripe Connected Account
→ Retorna accountLink.url

GET /api/affiliates/onboarding/stripe/status
→ Verifica status da conta

POST /api/webhooks/stripe/connect
→ Processa account.updated
→ Atualiza affiliates table
```

---

## 💰 Integração Mercado Pago Split

### Configuração Necessária

1. **Mercado Pago Developers** → Suas aplicações
2. Habilitar "Marketplace" e "Split de Pagamentos"
3. Configurar OAuth
4. Adicionar variáveis de ambiente:

```env
# Mercado Pago Split
MERCADOPAGO_APP_ID=xxxxx
MERCADOPAGO_CLIENT_ID=xxxxx
MERCADOPAGO_CLIENT_SECRET=xxxxx
NEXT_PUBLIC_MERCADOPAGO_REDIRECT=https://arafacriou.com.br/api/affiliates/onboarding/mercadopago/callback
```

### Fluxo OAuth

```typescript
// Passo 1: Gerar link de autorização
const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${CLIENT_ID}&response_type=code&platform_id=mp&redirect_uri=${REDIRECT_URI}`;

// Passo 2: Usuário autoriza no Mercado Pago
// Passo 3: Callback com authorization_code

// Passo 4: Trocar code por access_token
const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
  method: 'POST',
  body: {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: authorization_code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  }
});
```

### API Endpoints

```
POST /api/affiliates/onboarding/mercadopago/start
→ Retorna authorization URL

GET /api/affiliates/onboarding/mercadopago/callback?code=xxx
→ Troca code por tokens
→ Salva access_token

POST /api/affiliates/onboarding/mercadopago/verify
→ Verifica se conta está apta para receber
```

---

## ⚙️ Sistema de Pagamentos Automáticos

### Cron Job (executa a cada 1 hora)

```typescript
// /api/cron/process-affiliate-payouts

1. Buscar comissões aprovadas sem transferência:
   WHERE status = 'approved' 
   AND (transfer_status IS NULL OR transfer_status = 'failed')
   AND transfer_attempt_count < 3

2. Agrupar por afiliado

3. Para cada afiliado:
   a) Verificar payment_automation_enabled = true
   b) Verificar saldo mínimo (ex: R$ 50)
   c) Verificar método de pagamento conectado
   d) Criar transferência:
      - Stripe → stripe.transfers.create()
      - Mercado Pago → POST /v1/advanced_payments (split)
      - Manual PIX → skip (admin processa)

4. Atualizar transfer_id e transfer_status

5. Webhook confirma pagamento → status = 'paid'
```

### Regras de Negócio

- **Mínimo para saque**: R$ 50 (configurável em site_settings)
- **Frequência**: Diária (1x por dia) ou Semanal (sextas)
- **Taxa de serviço**: 2% (retida antes da transferência)
- **Retry**: Até 3 tentativas em caso de falha
- **Timeout**: Após 3 falhas, marca como "manual_review"

---

## 🎨 UI de Onboarding

### Componente: AffiliateOnboardingWizard

```tsx
<Steps>
  <Step 1: Escolher Método>
    <RadioGroup>
      • Stripe Connect (PIX, Cartão, Internacional)
      • Mercado Pago Split (PIX, Cartão, Brasil)
      • PIX Manual (pagamento manual)
    </RadioGroup>
  </Step>

  <Step 2: Conectar Conta>
    {method === 'stripe' && (
      <Button onClick={connectStripe}>
        Conectar com Stripe →
      </Button>
    )}
    
    {method === 'mercadopago' && (
      <Button onClick={connectMercadoPago}>
        Autorizar Mercado Pago →
      </Button>
    )}
    
    {method === 'manual' && (
      <PixKeyInput /> // Campo já existente
    )}
  </Step>

  <Step 3: Confirmação>
    ✅ Conta conectada com sucesso!
    ✅ Pagamentos automáticos habilitados
    ✅ Você receberá suas comissões automaticamente
  </Step>
</Steps>
```

### Dashboard do Afiliado

```tsx
<Card title="Pagamentos Automáticos">
  {paymentAutomationEnabled ? (
    <>
      <Badge>✅ Ativo</Badge>
      <p>Método: {preferredPaymentMethod}</p>
      <p>Último pagamento: {lastPayoutAt}</p>
      <p>Total recebido: R$ {totalPaidOut}</p>
      <Button>Alterar Método</Button>
    </>
  ) : (
    <>
      <Badge>⚠️ Inativo</Badge>
      <p>Configure pagamentos automáticos para receber mais rápido</p>
      <Button>Configurar Agora</Button>
    </>
  )}
</Card>
```

---

## 📚 Guia para Afiliados

### Como Conectar Stripe Connect

**Passo 1**: Acesse seu dashboard de afiliado  
**Passo 2**: Clique em "Configurar Pagamentos Automáticos"  
**Passo 3**: Escolha "Stripe Connect"  
**Passo 4**: Clique em "Conectar com Stripe"  
**Passo 5**: Preencha os dados solicitados:
- Nome completo ou Razão Social
- CPF ou CNPJ
- Endereço completo
- Data de nascimento
- Conta bancária (para receber)

**Passo 6**: Aguarde aprovação (geralmente instantânea)  
**Passo 7**: ✅ Pronto! Você receberá automaticamente

### Como Conectar Mercado Pago Split

**Passo 1**: Crie uma conta no Mercado Pago (se não tiver)  
**Passo 2**: No dashboard de afiliado, escolha "Mercado Pago Split"  
**Passo 3**: Clique em "Autorizar Mercado Pago"  
**Passo 4**: Faça login na sua conta Mercado Pago  
**Passo 5**: Autorize a aplicação  
**Passo 6**: ✅ Pronto! Conexão estabelecida

### PIX Manual (Alternativa)

Se preferir receber manualmente por PIX:
- Forneça sua chave PIX
- Admin processará pagamentos semanalmente
- Você receberá comprovante por email

---

## 🔐 Segurança

### Validações

- ✅ KYC (Know Your Customer) via Stripe/MP
- ✅ Verificação de conta bancária
- ✅ Detecção de fraude (Radar do Stripe)
- ✅ Limites de transferência configuráveis
- ✅ 2FA recomendado para afiliados

### Proteção de Dados

- ✅ Tokens criptografados no banco
- ✅ Comunicação via HTTPS/TLS
- ✅ Logs de todas transferências
- ✅ Auditoria completa

### Compliance

- ✅ LGPD (Brasil)
- ✅ PCI DSS (cartões)
- ✅ PLD-FT (prevenção lavagem dinheiro)

---

## 📊 Métricas e Monitoramento

### Dashboard Admin

```
- Total em pagamentos automáticos: R$ X
- Pagamentos processados hoje: X
- Falhas nas últimas 24h: X
- Afiliados conectados: X / Y
- Taxa de sucesso: 98%
```

### Alertas

- Email se taxa de falha > 5%
- Notificação se saldo insuficiente
- Alerta se webhook parar de funcionar

---

## ⏱️ Timeline de Implementação

### Fase 1: Base (2-3 dias) ← COMEÇANDO AGORA
- ✅ Migration com novos campos
- ✅ APIs de onboarding Stripe
- ✅ APIs de onboarding Mercado Pago
- ✅ UI de escolha de método

### Fase 2: Pagamentos (2-3 dias)
- ⏳ Cron job de processamento
- ⏳ Lógica de transferências
- ⏳ Webhooks de confirmação
- ⏳ Retry logic

### Fase 3: Testes (1-2 dias)
- ⏳ Testar onboarding completo
- ⏳ Testar transferências
- ⏳ Testar webhooks
- ⏳ Testar edge cases

### Fase 4: Documentação (1 dia)
- ⏳ Guias para afiliados (PT/EN)
- ⏳ Vídeos explicativos
- ⏳ FAQ
- ⏳ Troubleshooting

**Total**: 6-9 dias de desenvolvimento

---

## 🚀 Próximos Passos AGORA

1. ✅ Criar migration
2. ✅ Atualizar schema Drizzle
3. ✅ Criar APIs de onboarding
4. ✅ Criar UI de onboarding
5. ✅ Testar fluxo completo

---

**Status**: 🏗️ Iniciando implementação...
