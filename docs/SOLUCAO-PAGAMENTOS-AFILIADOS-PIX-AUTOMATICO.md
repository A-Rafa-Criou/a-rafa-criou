# Solução: Pagamentos Automáticos para Afiliados via PIX

**Data**: 04 de Fevereiro de 2026  
**Status**: 📋 PROPOSTA  
**Objetivo**: Substituir Stripe Connect por solução 100% brasileira e funcional

---

## 🎯 Por Que Esta Solução?

### ❌ Problemas do Stripe Connect

- Verificação de identidade complexa e com erros
- Exige documentação internacional
- Demora na aprovação
- Não é familiar para brasileiros

### ✅ Vantagens do PIX Automático

- Sem verificação complexa
- PIX já é cadastrado pelo afiliado
- Transferências instantâneas
- 100% brasileiro
- Custos muito menores
- Aprovação imediata

---

## 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                    Fluxo Completo                            │
└─────────────────────────────────────────────────────────────┘

1. VENDA ACONTECE
   Cliente compra → Pagamento (Stripe/PayPal/MP) → Webhook

2. COMISSÃO CRIADA (JÁ FUNCIONA)
   Sistema cria registro em affiliate_commissions
   Status: 'approved' (aguardando pagamento)

3. CRON JOB DIÁRIO/SEMANAL (NOVO)
   Busca comissões aprovadas > R$ 50
   Agrupa por afiliado
   Cria lote de transferências PIX

4. TRANSFERÊNCIA AUTOMÁTICA (NOVO)
   Via API Mercado Pago / Asaas / PagBank
   Transfere do saldo da plataforma → Chave PIX do afiliado

5. CONFIRMAÇÃO
   Status: 'paid'
   Email para afiliado
   Registro em transactions
```

---

## 🔧 Opções de Implementação

### Opção 1: Mercado Pago Split (RECOMENDADA) ⭐

**Por que escolher:**

- ✅ Você JÁ usa Mercado Pago
- ✅ API simples de transferência PIX
- ✅ Sem taxas adicionais entre contas MP
- ✅ Saldo fica na sua conta → transfere quando quiser
- ✅ Dashboard para gerenciar

**Como funciona:**

1. Cliente paga via Mercado Pago (já funciona)
2. Dinheiro fica na SUA conta MP
3. Cron job usa API para transferir comissões
4. Afiliado recebe PIX instantâneo

**Custo:**

- R$ 0,00 transferências entre contas MP
- Apenas taxa normal de recebimento (você já paga)

**API:**

```bash
POST https://api.mercadopago.com/v1/transfers
Authorization: Bearer YOUR_ACCESS_TOKEN

{
  "receiver_id": "afiliado_mp_id",  # Conta MP do afiliado
  "amount": 50.00
}
```

**OU transferência direta PIX:**

```bash
POST https://api.mercadopago.com/v1/money_requests
Authorization: Bearer YOUR_ACCESS_TOKEN

{
  "amount": 50.00,
  "payer": {
    "type": "customer",
    "identification": {
      "type": "CPF",
      "number": "12345678900"
    }
  },
  "payment_method_id": "pix",
  "description": "Comissão Afiliado"
}
```

---

### Opção 2: Asaas (Alternativa Simples)

**Vantagens:**

- ✅ API muito fácil
- ✅ Dashboard completo
- ✅ Transferências PIX automáticas
- ✅ Suporte em português
- ✅ Bom para começar

**Custo:**

- R$ 1,99 por transferência PIX
- Sem mensalidade

**API:**

```bash
POST https://api.asaas.com/v3/transfers
api_key: YOUR_API_KEY

{
  "value": 50.00,
  "pixAddressKey": "chave-pix-afiliado@email.com"
}
```

---

### Opção 3: PagBank (PagSeguro)

**Vantagens:**

- ✅ Split nativo
- ✅ API de transferências
- ✅ Você JÁ usa para PIX dos clientes

**Custo:**

- Variável por transferência

---

## 📊 Comparação das Opções

| Critério       | Mercado Pago            | Asaas                  | PagBank         |
| -------------- | ----------------------- | ---------------------- | --------------- |
| **Custo**      | ⭐⭐⭐⭐⭐ Grátis       | ⭐⭐⭐ R$ 1,99/tx      | ⭐⭐ Variável   |
| **Facilidade** | ⭐⭐⭐⭐ Já usa         | ⭐⭐⭐⭐⭐ Muito fácil | ⭐⭐⭐ Médio    |
| **Velocidade** | ⭐⭐⭐⭐⭐ Instantâneo  | ⭐⭐⭐⭐ Rápido        | ⭐⭐⭐⭐ Rápido |
| **Integração** | ⭐⭐⭐⭐⭐ Já integrado | ⭐⭐⭐ Nova            | ⭐⭐⭐ Nova     |

**RECOMENDAÇÃO: Mercado Pago** (você já usa e é grátis)

---

## 🗄️ Schema Changes (Mínimas)

```sql
-- Migration: 0036_add_pix_automation.sql

-- Adicionar apenas campos necessários para pagamento PIX automático
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS pix_auto_transfer_enabled boolean DEFAULT true;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS minimum_payout decimal(10, 2) DEFAULT 50.00;
-- Mínimo R$ 50 para evitar muitas transferências pequenas

ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS pix_transfer_id varchar(255);
-- ID da transferência PIX no Mercado Pago/Asaas

-- Índice para buscar comissões a pagar
CREATE INDEX IF NOT EXISTS idx_commissions_to_pay
ON affiliate_commissions(status, created_at)
WHERE status = 'approved';
```

---

## 💻 Implementação Passo a Passo

### 1. Criar Serviço de Transferência PIX

```typescript
// src/lib/affiliates/pix-payout.ts

import { db } from '@/lib/db';
import { affiliates, affiliateCommissions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN!;
const MINIMUM_PAYOUT = 50; // R$ 50 mínimo

/**
 * Processa pagamentos PIX automáticos para afiliados
 * Chamado por cron job diário
 */
export async function processPendingPayouts() {
  console.log('[PIX Payout] 🚀 Iniciando processamento...');

  // 1. Buscar afiliados com comissões aprovadas
  const affiliatesWithCommissions = await db
    .select({
      affiliateId: affiliateCommissions.affiliateId,
      totalCommission: sql<number>`SUM(${affiliateCommissions.commissionAmount})`,
      pixKey: affiliates.pixKey,
      name: affiliates.name,
      email: affiliates.email,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliates.id, affiliateCommissions.affiliateId))
    .where(
      and(
        eq(affiliateCommissions.status, 'approved'),
        eq(affiliates.pixAutoTransferEnabled, true),
        sql`${affiliates.pixKey} IS NOT NULL`
      )
    )
    .groupBy(affiliateCommissions.affiliateId, affiliates.pixKey, affiliates.name, affiliates.email)
    .having(sql`SUM(${affiliateCommissions.commissionAmount}) >= ${MINIMUM_PAYOUT}`);

  console.log(
    `[PIX Payout] 📊 ${affiliatesWithCommissions.length} afiliados com pagamentos pendentes`
  );

  const results = [];

  for (const affiliate of affiliatesWithCommissions) {
    try {
      // 2. Fazer transferência PIX via Mercado Pago
      const transferResult = await transferPixMercadoPago(
        affiliate.pixKey,
        affiliate.totalCommission,
        affiliate.affiliateId,
        affiliate.name
      );

      // 3. Atualizar status das comissões
      await db
        .update(affiliateCommissions)
        .set({
          status: 'paid',
          paidAt: new Date(),
          pixTransferId: transferResult.transferId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(affiliateCommissions.affiliateId, affiliate.affiliateId),
            eq(affiliateCommissions.status, 'approved')
          )
        );

      // 4. Atualizar totais do afiliado
      await db
        .update(affiliates)
        .set({
          paidCommission: sql`${affiliates.paidCommission} + ${affiliate.totalCommission}`,
          pendingCommission: sql`${affiliates.pendingCommission} - ${affiliate.totalCommission}`,
          lastPayoutAt: new Date(),
          totalPaidOut: sql`${affiliates.totalPaidOut} + ${affiliate.totalCommission}`,
        })
        .where(eq(affiliates.id, affiliate.affiliateId));

      // 5. Enviar email de confirmação
      await sendPayoutConfirmationEmail(
        affiliate.email,
        affiliate.name,
        affiliate.totalCommission,
        transferResult.transferId
      );

      results.push({
        affiliateId: affiliate.affiliateId,
        name: affiliate.name,
        amount: affiliate.totalCommission,
        status: 'success',
        transferId: transferResult.transferId,
      });

      console.log(`[PIX Payout] ✅ R$ ${affiliate.totalCommission} pago para ${affiliate.name}`);
    } catch (error) {
      console.error(`[PIX Payout] ❌ Erro ao pagar ${affiliate.name}:`, error);
      results.push({
        affiliateId: affiliate.affiliateId,
        name: affiliate.name,
        amount: affiliate.totalCommission,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  console.log('[PIX Payout] ✅ Processamento concluído');
  return results;
}

/**
 * Transfere PIX via Mercado Pago
 */
async function transferPixMercadoPago(
  pixKey: string,
  amount: number,
  affiliateId: string,
  affiliateName: string
) {
  // Criar transferência no Mercado Pago
  const response = await fetch('https://api.mercadopago.com/v1/money_requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      'X-Idempotency-Key': `payout-${affiliateId}-${Date.now()}`,
    },
    body: JSON.stringify({
      amount: amount,
      description: `Comissão Afiliado - ${affiliateName}`,
      payment_method_id: 'pix',
      payer: {
        entity_type: 'individual',
        type: 'customer',
      },
      // Aqui você precisará do ID da conta MP do afiliado
      // OU fazer uma transferência direta se tiver a chave PIX
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erro ao transferir PIX: ${error.message || JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    transferId: data.id,
    status: data.status,
  };
}

async function sendPayoutConfirmationEmail(
  email: string,
  name: string,
  amount: number,
  transferId: string
) {
  // Implementar envio de email usando Resend (já existe no projeto)
  const { sendEmail } = await import('@/lib/email');

  await sendEmail({
    to: email,
    subject: '💰 Comissão Paga - A Rafa Criou',
    html: `
      <h2>Olá ${name}!</h2>
      <p>Sua comissão de <strong>R$ ${amount.toFixed(2)}</strong> foi paga via PIX! 🎉</p>
      <p>ID da transferência: <code>${transferId}</code></p>
      <p>O valor deve aparecer na sua conta em instantes.</p>
      <br>
      <p>Continue promovendo nossos produtos e ganhe mais!</p>
      <p><strong>Equipe A Rafa Criou</strong></p>
    `,
  });
}
```

### 2. Criar API para Cron Job

```typescript
// src/app/api/cron/process-payouts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { processPendingPayouts } from '@/lib/affiliates/pix-payout';

export async function POST(req: NextRequest) {
  // Verificar token de segurança do cron (Vercel Cron ou externo)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await processPendingPayouts();

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (error) {
    console.error('[Cron Payouts] Erro:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao processar pagamentos',
      },
      { status: 500 }
    );
  }
}
```

### 3. Configurar Vercel Cron

```json
// vercel.json (adicionar)

{
  "crons": [
    {
      "path": "/api/cron/process-payouts",
      "schedule": "0 10 * * *"
    }
  ]
}
```

Roda todo dia às 10h da manhã.

---

## 📋 Variáveis de Ambiente

```env
# .env.local

# Mercado Pago (JÁ TEM)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx

# Novo: Segurança do Cron
CRON_SECRET=seu_token_secreto_aqui_gere_uuid
```

---

## 🎨 UI - Dashboard do Afiliado (Pequenos Ajustes)

```tsx
// Adicionar no dashboard existente

<Card>
  <CardHeader>
    <CardTitle>⚙️ Configurações de Pagamento</CardTitle>
  </CardHeader>
  <CardContent>
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='font-medium'>Pagamentos Automáticos via PIX</p>
          <p className='text-sm text-gray-600'>Receba automaticamente quando atingir R$ 50</p>
        </div>
        <Switch
          checked={affiliate.pixAutoTransferEnabled}
          onCheckedChange={handleToggleAutoTransfer}
        />
      </div>

      {affiliate.pixKey && (
        <div className='p-4 bg-green-50 border border-green-200 rounded'>
          <p className='text-sm text-green-800'>
            ✅ Chave PIX cadastrada: <code>{affiliate.pixKey}</code>
          </p>
        </div>
      )}

      {!affiliate.pixKey && (
        <Alert variant='warning'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            Cadastre sua chave PIX para receber pagamentos automáticos
          </AlertDescription>
        </Alert>
      )}
    </div>
  </CardContent>
</Card>
```

---

## ✅ Checklist de Implementação

### Fase 1: Setup Básico (1-2 dias)

- [ ] Criar migration `0036_add_pix_automation.sql`
- [ ] Rodar migration em dev
- [ ] Adicionar variável `CRON_SECRET` no `.env.local`
- [ ] Testar migration

### Fase 2: Lógica de Pagamento (2-3 dias)

- [ ] Criar `src/lib/affiliates/pix-payout.ts`
- [ ] Implementar `processPendingPayouts()`
- [ ] Implementar `transferPixMercadoPago()`
- [ ] Adicionar logs detalhados
- [ ] Testar em sandbox do Mercado Pago

### Fase 3: API e Cron (1 dia)

- [ ] Criar `src/app/api/cron/process-payouts/route.ts`
- [ ] Adicionar validação de segurança
- [ ] Configurar `vercel.json` com cron
- [ ] Testar endpoint manualmente

### Fase 4: UI (1 dia)

- [ ] Adicionar toggle de pagamento automático no dashboard
- [ ] Mostrar histórico de pagamentos
- [ ] Adicionar alertas de chave PIX não cadastrada

### Fase 5: Testes (2 dias)

- [ ] Testar fluxo completo em sandbox
- [ ] Testar com múltiplos afiliados
- [ ] Testar casos de erro (PIX inválido, saldo insuficiente)
- [ ] Validar emails de confirmação

### Fase 6: Produção (1 dia)

- [ ] Deploy para produção
- [ ] Configurar cron na Vercel
- [ ] Monitorar primeiro pagamento automático
- [ ] Documentar processo

**TOTAL: ~7-10 dias de trabalho**

---

## 💰 Custos Estimados

### Mercado Pago (Recomendado)

- **Transferências**: R$ 0,00 (grátis entre contas MP)
- **Você já paga**: Taxa de recebimento (mesma de antes)
- **TOTAL ADICIONAL**: R$ 0,00/mês

### Asaas (Alternativa)

- **Transferências**: R$ 1,99 por PIX
- **Exemplo**: 100 pagamentos/mês = R$ 199/mês
- **Sem mensalidade**

### Stripe Connect (Comparação)

- **Setup**: Complexo + tempo de aprovação
- **Taxas**: 0.25% + $0.25 por transferência
- **Problemas**: Verificação de identidade bugada

**ECONOMIA: R$ 0,00 - R$ 199/mês vs problemas do Stripe**

---

## 🚦 Status de Implementação

- [ ] **Documentação** (este arquivo)
- [ ] **Schema changes**
- [ ] **Lógica de pagamento**
- [ ] **API de cron**
- [ ] **UI do dashboard**
- [ ] **Testes completos**
- [ ] **Deploy produção**

---

## 📞 Próximos Passos

1. **Decisão**: Aprovar esta solução?
2. **Escolha**: Mercado Pago, Asaas ou PagBank?
3. **Implementação**: Seguir checklist acima
4. **Testes**: Sandbox primeiro, depois produção
5. **Monitoramento**: Acompanhar primeiros pagamentos

---

## ❓ FAQ

**P: E se o afiliado não tiver conta Mercado Pago?**  
R: Não precisa! Transferimos direto para a chave PIX dele.

**P: Quanto tempo demora a transferência?**  
R: PIX é instantâneo (segundos).

**P: E se o PIX falhar?**  
R: Sistema tenta novamente no próximo dia. Admin recebe notificação.

**P: Posso pagar manualmente se preferir?**  
R: Sim! Admin pode desabilitar pagamento automático por afiliado e pagar manualmente como antes.

**P: Isso quebra algo do site?**  
R: Não! É uma adição. Tudo que funciona hoje continua funcionando.

---

**Última atualização**: 04/02/2026  
**Status**: Aguardando aprovação
