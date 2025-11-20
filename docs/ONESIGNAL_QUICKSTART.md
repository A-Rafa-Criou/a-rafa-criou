# ✅ OneSignal - Configuração Rápida (2 minutos)

## 🎯 O que você recebeu

```html
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "173f6c22-d127-49d5-becc-f12054437d1b",
      safari_web_id: "web.onesignal.auto.34cabfa2-ddd9-46d0-b8b2-6fad793020e0",
      notifyButton: {
        enable: true,
      },
    });
  });
</script>
```

**✅ JÁ IMPLEMENTADO NO CÓDIGO!** Não precisa adicionar nada manualmente.

---

## 🚀 Passo a Passo

### 1. Obter REST API Key (1 minuto)

1. Acesse: https://app.onesignal.com/apps/173f6c22-d127-49d5-becc-f12054437d1b/settings
2. Vá em **Settings > Keys & IDs**
3. Copie o **REST API Key**
4. Adicione no `.env`:

```env
# OneSignal (Web Push)
NEXT_PUBLIC_ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
ONESIGNAL_REST_API_KEY=cole_sua_rest_api_key_aqui
```

### 2. Deploy e Testar (1 minuto)

```bash
npm run build
npm start
```

1. Acesse: http://localhost:3000
2. **Permitir notificações** quando aparecer o popup
3. Veja o sino 🔔 no canto inferior direito

### 3. Marcar Admin (automático!)

**Faça login como admin no site** e o sistema automaticamente:
- Adiciona tag `role:admin` no OneSignal
- Admin passa a receber notificações de vendas

**OU manualmente:**
1. Dashboard OneSignal > Audience
2. Clique no seu usuário
3. Tags > Adicione: `role = admin`

---

## 💰 Resultado

### Admin recebe:
- 🛒 **Nova Venda**: "João Silva - Pedido #123 - R$ 99,90"
- 💰 **Pagamento Recebido**: "Maria Souza - Pedido #456 - R$ 149,90"

### Cliente recebe:
- ✅ **Pedido Confirmado**: "Pedido #123 confirmado! Total: R$ 99,90"
- ⬇️ **Download Pronto**: "Seu produto está disponível para download"
- 💳 **Pagamento Confirmado**: "Pedido #123 - R$ 99,90"

**CLIENTES NUNCA VEEM VENDAS DE OUTROS!**

---

## 🎉 Pronto!

Sistema completo com:
- ✅ Email (Gmail gratuito)
- ✅ Web Push (OneSignal gratuito)
- ✅ Notificações de vendas APENAS para admin
- ✅ Integração automática no checkout

**Custo total: R$ 0,00**
