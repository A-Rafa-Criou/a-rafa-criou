# 🆓 Configuração Gmail GRATUITA (0 custo!)

## Por que Gmail?

- ✅ **100% GRATUITO** - até 500 emails/dia
- ✅ **Sem cartão de crédito**
- ✅ **Configuração em 5 minutos**
- ✅ **Boa deliverability** (emails não caem em spam)
- ✅ **Ideal para começar** (1-100 pedidos/dia)

## 🚀 Setup Rápido (5 minutos)

### Passo 1: Ativar Verificação em 2 Etapas

1. Acesse: https://myaccount.google.com/security
2. Role até "Verificação em duas etapas"
3. Clique em "Começar"
4. Siga as instruções (vai pedir seu celular)

### Passo 2: Gerar App Password

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecionar app: **"Email"**
3. Selecionar dispositivo: **"Outro (nome personalizado)"**
4. Digite: **"A Rafa Criou"**
5. Clique em **"Gerar"**
6. **Copie a senha de 16 caracteres** (ex: `xxxx xxxx xxxx xxxx`)

### Passo 3: Configurar no Projeto

Adicione no `.env.local` (desenvolvimento) ou `.env` (produção):

```bash
# Email via Gmail (GRATUITO)
GMAIL_USER=seu-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

**IMPORTANTE:** Use a App Password (16 caracteres), não sua senha normal do Gmail!

### Passo 4: Testar

```bash
# Rodar projeto
npm run dev

# Fazer um pedido de teste
# Verificar seu email
```

## ✅ Pronto! Emails funcionando!

O sistema vai enviar:

- ✅ Confirmação de pedido
- ✅ Download pronto
- ✅ Reset de senha
- ✅ Notificações promocionais

## 📊 Limites e Comparação

| Provedor     | Custo     | Emails/dia | Domínio Próprio | Rastreamento |
| ------------ | --------- | ---------- | --------------- | ------------ |
| **Gmail**    | 🆓 Grátis | 500        | ❌ Não          | ❌ Não       |
| **Resend**   | $20/mês   | 50.000     | ✅ Sim          | ✅ Sim       |
| **SendGrid** | $15/mês   | 40.000     | ✅ Sim          | ✅ Sim       |

## 🎯 Quando usar Gmail?

### ✅ Use Gmail se:

- Está começando o projeto
- Até 100 pedidos/dia
- Não tem orçamento ainda
- Quer testar o sistema
- Desenvolvimento local

### ⚠️ Migre para Resend quando:

- Mais de 300 emails/dia
- Precisa de domínio personalizado (`noreply@seudominio.com`)
- Quer analytics de email
- Precisa de melhor deliverability
- Cliente exige email profissional

## 🔄 Como Migrar Gmail → Resend (depois)

Quando crescer, é só:

1. Criar conta Resend
2. Adicionar `RESEND_API_KEY` no `.env`
3. **Pronto!** O sistema detecta automaticamente e usa Resend

Não precisa mudar código! O sistema escolhe automaticamente:

```
RESEND_API_KEY existe? → Usa Resend
Senão, GMAIL_USER existe? → Usa Gmail
Senão → Erro
```

## 🛡️ Segurança

### ❌ NÃO faça:

- Nunca commite `.env` com credenciais
- Nunca use senha normal do Gmail (use App Password)
- Nunca compartilhe App Password

### ✅ FAÇA:

- Use App Password (16 caracteres)
- Guarde senha no `.env` (ignorado no Git)
- Adicione `.env` no `.gitignore`
- Use senha diferente para cada app

## 📧 Personalizando Remetente

Por padrão, emails vêm como:

```
De: "A Rafa Criou" <seu-email@gmail.com>
```

Para personalizar:

```typescript
// src/lib/notifications/channels/email-gmail.ts

// Mudar de:
from: `"A Rafa Criou" <${process.env.GMAIL_USER}>`,

// Para:
from: `"Rafaela - A Rafa Criou" <${process.env.GMAIL_USER}>`,
```

## 🚨 Troubleshooting

### Erro: "Invalid login"

- Verificar se ativou verificação em 2 etapas
- Verificar se gerou App Password (não usar senha normal)
- Verificar se copiou App Password corretamente

### Erro: "Daily sending quota exceeded"

- Gmail tem limite de 500 emails/dia
- Aguardar 24h ou migrar para Resend

### Emails caem em spam

- Adicionar link de unsubscribe (emails promocionais)
- Evitar palavras como "GRÁTIS", "PROMOÇÃO" em excesso
- Manter frequência moderada
- Considerar migrar para Resend (melhor deliverability)

## 💡 Dicas Pro

### 1. Criar email exclusivo para projeto

```
Ex: noreply.arafacriou@gmail.com
```

### 2. Usar alias do Gmail

```
Seu email: contato@gmail.com
Alias: contato+arafacriou@gmail.com
(Chega na mesma caixa!)
```

### 3. Configurar resposta automática

No Gmail, configure resposta automática para `noreply.arafacriou@gmail.com`:

```
"Este é um email automático. Para suporte, responda para contato@..."
```

## 📈 Monitoramento

Ver emails enviados:

```sql
SELECT
  DATE(sent_at) as dia,
  COUNT(*) as total_enviados
FROM notifications
WHERE channel = 'email'
  AND status = 'sent'
GROUP BY dia
ORDER BY dia DESC;
```

## 🎉 Pronto!

**Total de custo: R$ 0,00**
**Tempo de setup: 5 minutos**
**Emails funcionando: ✅**

Agora seu e-commerce já envia emails profissionais sem gastar nada! 🚀

---

**Quando seu negócio crescer, é só migrar para Resend com 1 linha de código.**
