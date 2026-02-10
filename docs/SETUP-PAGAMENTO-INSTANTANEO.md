# 🚀 Setup - Pagamento Instantâneo para Afiliados

## ⏱️ Tempo: 15 minutos

**Diferença:** Pagamento acontece **IMEDIATAMENTE** após cada venda (não em lote diário)

---

## 1️⃣ Aplicar Migration (3 min)

```bash
# Já aplicada se você rodou antes
npx drizzle-kit push

# Verificar se colunas existem
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'affiliates' AND column_name IN ('pix_auto_transfer_enabled', 'minimum_payout');"
```

---

## 2️⃣ Configurar Variáveis (2 min)

```env
# .env.local (desenvolvimento) e Vercel (produção)

# Mercado Pago (obrigatório)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu_token_aqui

# Admin email (alertas de segurança)
ADMIN_EMAIL=seu-email@exemplo.com
```

---

## 3️⃣ Testar Localmente (5 min)

### Criar venda de teste

```bash
# 1. Iniciar dev
npm run dev

# 2. Fazer checkout real (com cartão de teste ou PIX sandbox)
# OU criar comissão manualmente:

psql $DATABASE_URL << SQL
-- Encontrar um afiliado
SELECT id, name, pix_key FROM affiliates WHERE pix_key IS NOT NULL LIMIT 1;

-- Criar pedido fake
INSERT INTO orders (id, email, total, status, payment_status, affiliate_id, created_at, updated_at)
VALUES (gen_random_uuid(), 'test@test.com', 100.00, 'completed', 'paid', 'id-afiliado-aqui', NOW(), NOW())
RETURNING id;

-- Usar ID do pedido para criar comissão
INSERT INTO affiliate_commissions (
  id, affiliate_id, order_id,
  order_total, commission_rate, commission_amount,
  status, created_at
) VALUES (
  gen_random_uuid(),
  'id-afiliado-aqui',
  'id-pedido-acima',
  100.00,
  10.00,
  10.00,
  'approved',
  NOW()
);
SQL

# 3. Simular webhook (chamar função manualmente)
# No terminal Node.js:
node -e "
const { processInstantAffiliatePayout } = require('./src/lib/affiliates/instant-payout');
processInstantAffiliatePayout('comission-id-aqui', 'order-id-aqui').then(console.log);
"
```

### Verificar logs

```
[Instant Payout] 🚀 Processando pagamento instantâneo...
[Security] Validando segurança...
[PIX Transfer] 🔄 Transferindo R$ 10.00 para chave-pix
[PIX Transfer] ✅ Transferência criada: mp-12345678
[Instant Payout] ✅ Pagamento concluído: R$ 10.00
```

---

## 4️⃣ Deploy (5 min)

```bash
git add .
git commit -m "feat: Pagamento instantâneo PIX para afiliados"
git push origin main

# Adicionar variáveis na Vercel:
# 1. Dashboard Vercel > Settings > Environment Variables
# 2. Adicionar ADMIN_EMAIL (se ainda não existir)
# 3. Verificar MERCADOPAGO_ACCESS_TOKEN existe

# Aguardar deploy automático
```

---

## ✅ Validar Funcionamento

### Fazer venda real

1. **Criar link de afiliado** (ou usar existente)
2. **Comprar produto** usando o link
3. **Aguardar webhook** confirmar pagamento
4. **Verificar logs** da Vercel

**Logs esperados:**

```
[Affiliate] ✅ Comissão criada: abc-123
[Affiliate] 💸 Iniciando pagamento instantâneo...
[Instant Payout] 🚀 Processando pagamento...
[Instant Payout] ✅ Pagamento concluído: R$ 50.00 (mp-456789)
```

### Verificar no banco

```sql
-- Ver pagamentos realizados
SELECT
  a.name,
  ac.commission_amount,
  ac.pix_transfer_id,
  ac.paid_at,
  EXTRACT(EPOCH FROM (ac.paid_at - ac.created_at)) as segundos
FROM affiliate_commissions ac
INNER JOIN affiliates a ON a.id = ac.affiliate_id
WHERE ac.status = 'paid'
ORDER BY ac.paid_at DESC
LIMIT 5;
```

### Verificar email do afiliado

- Assunto: "💸 Comissão Paga Instantaneamente"
- Conteúdo: Badge "✅ PAGO INSTANTANEAMENTE"
- ID da transferência visível

---

## 🔍 Troubleshooting

### Erro: "MERCADOPAGO_ACCESS_TOKEN não configurado"

```bash
# Adicionar no .env.local
echo "MERCADOPAGO_ACCESS_TOKEN=seu_token" >> .env.local
```

### Pagamento não acontece

**Checklist:**

1. Afiliado tem `pix_key` cadastrada? ✓
2. `pix_auto_transfer_enabled = true`? ✓
3. Webhook foi chamado? (ver logs)
4. Status do pedido é `completed` + `paid`? ✓

### Pagamento retido (pending_review)

**Normal!** Sistema detectou:

- Afiliado muito novo + valor alto
- Muitas vendas em pouco tempo

**Ação:** Admin revisa manualmente no painel

### Erro na transferência

```sql
-- Ver erros
SELECT
  a.name,
  ac.transfer_error,
  ac.transfer_attempt_count
FROM affiliate_commissions ac
INNER JOIN affiliates a ON a.id = ac.affiliate_id
WHERE ac.transfer_error IS NOT NULL;
```

**Causas comuns:**

- Chave PIX inválida
- Token MP expirado
- API MP fora do ar

---

## 📊 Monitorar Saúde do Sistema

```sql
-- Taxa de sucesso
SELECT
  COUNT(*) FILTER (WHERE status = 'paid') as pagos,
  COUNT(*) FILTER (WHERE status = 'pending_review') as em_revisao,
  COUNT(*) FILTER (WHERE status = 'approved') as pendentes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'paid') / COUNT(*),
    2
  ) as taxa_sucesso_percent
FROM affiliate_commissions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Tempo médio de pagamento
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM (paid_at - created_at))), 2) as segundos_medio
FROM affiliate_commissions
WHERE
  status = 'paid'
  AND paid_at > NOW() - INTERVAL '7 days';
```

**Meta:** Taxa de sucesso > 95%, tempo < 10 segundos

---

## 🎉 Pronto!

Agora toda venda confirmada **paga o afiliado instantaneamente**! 🚀

**Próxima venda:**

1. Cliente paga → 2s → 💸 Afiliado recebe PIX → Email confirmação

**Benefícios:**

- ✅ **Afiliados mais felizes** (recebem na hora)
- ✅ **Mais vendas** (motivação maior)
- ✅ **Custo zero** (PIX grátis)
- ✅ **Seguro** (anti-fraude automático)

**Documentação completa:** [PAGAMENTO-INSTANTANEO-AFILIADOS.md](./PAGAMENTO-INSTANTANEO-AFILIADOS.md)
