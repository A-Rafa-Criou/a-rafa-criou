# 🧪 GUIA DE TESTE - SISTEMA MULTI-MOEDA

## ⚡ TESTE RÁPIDO (5 MINUTOS)

### 1. Iniciar Servidor

```bash
npm run dev
```

### 2. Acessar Carrinho

```
http://localhost:3000/carrinho
```

### 3. Adicionar Produtos

- Vá para `/produtos`
- Adicione qualquer produto ao carrinho
- Volte para `/carrinho`

### 4. Testar Seletor de Moeda

#### Ver em BRL (Real)

1. Seletor mostra: **🇧🇷 BRL (R$)**
2. Preço exemplo: **R$ 76,01**
3. Métodos visíveis:
   - ⚡ PIX
   - 💳 Cartão Nacional (Mercado Pago)
   - 🌐 PayPal

#### Mudar para USD (Dólar)

1. Clique no seletor
2. Escolha **🇺🇸 USD ($)**
3. ✅ Preço atualiza: **$15.20** (aprox)
4. Métodos visíveis:
   - 🌐 PayPal
   - 💳 Stripe

#### Mudar para EUR (Euro)

1. Clique no seletor
2. Escolha **🇪🇺 EUR (€)**
3. ✅ Preço atualiza: **€13.68** (aprox)
4. Métodos visíveis:
   - 🌐 PayPal
   - 💳 Stripe

---

## 💳 TESTANDO PAGAMENTOS

### BRL: PIX (Ambiente de Teste)

```bash
1. Selecione BRL
2. Clique em "Pagar com PIX"
3. Na página do PIX, clique em "Simular Pagamento PIX"
4. ✅ Pedido completa + Email enviado
```

### BRL: Cartão Nacional (Mercado Pago)

```bash
1. Selecione BRL
2. Clique em "Pagar com Cartão (Mercado Pago)"
3. Será redirecionado para Mercado Pago
4. Use cartão de teste:
   Número: 5031 4332 1540 6351
   CVV: 123
   Validade: 11/25
   Titular: APRO
5. ✅ Pagamento aprovado
```

### BRL: PayPal

```bash
1. Selecione BRL
2. Clique em "Pagar com PayPal"
3. Popup abre
4. Use conta sandbox do PayPal
5. ✅ Pagamento completa
```

### USD: PayPal

```bash
1. Selecione USD
2. Clique em "PayPal"
3. Popup abre
4. ✅ Valor mostrado em dólares
5. Use conta sandbox do PayPal
```

### USD: Stripe

```bash
1. Selecione USD
2. Clique em "Credit Card"
3. Modal abre
4. Use cartão de teste:
   Número: 4242 4242 4242 4242
   CVV: Qualquer
   Validade: Futuro
5. ✅ Pagamento aprovado
```

---

## 🔍 VERIFICAR CONVERSÃO

### Abrir Console do Navegador

```javascript
// F12 > Console

// Ver taxas atuais
localStorage.getItem('exchange_rates');

// Ver moeda preferida
document.cookie.split(';').find(c => c.includes('preferred_currency'));
```

### Verificar Database

```sql
-- Ver últimos pedidos com moeda
SELECT id, email, total, currency, payment_provider, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 VALIDAR LOGS

### Backend (Terminal)

```
[PayPal] Criando pedido em USD para: cliente@email.com
[PayPal] Total: 15.20 USD

[Stripe] Criando payment intent em EUR para: cliente@email.com
[Stripe] Valor em centavos: 1368
```

### Frontend (Console)

```
[Currency] Taxas atualizadas: {BRL: 1, USD: 0.20, EUR: 0.18}
[Currency] Moeda alterada para: USD
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Marque cada item testado:

### Conversão de Preços

- [ ] BRL mostra R$ corretamente
- [ ] USD mostra $ corretamente
- [ ] EUR mostra € corretamente
- [ ] Valores convertidos fazem sentido (1 BRL ≈ $0.20)

### Persistência

- [ ] Trocar moeda e recarregar página mantém escolha
- [ ] Cookie `preferred_currency` é criado
- [ ] LocalStorage `exchange_rates` é criado

### Métodos de Pagamento

- [ ] BRL mostra: PIX + Cartão BR + PayPal
- [ ] USD mostra: PayPal + Stripe
- [ ] EUR mostra: PayPal + Stripe
- [ ] Mudar moeda atualiza métodos instantaneamente

### Pagamentos Funcionais

- [ ] PIX funciona (BRL)
- [ ] Mercado Pago funciona (BRL)
- [ ] PayPal funciona (BRL)
- [ ] PayPal funciona (USD)
- [ ] PayPal funciona (EUR)
- [ ] Stripe funciona (USD)
- [ ] Stripe funciona (EUR)

### Database

- [ ] Pedidos salvam campo `currency`
- [ ] BRL aparece como 'BRL'
- [ ] USD aparece como 'USD'
- [ ] EUR aparece como 'EUR'
- [ ] Total salvo está correto para moeda

---

## 🐛 TROUBLESHOOTING

### Problema: Taxas não atualizam

**Solução:**

```javascript
// Limpar cache
localStorage.removeItem('exchange_rates');
// Recarregar página
```

### Problema: Seletor não aparece

**Solução:**

```bash
# Verificar se CurrencyProvider está no layout
grep -r "CurrencyProvider" src/components/providers.tsx
```

### Problema: API de cotação falha

**Solução:**
Sistema usa taxas fallback automaticamente:

```typescript
BRL: 1;
USD: 0.2;
EUR: 0.18;
```

### Problema: PayPal mostra erro de moeda

**Solução:**

```bash
# Verificar se moeda está sendo enviada
console.log('Currency:', currency)
```

---

## 📞 LOGS IMPORTANTES

### Sucesso

```
✅ [Currency] Taxas atualizadas: {BRL: 1, USD: 0.20, EUR: 0.18}
✅ [PayPal] Order criada: PAYPAL-123...
✅ [Stripe] Payment Intent criado: pi_123...
```

### Erro

```
❌ [Currency] Erro ao buscar taxas, usando fallback
❌ [PayPal] Erro ao criar order: Invalid currency
❌ [Stripe] Total muito baixo para moeda
```

---

## 🎯 TESTE COMPLETO PASSO A PASSO

### Cenário 1: Cliente Brasileiro

```
1. Acessar /carrinho
2. Verificar: Moeda = BRL
3. Verificar: Preço em R$
4. Verificar: 3 métodos (PIX + Cartão + PayPal)
5. Escolher PIX
6. Simular pagamento
7. ✅ Pedido criado em BRL
```

### Cenário 2: Cliente Americano

```
1. Acessar /carrinho
2. Trocar moeda para USD
3. Verificar: Preço em $
4. Verificar: 2 métodos (PayPal + Stripe)
5. Escolher Stripe
6. Usar cartão 4242...
7. ✅ Pedido criado em USD
```

### Cenário 3: Cliente Europeu

```
1. Acessar /carrinho
2. Trocar moeda para EUR
3. Verificar: Preço em €
4. Verificar: 2 métodos (PayPal + Stripe)
5. Escolher PayPal
6. Usar conta sandbox
7. ✅ Pedido criado em EUR
```

---

## ✅ TESTE FINALIZADO

Se todos os itens acima funcionaram:

- ✅ Sistema multi-moeda 100% funcional
- ✅ Conversão em tempo real OK
- ✅ Todos os métodos de pagamento OK
- ✅ Database salvando moeda correta
- ✅ Pronto para produção!

---

## 🚀 PRÓXIMO PASSO

Deploy para produção:

```bash
# Adicionar variáveis de ambiente
MERCADOPAGO_ACCESS_TOKEN=...
PAYPAL_CLIENT_ID=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Build
npm run build

# Deploy
vercel --prod
```
