# Configuração de Pagamentos Automáticos para Afiliados

## ⚠️ Erros Resolvidos

### Erro 1: Stripe Connect não habilitado

```
Error: You can only create new accounts if you've signed up for Connect
```

**Causa**: A conta Stripe não tem o Stripe Connect ativado.

**Solução**:

1. Acesse https://dashboard.stripe.com/connect/accounts/overview
2. Clique em "Get started with Connect"
3. Complete o processo de ativação do Stripe Connect
4. Aguarde aprovação (pode levar alguns minutos)

### Erro 2: Mercado Pago não configurado

```
POST /api/affiliates/onboarding/mercadopago/start 500
```

**Causa**: Falta a variável de ambiente `MERCADOPAGO_CLIENT_ID`.

**Solução**:

1. Crie uma aplicação no Mercado Pago em https://www.mercadopago.com.br/developers/panel/app
2. Copie o `Client ID`
3. Adicione no `.env.local`:

```env
MERCADOPAGO_CLIENT_ID=seu_client_id_aqui
```

---

## 📋 Variáveis de Ambiente Necessárias

### Stripe Connect (Obrigatório para Stripe)

```env
STRIPE_SECRET_KEY=sk_test_...  # ou sk_live_... para produção
NEXT_PUBLIC_APP_URL=http://localhost:3000  # URL do app
```

### Mercado Pago Split (Obrigatório para Mercado Pago)

```env
MERCADOPAGO_CLIENT_ID=1234567890123456
MERCADOPAGO_CLIENT_SECRET=abc123def456ghi789
NEXT_PUBLIC_APP_URL=http://localhost:3000  # URL do app
```

---

## 🚀 Como Configurar Stripe Connect (Desenvolvimento)

### 1. Ativar Stripe Connect

1. Acesse: https://dashboard.stripe.com/test/connect/accounts/overview
2. Clique em **"Get started with Connect"**
3. Escolha tipo: **"Platform or Marketplace"**
4. **IMPORTANTE**: Quando perguntar qual modelo, escolha **"Marketplace"**:
   - ❌ **Não escolha** "Plataforma" (comerciantes recebem direto)
   - ✅ **Escolha** "Marketplace" (você recebe primeiro, depois distribui)
   - Fluxo: Compradores → A Rafa Criou → Afiliados (comissões)
5. Complete o cadastro da sua plataforma

### 2. Configurar Webhooks (Opcional, mas recomendado)

1. Acesse: https://dashboard.stripe.com/test/webhooks
2. Adicione endpoint: `https://seu-dominio.com/api/webhooks/stripe/connect`
3. Eventos necessários:
   - `account.updated` - Atualização de status de onboarding
   - `transfer.created` - Transferência iniciada
   - `transfer.reversed` - Transferência cancelada/falhou

### 3. Testar em Desenvolvimento

```bash
# Instalar Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks para localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe/connect
```

---

## 🇧🇷 Como Configurar Mercado Pago Split

### 1. Criar Aplicação

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Clique em **"Criar aplicação"** ou **"+ Criar nova aplicação"**
3. Preencha os dados:
   - **Nome**: "A Rafa Criou - Afiliados"
   - **Tipo de produto**: Selecione **"Pagamentos online"** ou **"Marketplace"**
   - **Modelo de negócio**: **"Marketplace"** (recebe e distribui pagamentos)
4. Clique em **"Criar aplicação"**

### 2. Configurar Redirect URIs (OAuth)

> ⚠️ **IMPORTANTE**: A interface do Mercado Pago pode variar. Procure por uma dessas opções:

**Opção A - Se houver aba "OAuth" ou "Redirect URIs":**

1. Na aplicação criada, procure pela aba **"OAuth"**, **"Configurações"** ou **"Redirect URIs"**
2. Adicione as URLs de redirecionamento

**Opção B - Se houver seção "Configurações" ou "Production":**

1. Clique na aplicação criada
2. Vá em **"Configurações de produção"** ou **"Production settings"**
3. Procure por **"Redirect URIs"** ou **"URLs de redirecionamento"**

**Opção C - Se não encontrar essas opções:**

1. Vá em **"Suas integrações"** no painel: https://www.mercadopago.com.br/developers/panel/app
2. Clique na aplicação criada
3. Procure por **"Configurações avançadas"** ou **"Advanced settings"**
4. Ou entre em contato com suporte do Mercado Pago

**URLs para adicionar:**

- Desenvolvimento: `http://localhost:3000/api/affiliates/onboarding/mercadopago/callback`
- Produção: `https://seu-dominio.com/api/affiliates/onboarding/mercadopago/callback`

### 3. Obter Credenciais

1. Na aplicação criada, procure pela seção **"Credenciais"** ou **"Credentials"**
2. Copie o **Client ID** (Application ID)
3. Copie o **Client Secret** (se disponível)
4. Anote o **Access Token** de teste e produção

### 4. Adicionar Credenciais no Projeto

No arquivo `.env.local`:

```env
MERCADOPAGO_CLIENT_ID=seu_client_id_ou_application_id
MERCADOPAGO_CLIENT_SECRET=seu_client_secret
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_de_teste
```

> 💡 **Dica**: Se não encontrar o Client Secret, você pode usar o Access Token diretamente. Algumas integrações do Mercado Pago funcionam apenas com Access Token.

---

## 🎯 Fluxo Completo do Afiliado

### 1. Cadastro de Afiliado

- Usuário se cadastra em `/afiliados-da-rafa/cadastro/comum`
- Sistema cria registro no banco com status `pending`
- Redireciona para configuração de pagamentos

### 2. Configuração de Pagamentos

- Afiliado acessa `/afiliados-da-rafa/configurar-pagamentos`
- Escolhe método: Stripe Connect ou Mercado Pago Split
- Sistema detecta se serviços estão disponíveis

### 3. Onboarding Stripe (se escolhido)

1. Sistema cria conta Express no Stripe
2. Gera link de onboarding personalizado
3. Afiliado completa cadastro no Stripe (5-10 min)
4. Stripe redireciona de volta com confirmação
5. Sistema atualiza status para `active`

### 4. Onboarding Mercado Pago (se escolhido)

1. Sistema gera URL de autorização OAuth
2. Afiliado faz login no Mercado Pago
3. Autoriza a aplicação
4. Mercado Pago redireciona com código
5. Sistema troca código por access token
6. Atualiza status para `active`

### 5. Pagamentos Automáticos

- Sistema processa comissões automaticamente
- Transferências são feitas via Stripe/Mercado Pago
- Afiliado recebe na conta conectada

---

## 🛠️ Melhorias Implementadas

### ✅ Validações de Configuração

- Detecta se Stripe Connect está habilitado
- Detecta se Mercado Pago está configurado
- Exibe mensagens de erro específicas

### ✅ Interface Adaptativa

- Cards de pagamento ficam desabilitados se serviço indisponível
- Badge "Indisponível" aparece em serviços não configurados
- Alerta vermelho se nenhum serviço estiver disponível
- Botão "Próximo" desabilitado para serviços indisponíveis

### ✅ Mensagens de Erro Amigáveis

- Erros de API retornam mensagens claras
- Toast com detalhes específicos do problema
- Orientações sobre como resolver

---

## 📝 Checklist de Deploy

### Antes de Ir para Produção

- [ ] Stripe Connect ativado em modo production
- [ ] Variável `STRIPE_SECRET_KEY` com chave live (sk*live*...)
- [ ] Mercado Pago aplicação em modo production
- [ ] Variáveis `MERCADOPAGO_CLIENT_ID` e `MERCADOPAGO_CLIENT_SECRET` configuradas
- [ ] Webhook do Stripe configurado para domínio production
- [ ] Redirect URIs do Mercado Pago atualizados para domínio production
- [ ] `NEXT_PUBLIC_APP_URL` apontando para domínio production
- [ ] Testar fluxo completo com conta teste

### Testes Mínimos

1. ✅ Cadastro de afiliado
2. ✅ Configuração de pagamento Stripe
3. ✅ Configuração de pagamento Mercado Pago
4. ✅ Visualização de dashboard
5. ✅ Processamento de comissão
6. ✅ Transferência automática

---

## 🐛 Troubleshooting

### Problema: "Stripe Connect não está habilitado"

- Verifique se completou ativação em https://dashboard.stripe.com/connect
- Aguarde alguns minutos após ativação
- Em desenvolvimento, use chave test (sk*test*)

##Se não encontrar OAuth/Redirect URIs, pode ser limitação da conta (contate suporte MP)

- Alternativa: Use apenas Access Token para integrações básicas"
- Verifique se `MERCADOPAGO_CLIENT_ID` está no .env
- Confirme que aplicação está criada e aprovada
- Verifique redirect URI na aplicação do MP

### Problema: Redirect loop após onboarding

- Verifique se `NEXT_PUBLIC_APP_URL` está correto
- Confirme que redirect URIs estão configurados corretamente
- Limpe cookies do navegador

---

## 📚 Referências

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Mercado Pago OAuth](https://www.mercadopago.com.br/developers/pt/docs/split-payments/oauth/introduction)
- [Mercado Pago Split](https://www.mercadopago.com.br/developers/pt/docs/split-payments/introduction)

---

**Última atualização**: 30/01/2026
