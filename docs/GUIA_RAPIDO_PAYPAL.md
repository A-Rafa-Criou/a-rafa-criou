# 🚀 GUIA RÁPIDO - EXECUTAR PAYPAL

## 📋 CHECKLIST DE CONFIGURAÇÃO

### 1. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# PayPal Sandbox
PAYPAL_CLIENT_ID=seu_client_id_aqui
PAYPAL_CLIENT_SECRET=seu_client_secret_aqui
PAYPAL_WEBHOOK_ID=deixe_vazio_por_enquanto
NEXT_PUBLIC_PAYPAL_CLIENT_ID=mesmo_do_PAYPAL_CLIENT_ID
```

### 2. Executar Migration

```bash
npm run db:generate
npm run db:migrate
```

### 3. Reiniciar Servidor

```bash
npm run dev
```

## ✅ TESTAR NO NAVEGADOR

1. Acesse: http://localhost:3000/produtos
2. Adicione um produto ao carrinho
3. Vá para: http://localhost:3000/carrinho
4. Role até "Escolha seu método de pagamento"
5. Clique em **"Pagar com PayPal"** (na seção Internacional)
6. Use conta sandbox do PayPal para pagar
7. Verifique redirecionamento para `/obrigado`

## 🎯 RESULTADO ESPERADO

### Carrinho deve mostrar:

```
┌──────────────────────────────────────┐
│ Escolha seu método de pagamento:    │
├──────────────────────────────────────┤
│ 🇧🇷 Brasil: [PIX][Visa][Mastercard] │
│    [PAGAR COM PIX E CARTÕES]         │
│                                      │
│           ───── ou ─────             │
│                                      │
│ 🌎 Internacional: [Stripe][PayPal]  │
│    [PAGAR COM STRIPE]                │
│    [PAGAR COM PAYPAL]                │
└──────────────────────────────────────┘
```

## 📧 VERIFICAR E-MAIL

Após pagamento bem-sucedido:

- ✅ E-mail enviado automaticamente
- ✅ Links de download incluídos
- ✅ Validade: 15 minutos

## 🔍 VERIFICAR BANCO DE DADOS

```sql
-- Ver pedido criado
SELECT
  id,
  email,
  status,
  payment_status,
  payment_provider,
  paypal_order_id,
  total,
  created_at
FROM orders
WHERE payment_provider = 'paypal'
ORDER BY created_at DESC
LIMIT 1;

-- Ver itens do pedido
SELECT
  oi.name,
  oi.price,
  oi.quantity,
  oi.total
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.payment_provider = 'paypal'
ORDER BY o.created_at DESC
LIMIT 10;
```

## ❓ TROUBLESHOOTING

### Erro: "PAYPAL_CLIENT_ID não encontrado"

- ✅ Verifique `.env.local`
- ✅ Reinicie o servidor (`npm run dev`)

### Erro: "paypalOrderId column does not exist"

- ✅ Execute a migration: `npm run db:migrate`

### Popup do PayPal não abre

- ✅ Verifique bloqueador de pop-ups no navegador
- ✅ Verifique console do navegador (F12)

### E-mail não chegou

- ✅ Verifique `RESEND_API_KEY` no `.env.local`
- ✅ Verifique logs do terminal
- ✅ Verifique pasta de spam

## 📱 TESTAR RESPONSIVIDADE

1. Abra DevTools (F12)
2. Ative modo responsivo
3. Teste em:
   - 📱 iPhone SE (375px)
   - 📱 iPhone 12 Pro (390px)
   - 📱 iPad (768px)
   - 💻 Desktop (1920px)

Botões devem estar organizados e legíveis em todos os tamanhos!

---

**🎉 Pronto! Agora você tem 3 métodos de pagamento funcionando:**

- ✅ PIX (Mercado Pago)
- ✅ Stripe (Cartões Internacionais)
- ✅ PayPal (Conta PayPal)
