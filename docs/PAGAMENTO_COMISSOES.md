# ✅ Sistema de Pagamento de Comissões

## 📋 Visão Geral

Sistema completo para gestão e pagamento de comissões de afiliados com notificações automáticas.

---

## 🎯 Funcionalidades

### 1. **Exibição de Dados Bancários**

- Admin visualiza PIX, banco e conta do afiliado antes de pagar
- Dados carregados automaticamente da tabela `affiliates`
- Interface visual com destaque (fundo azul) para atenção

### 2. **Comprovante de Pagamento**

- Campo separado para link do comprovante (Drive, S3, etc)
- Enviado automaticamente no e-mail para o afiliado
- Armazenado na coluna `payment_proof` da comissão

### 3. **Notificação por E-mail**

- Usa **Resend** (mesma instância de reset de senha)
- Enviado quando status muda para `paid`
- Inclui: valor + moeda, método, link do comprovante

---

## 🔧 Arquivos Modificados

### **Backend**

#### **1. src/app/api/admin/affiliates/commissions/route.ts**

```typescript
// Query atualizada para incluir dados bancários
affiliate: {
  id: affiliates.id,
  code: affiliates.code,
  name: affiliates.name,
  email: affiliates.email,
  pixKey: affiliates.pixKey,        // 🆕
  bankName: affiliates.bankName,    // 🆕
  bankAccount: affiliates.bankAccount, // 🆕
}
```

#### **2. src/app/api/admin/affiliates/commissions/[id]/route.ts**

```typescript
import { resend, FROM_EMAIL } from '@/lib/email'; // 🆕 Resend direto
import { CommissionPaidEmail } from '@/emails/commission-paid';

// No PATCH quando status = 'paid'
await resend.emails.send({
  from: FROM_EMAIL,
  to: affiliateEmail,
  subject: 'Comissão Paga - A Rafa Criou',
  react: CommissionPaidEmail({
    affiliateName,
    amount,
    currency,
    paymentMethod,
    notes: `${notes}\n\nComprovante: ${paymentProof}`, // 🆕
  }),
});
```

### **Frontend**

#### **3. src/components/admin/CommissionsPageClient.tsx**

**Interface atualizada:**

```typescript
interface Commission {
  // ...
  affiliate: {
    id: string;
    code: string;
    name: string;
    email: string;
    pixKey?: string; // 🆕
    bankName?: string; // 🆕
    bankAccount?: string; // 🆕
  };
}
```

**Dialog de pagamento (linhas ~320-390):**

```tsx
{
  /* 💳 Seção de Dados Bancários */
}
<div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
  <h4 className='font-semibold text-blue-900'>💳 Dados do Afiliado para Pagamento</h4>

  {selectedCommission.affiliate.pixKey && (
    <div>
      <span>Chave PIX:</span>
      <code className='bg-white px-2 py-1 rounded text-blue-600'>
        {selectedCommission.affiliate.pixKey}
      </code>
    </div>
  )}

  {/* bankName + bankAccount */}
</div>;

{
  /* 📝 Campo de Comprovante */
}
<div>
  <Label>Comprovante de Pagamento</Label>
  <Textarea
    value={paymentProof}
    onChange={e => setPaymentProof(e.target.value)}
    placeholder='Cole o link do comprovante (ex: drive.google.com/...)'
  />
  <p className='text-xs text-gray-500'>Será enviado no e-mail para o afiliado</p>
</div>;
```

### **E-mail Template**

#### **4. src/emails/commission-paid.tsx** (já existente)

- Template profissional com @react-email/components
- Mostra valor formatado com moeda correta (R$, $, €, MXN$)
- Inclui seção de observações com link do comprovante

---

## 🔐 Segurança e Conflitos

### **Por que não há conflitos?**

1. **Resend centralizado**
   - Única instância em `src/lib/email.ts`
   - Compartilhada entre: reset de senha, comissões
   - `FROM_EMAIL = 'A Rafa Criou <noreply@aquanize.com.br>'`

2. **Gmail separado**
   - Usado apenas em `src/lib/notifications/channels/email.ts`
   - Exclusivo para: notificações de compras
   - Não interfere no Resend

3. **Sem wrappers**
   - Uso direto: `resend.emails.send()`
   - Evita camadas de fallback desnecessárias

---

## 💸 Fluxo de Pagamento

### **1. Admin acessa /admin/afiliados/comissoes**

- Filtra comissões com status `approved`

### **2. Clica em "Pagar" na comissão**

```
[Dialog aberto]
┌──────────────────────────────────────┐
│ 💳 Dados do Afiliado                 │
│ Nome: Eduardo Silva                  │
│ PIX: eduardo@example.com             │
│ Banco: Nubank                        │
│ Conta: 123456-7                      │
├──────────────────────────────────────┤
│ Método: [PIX ▼]                      │
│ Comprovante: [_______________]       │
│ Observações: [_______________]       │
└──────────────────────────────────────┘
```

### **3. Admin faz pagamento manualmente**

- Via PIX ou transferência bancária real
- Upload do comprovante no Drive/S3
- Cola link no campo "Comprovante"

### **4. Clica em "Confirmar Pagamento"**

```
[Backend]
✅ Status → 'paid'
✅ paid_at → NOW()
✅ payment_method → 'pix'
✅ payment_proof → 'https://drive.google.com/...'
✅ notes → 'Observações do admin'

[E-mail via Resend]
Para: afiliado@email.com
Assunto: Comissão Paga - A Rafa Criou
Corpo: Template CommissionPaidEmail
  → R$ 15,00 (ou $15.00, €15.00, MXN$15.00)
  → Método: PIX
  → Comprovante: https://drive.google.com/...
```

### **5. Afiliado recebe e-mail**

- Notificação instantânea via Resend
- Link para visualizar comprovante
- Valor na moeda correta da venda original

---

## 📊 Dados Bancários no Schema

### **Tabela `affiliates`** (já existente)

```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,

  -- 💳 Dados Bancários
  pix_key VARCHAR(255),        -- CPF, e-mail, telefone, chave aleatória
  bank_name VARCHAR(255),      -- Ex: "Nubank", "Banco do Brasil"
  bank_account VARCHAR(50),    -- Ex: "123456-7", "0001/12345-6"

  -- ... outros campos
);
```

### **Onde o afiliado cadastra?**

- Tela de perfil do afiliado (a implementar)
- Admin pode editar em `/admin/afiliados/[id]`

---

## ✅ Checklist de Teste

### **1. Preparação**

- [ ] Afiliado tem `pix_key` cadastrado no banco
- [ ] Comissão com status `approved` existe
- [ ] Resend configurado no `.env`:
  ```env
  RESEND_API_KEY=re_...
  EMAIL_FROM=noreply@aquanize.com.br
  ```

### **2. Teste de Pagamento**

```bash
# 1. Iniciar dev
npm run dev

# 2. Acessar admin
http://localhost:3000/admin/afiliados/comissoes

# 3. Clicar em "Pagar" numa comissão aprovada
# 4. Verificar se dados do afiliado aparecem no dialog
# 5. Preencher comprovante: https://exemplo.com/comprovante.pdf
# 6. Clicar em "Confirmar Pagamento"

# 7. Verificar no terminal:
# ✅ "✅ Email enviado via Resend: <message_id>"

# 8. Verificar na caixa do afiliado:
# ✅ E-mail recebido com valor correto
# ✅ Link do comprovante funcional
```

### **3. Verificar no Banco**

```sql
SELECT
  id,
  status,
  payment_method,
  payment_proof,
  paid_at
FROM affiliate_commissions
WHERE id = '<commission_id>';
-- Deve estar: status='paid', payment_proof preenchido
```

---

## 🚨 Troubleshooting

### **Erro: "Dados bancários não aparecem no dialog"**

✅ **Solução:** Verificar se API retorna `pixKey`, `bankName`, `bankAccount`

```typescript
// Teste manual da API
fetch('/api/admin/affiliates/commissions')
  .then(r => r.json())
  .then(d => console.log(d.commissions[0].affiliate));
// Deve incluir: { pixKey: '...', bankName: '...', bankAccount: '...' }
```

### **Erro: "E-mail não enviado"**

✅ **Checklist:**

1. Verificar `.env` tem `RESEND_API_KEY`
2. Checar terminal por erro de envio
3. Validar `FROM_EMAIL` é domínio verificado no Resend
4. Confirmar e-mail do afiliado está correto no banco

### **Erro: "Conflito com Gmail"**

❌ **Não deve ocorrer!**

- Resend: Apenas para reset de senha + comissões
- Gmail: Apenas para notificações de compras (separado)

---

## 📚 Documentação Relacionada

- **COMISSOES_MULTI_MOEDA.md** - Sistema de moedas múltiplas
- **AFFILIATE_TRACKING_FIX.md** - Tracking de afiliados
- **src/lib/currency-helpers.ts** - Helpers de formatação

---

## 🎉 Resumo

✅ **Admin vê dados bancários do afiliado**  
✅ **Campo separado para comprovante de pagamento**  
✅ **E-mail automático via Resend (sem conflitos)**  
✅ **Valor exibido na moeda correta (R$, $, €, MXN$)**  
✅ **Link do comprovante enviado ao afiliado**

**Status:** COMPLETO E TESTÁVEL 🚀
