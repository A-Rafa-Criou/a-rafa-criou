# Notificações ao Admin - Implementação Completa

## 📋 RESUMO

Implementado sistema completo de notificações para o ADMIN sobre vendas realizadas. Agora, quando um cliente compra, o admin recebe:

1. ✅ **Email** (via Gmail) - detalhes completos da venda
2. ✅ **Web Push** (via OneSignal) - notificação instantânea no navegador

---

## 📧 EMAIL AO ADMIN

### Template Criado

**Arquivo:** `src/emails/admin-sale-notification.tsx`

**Conteúdo do Email:**

- Nome do cliente
- Email do cliente
- Número do pedido (ID abreviado)
- Data e hora da compra
- Total da venda (destaque)
- Lista de itens comprados (quantidade, nome, preço)
- Link para painel admin (futuro)

**Exemplo:**

```
🛒 Nova Venda Realizada!

Cliente: João Silva
Email: joao@example.com
Pedido: #a1b2c3d4
Data: 15/01/2025 14:32
Total: R$ 149,90

Itens do Pedido:
1x PDF de Matemática - R$ 99,90
1x PDF de Física - R$ 50,00
```

---

## 🔔 INTEGRAÇÃO COMPLETA

### Função Principal

**Arquivo:** `src/lib/notifications/helpers.ts`

**Função:** `sendAdminSaleNotification()`

**O que faz:**

1. Busca TODOS os usuários com `role='admin'` no banco
2. Renderiza o email com os dados da venda
3. Envia email para TODOS os admins via Gmail
4. Usa `Promise.allSettled()` para garantir que falhas individuais não bloqueiem
5. Loga quantos admins foram notificados

**Integração com sendOrderConfirmation():**

- Quando `sendOrderConfirmation()` é chamado após pagamento:
  1. Envia email de confirmação ao CLIENTE
  2. Envia Web Push ao CLIENTE
  3. Envia Web Push ao ADMIN
  4. **NOVO:** Envia Email ao ADMIN

---

## 🎯 PONTOS DE INTEGRAÇÃO

### 1. PayPal

**Arquivo:** `src/app/api/paypal/capture-order/route.ts`

Quando PayPal confirma pagamento:

```typescript
await sendOrderConfirmation({
  userId: updatedOrder.userId,
  customerName: captureData.payer?.name?.given_name || 'Cliente',
  customerEmail: captureData.payer?.email_address || updatedOrder.email,
  orderId: updatedOrder.id,
  orderTotal: `R$ ${parseFloat(updatedOrder.total).toFixed(2)}`,
  orderItems: [...],
  orderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/conta/pedidos/${updatedOrder.id}`,
});
```

### 2. Stripe + MercadoPago

**Arquivo:** `src/app/api/orders/send-confirmation/route.ts`

Quando Stripe ou MercadoPago confirmam pagamento:

```typescript
await sendOrderConfirmation({
  userId: order.userId,
  customerName: order.email.split('@')[0] || 'Cliente',
  customerEmail: order.email,
  orderId: order.id,
  orderTotal: `R$ ${parseFloat(order.total).toFixed(2)}`,
  orderItems: [...],
  orderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/conta/pedidos/${order.id}`,
});
```

---

## 🛠️ MELHORIAS NO ONESIGNAL

### Simplificação do OneSignalProvider

**Arquivo:** `src/components/onesignal-provider.tsx`

**Mudanças:**

- ❌ Removido `safari_web_id` (desnecessário, causa conflitos)
- ❌ Removido `notifyButton` (pode causar conflitos com UI)
- ✅ Mantido apenas `appId` e `allowLocalhostAsSecureOrigin`
- ✅ Redução de erros de inicialização

### Service Workers

**Arquivos:**

- `public/OneSignalSDKWorker.js`
- `public/OneSignalSDK.sw.js`

**Status:** ✅ CORRETOS

- Ambos importam: `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js`
- OneSignal v16 requer DOIS arquivos (legacy + beta)

---

## 📝 SCRIPT DE TESTE

### Testar Email ao Admin

**Arquivo:** `scripts/test-admin-email.ts`

**Como usar:**

```bash
npx tsx scripts/test-admin-email.ts
```

**O que faz:**

1. Lista TODOS os admins no banco
2. Renderiza email de teste
3. Envia email para todos os admins
4. Mostra sucesso/erro para cada envio

**Saída esperada:**

```
🔍 Buscando admins no banco...

✅ Encontrado(s) 1 admin(s):

  - ID: 123abc...
  - Nome: Admin Principal
  - Email: admin@example.com
  - Role: admin

📧 Renderizando email de teste...
✅ Email renderizado com sucesso

📤 Enviando emails para admins...
  ✅ Email enviado para admin@example.com

✅ Teste concluído!
```

---

## ⚙️ CONFIGURAÇÃO NECESSÁRIA

### 1. Criar Usuário Admin (se não existir)

Opção A - SQL direto:

```sql
UPDATE users SET role = 'admin' WHERE email = 'seuemail@gmail.com';
```

Opção B - Script:

```bash
npx tsx scripts/set-admin-role.ts seuemail@gmail.com
```

### 2. Verificar Variáveis de Ambiente

**Arquivo:** `.env.local`

```bash
# Gmail (para emails ao admin)
GMAIL_USER=edduardo2011@gmail.com
GMAIL_APP_PASSWORD=seu_app_password_aqui

# OneSignal (para Web Push)
ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
ONESIGNAL_REST_API_KEY=sua_rest_api_key_aqui
NEXT_PUBLIC_ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
```

**Como obter Gmail App Password:**

1. Acesse: https://myaccount.google.com/apppasswords
2. Crie nova senha para "Mail"
3. Use os 16 caracteres gerados

---

## 🧪 COMO TESTAR

### Teste 1: Email ao Admin

```bash
npx tsx scripts/test-admin-email.ts
```

✅ Verifica se admin recebe email de teste

### Teste 2: Compra Real (PayPal Sandbox)

1. Acesse site com login admin
2. Abra nova aba anônima
3. Faça compra como cliente
4. Confirme pagamento no PayPal Sandbox
5. Verifique:
   - ✅ Cliente recebe email de confirmação
   - ✅ Admin recebe Web Push (navegador)
   - ✅ Admin recebe email com detalhes da venda

### Teste 3: Logs no Terminal

Após compra, verifique logs:

```
✅ Notificações enviadas (Email + Web Push)
✅ Notificação de venda enviada para 1 admin(s)
```

---

## 🐛 TROUBLESHOOTING

### Admin não recebe email

**Verificar:**

1. Usuário tem `role='admin'` no banco?

   ```sql
   SELECT id, email, role FROM users WHERE role = 'admin';
   ```

2. Gmail configurado no `.env.local`?

   ```bash
   echo $GMAIL_USER
   echo $GMAIL_APP_PASSWORD
   ```

3. Script de teste funciona?

   ```bash
   npx tsx scripts/test-admin-email.ts
   ```

4. Logs mostram erro?
   - Procurar por: `Erro ao notificar admins via Email`

### Admin não recebe Web Push

**Verificar:**

1. Admin subscrito ao OneSignal?
   - Acesse dashboard OneSignal
   - Verifique "All Users"
   - Usuário admin tem tag `role:admin`?

2. Service Workers carregando?
   - Abrir DevTools → Application → Service Workers
   - Deve ter: `OneSignalSDKWorker.js` ATIVO

3. Logs mostram erro?
   - Procurar por: `Erro ao notificar admins via Web Push`

### Email vai para spam

**Solução:**

1. Adicionar remetente às contatos (edduardo2011@gmail.com)
2. Marcar email como "Não é spam"
3. Criar regra para mover para pasta principal

---

## 📊 ESTATÍSTICAS

### Limites do Gmail GRATUITO

- **500 emails/dia** (suficiente para pequeno e-commerce)
- Exemplo: 100 vendas/dia = 100 emails cliente + 100 emails admin = 200/dia (OK)

### Alternativas (Futuro)

Se ultrapassar 500/dia:

- ✅ Resend (com domínio verificado): 100 emails/dia GRÁTIS, depois $0.001/email
- ✅ SendGrid: 100 emails/dia GRÁTIS perpétuo
- ✅ Amazon SES: $0.10 por 1.000 emails

---

## ✅ CHECKLIST FINAL

- [x] Template de email admin criado
- [x] Função `sendAdminSaleNotification()` implementada
- [x] Integração no PayPal capture
- [x] Integração no orders/send-confirmation (Stripe/MercadoPago)
- [x] Script de teste criado
- [x] OneSignal simplificado (menos erros)
- [x] Service Workers corretos
- [x] Documentação completa
- [ ] **PRÓXIMO:** Testar compra real e verificar recebimento

---

## 📞 SUPORTE

**Se algo não funcionar:**

1. Execute: `npx tsx scripts/test-admin-email.ts`
2. Copie TODA a saída do terminal
3. Verifique logs do navegador (F12 → Console)
4. Copie erros relacionados a OneSignal

**Informações úteis:**

- OneSignal App ID: `173f6c22-d127-49d5-becc-f12054437d1b`
- Gmail SMTP: `edduardo2011@gmail.com`
- Service Workers: `/OneSignalSDKWorker.js` e `/OneSignalSDK.sw.js`
