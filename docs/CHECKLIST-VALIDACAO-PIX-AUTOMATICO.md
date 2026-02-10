# ✅ Checklist de Validação - Sistema de Pagamento PIX Automático

**Data**: 05/02/2026  
**Status**: Sistema implementado e aguardando validação

---

## 🎯 Objetivo

Garantir que o sistema de pagamento instantâneo PIX para afiliados está funcionando corretamente em produção.

---

## 📋 Checklist de Componentes

### 1. ✅ Estrutura do Código

- [x] **instant-payout.ts** - Lógica de pagamento instantâneo implementada
- [x] **webhook-processor.ts** - Integração com webhooks do Stripe/PayPal
- [x] **fraud-detection.ts** - Sistema anti-fraude ativo
- [x] **Webhooks** - Stripe e PayPal chamando `createCommissionForPaidOrder()`

### 2. ✅ Banco de Dados

**Tabela `affiliates`:**

- [x] `pix_auto_transfer_enabled` (boolean, default: true)
- [x] `minimum_payout` (numeric, default: 10.00)
- [x] `last_payout_at` (timestamp)
- [x] `total_paid_out` (numeric, default: 0)
- [x] `custom_slug` (varchar 50, unique)

**Tabela `affiliate_commissions`:**

- [x] `pix_transfer_id` (varchar 255) - ID da transferência Mercado Pago
- [x] `transfer_error` (text) - Mensagem de erro se falhar
- [x] `transfer_attempt_count` (integer, default: 0)

### 3. ✅ APIs e Endpoints

- [x] `/api/admin/pix-payouts` (GET) - Listar pagamentos
- [x] `/api/admin/pix-payouts` (POST) - Retentar pagamento
- [x] `/api/affiliates/slug` (PATCH) - Atualizar slug personalizado
- [x] `/api/affiliates/me` (GET) - Retorna `customSlug`

### 4. ✅ Dashboard Admin

- [x] **Página**: `/admin/pix-payouts`
- [x] **Cards de estatísticas**: Total pago, pendente, falhas
- [x] **Últimas 24h**: Contadores de pagamentos recentes
- [x] **Lista de comissões**: Com status, valores e erros
- [x] **Botão retentar**: Para pagamentos falhados
- [x] **Filtros**: Por status (todos, pagos, pendentes, falhados)

### 5. ⚠️ Variáveis de Ambiente (VERIFICAR)

```bash
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=TEST-xxx # ⚠️ Mudar para PROD quando estiver pronto
MERCADOPAGO_PUBLIC_KEY=TEST-xxx   # ⚠️ Mudar para PROD quando estiver pronto

# Email
RESEND_API_KEY=re_xxx

# Database
DATABASE_URL=postgresql://...
```

**⚠️ CRÍTICO**: Antes de produção, trocar tokens TEST por PROD!

---

## 🧪 Testes Necessários

### Teste 1: Pagamento Completo (Simulação)

**Passos:**

1. Criar um afiliado comum com PIX configurado
2. Gerar link de afiliado
3. Simular compra usando link (Stripe Test Mode)
4. Webhook confirma pagamento
5. Verificar se comissão foi criada (`affiliate_commissions`)
6. Verificar se pagamento foi processado (logs + tabela)
7. Verificar `/admin/pix-payouts` para confirmar

**Resultado Esperado:**

- ✅ Comissão criada com `status = 'approved'`
- ✅ Sistema tenta transferir PIX automaticamente
- ✅ Se `pixAutoTransferEnabled = true` → Transferência executada
- ✅ Status muda para `paid` + `pixTransferId` preenchido
- ✅ Email enviado para afiliado
- ✅ Dashboard admin mostra pagamento bem-sucedido

### Teste 2: Afiliado sem PIX Configurado

**Cenário**: Afiliado não tem `pixKey` definida

**Resultado Esperado:**

- ✅ Comissão criada, mas pagamento NÃO executado
- ✅ Logs mostram: "PIX key não configurada"
- ✅ Dashboard admin mostra status "Pendente"
- ✅ Afiliado recebe email pedindo para configurar PIX

### Teste 3: Pagamento Duplicado (Idempotência)

**Cenário**: Webhook Stripe envia evento duplicado

**Resultado Esperado:**

- ✅ Sistema detecta que `pixTransferId` já existe
- ✅ NÃO cria comissão duplicada
- ✅ NÃO tenta pagar novamente
- ✅ Logs mostram: "Comissão já foi paga"

### Teste 4: Detecção de Fraude

**Cenário**: Afiliado novo faz venda muito alta (> R$ 500)

**Resultado Esperado:**

- ✅ Sistema detecta padrão suspeito
- ✅ Pagamento retido para revisão manual
- ✅ `requiresManualReview = true` no resultado
- ✅ Admin recebe notificação
- ✅ Dashboard mostra alerta de fraude

### Teste 5: Falha na Transferência

**Cenário**: Mercado Pago retorna erro (PIX key inválida)

**Resultado Esperado:**

- ✅ Sistema registra erro em `transferError`
- ✅ Incrementa `transferAttemptCount`
- ✅ Status permanece `approved` (não muda para `paid`)
- ✅ Dashboard admin mostra erro
- ✅ Botão "Retentar" disponível

### Teste 6: Licença Comercial (NÃO deve receber comissão)

**Cenário**: Venda com afiliado `affiliateType = 'commercial_license'`

**Resultado Esperado:**

- ✅ Sistema NÃO cria comissão
- ✅ Logs mostram: "Licença comercial não recebe comissão"
- ✅ Apenas acesso aos arquivos é concedido

---

## 🔍 Como Monitorar em Produção

### 1. Dashboard Admin

Acessar: `https://arafacriou.com.br/admin/pix-payouts`

**O que verificar:**

- ✅ Estatísticas atualizadas (total pago, pendente, falhas)
- ✅ Lista de pagamentos nas últimas 24h
- ✅ Alertas de erro em vermelho
- ✅ Taxa de sucesso > 95%

### 2. Logs do Servidor

Procurar por estas mensagens:

```bash
# ✅ Sucesso
[Instant Payout] ✅ Pagamento concluído: R$ 50.00 → João Silva (TRANSFER-xxx)

# ⚠️ Atenção
[Instant Payout] ⚠️ Pagamento retido para revisão: Valor alto para afiliado novo

# ❌ Erro
[Instant Payout] ❌ Falha na transferência PIX: Invalid PIX key format
```

### 3. Verificação Manual no Banco

```sql
-- Pagamentos nas últimas 24h
SELECT
  ac.id,
  a.name AS afiliado,
  ac.commission_amount,
  ac.status,
  ac.pix_transfer_id,
  ac.transfer_error,
  ac.created_at,
  ac.paid_at
FROM affiliate_commissions ac
LEFT JOIN affiliates a ON ac.affiliate_id = a.id
WHERE ac.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ac.created_at DESC;

-- Taxa de sucesso
SELECT
  COUNT(*) FILTER (WHERE status = 'paid' AND pix_transfer_id IS NOT NULL) AS pagos,
  COUNT(*) FILTER (WHERE status = 'approved' AND transfer_error IS NULL) AS pendentes,
  COUNT(*) FILTER (WHERE transfer_error IS NOT NULL) AS falhados,
  COUNT(*) AS total
FROM affiliate_commissions
WHERE created_at > NOW() - INTERVAL '7 days';
```

### 4. Alertas Automáticos (Implementar)

**Criar notificações quando:**

- ❌ Taxa de falha > 5% em 1 hora
- ⚠️ Mais de 3 pagamentos suspeitos em 24h
- 🚨 Erro crítico (MERCADOPAGO_ACCESS_TOKEN não configurado)

---

## 🚨 Problemas Conhecidos e Soluções

### Problema 1: "MERCADOPAGO_ACCESS_TOKEN não configurado"

**Causa**: Variável de ambiente ausente ou inválida  
**Solução**:

```bash
# Verificar no Vercel/Hosting
echo $MERCADOPAGO_ACCESS_TOKEN

# Deve começar com:
# - TEST-xxx (ambiente de testes)
# - APP-xxx (produção)
```

### Problema 2: PIX não funciona (erro 401)

**Causa**: Token expirado ou sem permissões  
**Solução**:

1. Acessar: https://www.mercadopago.com.br/developers/panel/app
2. Criar novo Access Token com permissão "write" em "Payments"
3. Atualizar variável de ambiente

### Problema 3: Pagamentos não são processados

**Causa 1**: Webhook não configurado  
**Solução**:

```bash
# URLs dos webhooks
https://arafacriou.com.br/api/stripe/webhook
https://arafacriou.com.br/api/paypal/webhook
```

**Causa 2**: `pixAutoTransferEnabled = false`  
**Solução**: Verificar configuração do afiliado no admin

### Problema 4: Comissões duplicadas

**Causa**: Webhook recebido múltiplas vezes  
**Solução**: Sistema já tem idempotência - verificar logs para confirmar

---

## 📊 Métricas de Sucesso

**Sistema funcionando corretamente quando:**

✅ Taxa de sucesso > 95%  
✅ Tempo médio de transferência < 10 segundos  
✅ Taxa de fraude detectada < 2%  
✅ Zero pagamentos duplicados  
✅ Emails de confirmação enviados em 100% dos casos

---

## 🔧 Próximos Passos

### Curto Prazo (Esta Semana)

- [ ] Trocar tokens TEST por PROD no Mercado Pago
- [ ] Configurar webhooks em produção
- [ ] Fazer 5 testes completos em ambiente de staging
- [ ] Validar emails de notificação
- [ ] Adicionar link no menu admin para `/admin/pix-payouts`

### Médio Prazo (Próximo Mês)

- [ ] Implementar alertas automáticos (email/SMS para admin)
- [ ] Dashboard com gráficos de tendências
- [ ] Relatório mensal de pagamentos
- [ ] Integração com sistema de contabilidade

### Longo Prazo (Futuros Recursos)

- [ ] Suporte a múltiplos métodos (TED, Boleto)
- [ ] Agendamento de pagamentos (pagar apenas sexta-feira)
- [ ] API para afiliados consultarem saldo
- [ ] Aplicativo mobile para afiliados

---

## 📞 Suporte

**Em caso de dúvidas ou problemas:**

1. Verificar logs do servidor primeiro
2. Acessar `/admin/pix-payouts` para diagnóstico
3. Consultar esta documentação
4. Criar ticket de suporte com:
   - ID da comissão afetada
   - Mensagem de erro completa
   - Timestamp do evento
   - Screenshot do dashboard (se aplicável)

---

**Status**: ✅ Sistema implementado e pronto para testes  
**Próxima Ação**: Executar Teste 1 (Pagamento Completo) em ambiente de staging
