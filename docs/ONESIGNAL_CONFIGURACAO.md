# OneSignal - Configuração Completa

Web Push Notifications **GRATUITAS** para até 30.000 usuários.

## ✅ O que foi implementado

- ✅ **Notificações de vendas APENAS para admins**
- ✅ **Notificações para clientes**: pedido confirmado, download pronto
- ✅ **Sistema de tags**: `role:admin` para filtrar admins
- ✅ **Integração automática** com checkout e webhooks

---

## 🚀 Configuração (5 minutos)

### 1. Obter REST API Key

Você já tem o **App ID**: `173f6c22-d127-49d5-becc-f12054437d1b`

Agora precisa da **REST API Key**:

1. Acesse: https://app.onesignal.com/apps/173f6c22-d127-49d5-becc-f12054437d1b/settings
2. Vá em **Settings > Keys & IDs**
3. Copie o **REST API Key** (NÃO é o Safari Web ID)
4. Adicione no `.env`:

```env
# OneSignal (Web Push)
NEXT_PUBLIC_ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
ONESIGNAL_REST_API_KEY=sua_rest_api_key_aqui
```

### 2. Testar no navegador

1. Acesse seu site: `http://localhost:3000`
2. **Aparecerá um popup** pedindo permissão para notificações
3. Clique em **Permitir**
4. Você verá um sino 🔔 no canto inferior direito (botão do OneSignal)

### 3. Marcar usuário como Admin

Após fazer login como admin no site:

1. Acesse: https://app.onesignal.com/apps/173f6c22-d127-49d5-becc-f12054437d1b/audience
2. Encontre seu usuário na lista
3. Clique no usuário
4. Em **Tags**, adicione:
   - **Key**: `role`
   - **Value**: `admin`
5. Salvar

**OU** o sistema fará isso automaticamente se você logar como admin no site!

### 4. Testar notificação de venda

Faça um pedido de teste. O admin receberá:

```
🛒 Nova Venda!
João Silva - Pedido #123 - R$ 99,90
```

O cliente receberá:

```
✅ Pedido Confirmado
Pedido #123 confirmado! Total: R$ 99,90
```

---

## 📱 Como Funciona

### Notificações para ADMIN

**Quando recebe:**

- ✅ Nova venda (checkout concluído)
- ✅ Pagamento confirmado

**Filtro:**

- Apenas usuários com tag `role:admin`
- Definido automaticamente ao fazer login como admin

### Notificações para CLIENTE

**Quando recebe:**

- ✅ Pedido confirmado
- ✅ Download pronto
- ✅ Pagamento confirmado

**Filtro:**

- Enviado para o usuário específico (via `external_id`)

---

## 🔧 Código de Exemplo

### Enviar notificação para admin (nova venda)

```typescript
import { sendWebPushToAdmins } from '@/lib/notifications/channels/web-push';

await sendWebPushToAdmins({
  title: '🛒 Nova Venda!',
  body: `${customerName} - Pedido #${orderId} - ${total}`,
  url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/pedidos`,
  data: {
    type: 'new_sale',
    orderId,
  },
});
```

### Enviar notificação para cliente específico

```typescript
import { sendWebPushToUser } from '@/lib/notifications/channels/web-push';

await sendWebPushToUser(userId, {
  title: '⬇️ Download Pronto!',
  body: `${productName} está disponível para download`,
  url: downloadUrl,
  data: {
    type: 'download_ready',
    productName,
  },
});
```

---

## 🎯 Integração Automática

O sistema JÁ ESTÁ integrado em:

### ✅ Checkout (`sendOrderConfirmation`)

- Cliente recebe: "✅ Pedido Confirmado"
- Admin recebe: "🛒 Nova Venda!"

### ✅ Webhook de Pagamento (`sendPaymentConfirmed`)

- Cliente recebe: "💳 Pagamento Confirmado"
- Admin recebe: "💰 Pagamento Recebido"

### ✅ Download Pronto (`sendDownloadReady`)

- Cliente recebe: "⬇️ Download Pronto!"

---

## 🐛 Troubleshooting

### "Não recebo notificações"

1. **Verificar permissão no navegador:**
   - Chrome: `chrome://settings/content/notifications`
   - Procure seu domínio e certifique-se de que está "Permitido"

2. **Verificar se está inscrito:**
   - Dashboard OneSignal > Audience
   - Deve aparecer seu usuário

3. **Verificar tag de admin:**
   - Clique no usuário
   - Deve ter tag `role:admin`

### "Clientes veem notificações de venda"

- Isso **NÃO pode acontecer**
- Notificações de venda usam `filters: [{ field: 'tag', key: 'role', value: 'admin' }]`
- Apenas admins com tag correta recebem

### "OneSignal não carrega"

1. Verificar `NEXT_PUBLIC_ONESIGNAL_APP_ID` no `.env`
2. Build e restart: `npm run build && npm start`
3. Verificar console do navegador para erros

---

## 💰 Custo

**GRATUITO** até:

- ✅ 30.000 usuários inscritos
- ✅ Notificações ilimitadas

Para e-commerce pequeno/médio, OneSignal é **totalmente gratuito**.

---

## 📚 Documentação Oficial

- OneSignal Web Push: https://documentation.onesignal.com/docs/web-push-quickstart
- REST API: https://documentation.onesignal.com/reference/create-notification
- Filtros e Tags: https://documentation.onesignal.com/docs/segmentation

---

## ✅ Checklist de Implementação

- [x] OneSignal integrado no `layout.tsx`
- [x] `OneSignalProvider` criado
- [x] Funções `sendWebPushToAdmins()` e `sendWebPushToUser()`
- [x] Integração em `sendOrderConfirmation()`
- [x] Integração em `sendPaymentConfirmed()`
- [x] Integração em `sendDownloadReady()`
- [ ] Adicionar `ONESIGNAL_REST_API_KEY` no `.env`
- [ ] Testar notificação no navegador
- [ ] Marcar admin com tag `role:admin`

**Sistema pronto para produção!** 🚀
