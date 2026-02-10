# 🚀 Setup Rápido - Pagamentos PIX Automáticos para Afiliados

## ⏱️ Tempo Estimado: 30 minutos

---

## 1️⃣ Atualizar Schema do Banco (5 min)

```bash
# 1. Rodar migration
npx drizzle-kit push

# OU aplicar SQL direto no banco
psql $DATABASE_URL -f drizzle/0036_add_pix_automation.sql
```

**Verifique que as colunas foram adicionadas:**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'affiliates'
AND column_name IN ('pix_auto_transfer_enabled', 'minimum_payout', 'last_payout_at');
```

---

## 2️⃣ Configurar Variáveis de Ambiente (5 min)

Adicione no `.env.local` (desenvolvimento) e Vercel (produção):

```env
# Mercado Pago (JÁ DEVE EXISTIR)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu_token_aqui

# NOVO: Segurança do Cron Job
CRON_SECRET=gere-um-uuid-seguro-aqui

# NOVO: Email do Admin (para alertas)
ADMIN_EMAIL=seu-email@exemplo.com
```

**Gerar CRON_SECRET:**

```bash
# Node.js
node -e "console.log(require('crypto').randomUUID())"

# OU online: https://www.uuidgenerator.net/
```

---

## 3️⃣ Testar Localmente (10 min)

### A. Testar função de pagamento

```bash
# 1. Iniciar servidor dev
npm run dev

# 2. Em outro terminal, testar endpoint
curl -X POST http://localhost:3000/api/cron/process-payouts \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### B. Verificar logs

Deve mostrar:

```
[PIX Payout] 🚀 Iniciando processamento de pagamentos...
[PIX Payout] 📊 X afiliados com pagamentos pendentes
```

### C. Testar sem afiliados pendentes

Se não houver afiliados com comissões >= R$ 50:

```
[PIX Payout] ℹ️ Nenhum pagamento a processar
```

---

## 4️⃣ Testar Pagamento Manual (5 min)

Criar endpoint de teste (OPCIONAL - apenas para validar):

```bash
# Criar comissão de teste no banco
psql $DATABASE_URL << SQL
INSERT INTO affiliate_commissions (
  id, affiliate_id, order_id, order_total,
  commission_rate, commission_amount,
  status, created_at
) VALUES (
  gen_random_uuid(),
  'id-do-afiliado-aqui',
  gen_random_uuid(),
  100.00,
  10.00,
  10.00,
  'approved',
  NOW()
);
SQL

# Executar cron manualmente
curl -X POST http://localhost:3000/api/cron/process-payouts \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

## 5️⃣ Deploy para Produção (5 min)

```bash
# 1. Commit das mudanças
git add .
git commit -m "feat: Adicionar pagamentos PIX automáticos para afiliados"
git push origin main

# 2. Aguardar deploy da Vercel

# 3. Adicionar variáveis de ambiente na Vercel
# Dashboard Vercel > Projeto > Settings > Environment Variables
# - CRON_SECRET
# - ADMIN_EMAIL
# (MERCADOPAGO_ACCESS_TOKEN já deve existir)

# 4. Redeployar após adicionar variáveis
vercel --prod
```

---

## 6️⃣ Validar Cron Job na Vercel

### A. Verificar configuração

Vercel Dashboard > Projeto > Crons

Deve mostrar:

```
/api/cron/process-payouts
Schedule: 0 10 * * * (Daily at 10:00 AM)
```

### B. Testar cron manualmente

```bash
# Vercel vai criar a URL automaticamente
curl -X POST https://seu-dominio.com/api/cron/process-payouts \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

### C. Verificar logs

Vercel Dashboard > Projeto > Logs > Filtrar por "PIX Payout"

---

## ✅ Checklist Pós-Deploy

- [ ] Migration aplicada (colunas criadas)
- [ ] Variáveis de ambiente configuradas (CRON_SECRET, ADMIN_EMAIL)
- [ ] Cron job aparece no dashboard da Vercel
- [ ] Endpoint responde com 401 sem token
- [ ] Endpoint responde com 200 com token correto
- [ ] Logs mostram processamento correto
- [ ] Email de confirmação funciona

---

## 🧪 Como Testar Pagamento Real

### Opção 1: Criar comissão manualmente

```sql
-- 1. Encontrar afiliado
SELECT id, name, pix_key, pending_commission
FROM affiliates
WHERE pix_key IS NOT NULL
LIMIT 1;

-- 2. Criar comissão de teste
INSERT INTO affiliate_commissions (
  id, affiliate_id, order_id,
  order_total, commission_rate, commission_amount,
  status, created_at
) VALUES (
  gen_random_uuid(),
  'id-do-afiliado-aqui',
  gen_random_uuid(),
  500.00, -- R$ 500 de venda
  10.00,  -- 10%
  50.00,  -- R$ 50 de comissão
  'approved',
  NOW()
);

-- 3. Executar cron
-- curl -X POST https://seu-dominio.com/api/cron/process-payouts ...
```

### Opção 2: Usar sandbox do Mercado Pago

1. Usar access token de **teste** no `.env.local`
2. Criar comissão de teste (SQL acima)
3. Executar cron
4. Validar resposta (não vai transferir dinheiro real)

---

## 🔍 Troubleshooting

### Erro: "CRON_SECRET não configurado"

**Solução:** Adicionar `CRON_SECRET` no `.env.local` ou Vercel

### Erro: "MERCADOPAGO_ACCESS_TOKEN não configurado"

**Solução:** Verificar se variável existe e é válida

### Erro: "Unauthorized - Token inválido"

**Solução:** Usar `Bearer SEU_CRON_SECRET` no header Authorization

### Erro: "Erro ao transferir PIX"

**Causas possíveis:**

- Chave PIX inválida
- Token do Mercado Pago expirado/inválido
- Saldo insuficiente na conta MP
- API do Mercado Pago fora do ar

**Debug:**

```bash
# Ver logs detalhados
vercel logs --follow

# Filtrar por erro
vercel logs | grep "PIX Payout"
```

### Cron não executa automaticamente

**Checklist:**

1. Cron está no `vercel.json`? ✅
2. Projeto tem plano Vercel adequado? (crons funcionam no gratuito)
3. CRON_SECRET configurado na Vercel? ✅
4. Deploy foi feito após adicionar cron? ✅

**Forçar execução:**

```bash
# Executar manualmente via curl
curl -X POST https://seu-dominio.com/api/cron/process-payouts \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

## 📊 Monitoramento

### Ver afiliados com pagamentos pendentes

```sql
SELECT
  a.name,
  a.email,
  a.pix_key,
  COUNT(ac.id) as comissoes_pendentes,
  SUM(ac.commission_amount) as total_pendente
FROM affiliates a
INNER JOIN affiliate_commissions ac ON ac.affiliate_id = a.id
WHERE
  ac.status = 'approved'
  AND a.pix_auto_transfer_enabled = true
  AND a.pix_key IS NOT NULL
GROUP BY a.id, a.name, a.email, a.pix_key
HAVING SUM(ac.commission_amount) >= 50.00;
```

### Ver histórico de pagamentos

```sql
SELECT
  a.name,
  ac.commission_amount,
  ac.paid_at,
  ac.pix_transfer_id,
  ac.status
FROM affiliate_commissions ac
INNER JOIN affiliates a ON a.id = ac.affiliate_id
WHERE ac.status = 'paid'
ORDER BY ac.paid_at DESC
LIMIT 20;
```

---

## 🎉 Pronto!

Seu sistema de pagamentos PIX automáticos está configurado!

**Próximas execuções:**

- Cron roda automaticamente todo dia às 10h
- Afiliados com R$ 50+ em comissões aprovadas recebem automaticamente
- Emails de confirmação são enviados
- Você pode acompanhar tudo nos logs da Vercel

**Dúvidas?** Consulte [docs/SOLUCAO-PAGAMENTOS-AFILIADOS-PIX-AUTOMATICO.md](./SOLUCAO-PAGAMENTOS-AFILIADOS-PIX-AUTOMATICO.md)
