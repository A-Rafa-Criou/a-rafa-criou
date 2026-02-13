# Passo a Passo - Configuração Stripe Connect

**Objetivo**: Configurar o Stripe Connect para que afiliados recebam comissões automaticamente via destination charges.

---

## 1. Acessar o Stripe Connect

1. Acesse [https://dashboard.stripe.com/connect/accounts/overview](https://dashboard.stripe.com/connect/accounts/overview)
2. Se for a primeira vez, clique em **"Começar"** ou **"Get started"**

---

## 2. Como deseja aceitar pagamentos?

→ Selecione **"Componentes integrados"** (Elements)

> O projeto usa Payment Intents + Elements, não Checkout Sessions.

---

## 3. Onde os vendedores criarão suas contas?

→ Selecione **"Onboarding hospedado pela Stripe"**

> O código usa `stripe.accountLinks.create()` que redireciona para a Stripe.

---

## 4. Confirme suas escolhas de integração

Verifique que aparece:

- **Fluxo de fundos**: Os compradores comprarão de você / Os vendedores serão pagos individualmente
- **Criação de conta**: Onboarding hospedado pela Stripe
- **Gerenciamento de contas**: Componentes integrados
- **Responsabilidade por reembolsos**: Você será o responsável

→ Clique em **"Continuar"**

---

## 5. Configurar Branding do Connect

Em **Configurações > Connect > Branding**:

- **Nome da plataforma**: A Rafa Criou
- **Ícone**: Faça upload do logo
- **Cor da marca**: `#FED466`
- **Cor de destaque**: `#FD9555`

---

## 6. Configurar URLs de Redirecionamento

Em **Configurações > Connect > Configurações do OAuth** (se disponível):

- **Refresh URL**: `https://arafacriou.com.br/api/affiliates/onboarding/stripe/start`
- **Return URL**: `https://arafacriou.com.br/afiliados-da-rafa/dashboard?onboarding=complete`

> Essas URLs já estão configuradas no código em `src/app/api/affiliates/onboarding/stripe/start/route.ts`

---

## 7. Verificar Variáveis de Ambiente no Vercel

Acesse [https://vercel.com](https://vercel.com) → Projeto → Settings → Environment Variables

Confirme que existem:

| Variável | Valor esperado | Obrigatória |
|----------|---------------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (chave de produção) | ✅ |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | ✅ |

> ⚠️ **IMPORTANTE**: Para produção, use chaves `sk_live_` e `pk_live_`. Para testes, use `sk_test_` e `pk_test_`.

---

## 8. Configurar Webhook do Connect

Em **Developers > Webhooks** no Stripe Dashboard:

1. Clique em **"Adicionar endpoint"**
2. **URL**: `https://arafacriou.com.br/api/stripe/webhook`
3. **Eventos para ouvir** (marque todos):
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated` ← eventos de contas conectadas
   - `capability.updated`
4. Na seção **"Ouvir eventos em contas conectadas"**: marque ✅
5. Copie o **Signing secret** (`whsec_...`) e cole/atualize no Vercel como `STRIPE_WEBHOOK_SECRET`

---

## 9. Testar o Fluxo

### 9.1 Cadastrar um afiliado de teste

1. Acesse o site e crie uma conta
2. Vá para `/afiliados-da-rafa` e cadastre-se como afiliado comum
3. No dashboard do afiliado, clique em **"Conectar Stripe"**
4. O afiliado será redirecionado para a Stripe para completar o onboarding
5. Após completar, o afiliado volta para o dashboard com status `complete`

### 9.2 Verificar no Stripe Dashboard

1. Acesse **Connect > Accounts**
2. Deve aparecer a conta conectada do afiliado
3. Status deve ser **"active"** com `charges_enabled: true`

### 9.3 Simular uma venda

1. Faça uma compra de teste usando o link do afiliado (`?ref=CODIGO`)
2. Complete o pagamento
3. Verifique no Stripe Dashboard:
   - O pagamento aparece na sua conta
   - Uma transferência automática foi feita para o afiliado (destination charge)
4. No admin (`/admin/afiliados`), a comissão deve estar registrada

---

## 10. Checklist Final

- [ ] Stripe Connect ativado com "Componentes integrados" + "Onboarding hospedado"
- [ ] Branding configurado (logo, cores)
- [ ] Chaves de produção (`sk_live_`, `pk_live_`) no Vercel
- [ ] Webhook configurado com eventos de contas conectadas
- [ ] Webhook secret atualizado no Vercel
- [ ] Teste de cadastro de afiliado funciona
- [ ] Teste de venda via afiliado gera comissão
- [ ] Transferência aparece no dashboard do afiliado

---

**Última atualização**: 12/02/2026
