# Sistema de Notificações Externas

## ✅ Implementado

### 1. **Serviço Central de Notificações**
- `src/lib/notifications/notification-service.ts`
- Suporte multi-canal: Email, SMS, WhatsApp, Web Push
- Respeita preferências do usuário
- DND (Do Not Disturb) configurável
- Retry automático de falhas
- Logging completo no banco

### 2. **Integrações de Canais**

#### 📧 Email (Resend) - PRONTO
- `src/lib/notifications/channels/email.ts`
- Templates React Email profissionais
- Rastreamento de envios

#### 📱 SMS (Twilio) - ESTRUTURADO
- `src/lib/notifications/channels/sms.ts`
- Pronto para configurar

#### 💬 WhatsApp (Meta Business API) - ESTRUTURADO
- `src/lib/notifications/channels/whatsapp.ts`
- Pronto para configurar

#### 🔔 Web Push (OneSignal) - ESTRUTURADO
- `src/lib/notifications/channels/web-push.ts`
- Pronto para configurar

### 3. **Templates de Email**
- ✅ `src/emails/order-confirmation.tsx` - Confirmação de pedido
- ✅ `src/emails/download-ready.tsx` - Download pronto
- ✅ `src/emails/password-reset.tsx` - Reset de senha

### 4. **APIs REST**
- ✅ `GET /api/notifications/settings` - Obter preferências
- ✅ `PUT /api/notifications/settings` - Atualizar preferências
- ✅ `GET /api/notifications/history` - Histórico de notificações

### 5. **Helpers de Integração**
- ✅ `src/lib/notifications/helpers.ts`
- Funções prontas: `sendOrderConfirmation()`, `sendDownloadReady()`, `sendPasswordReset()`

## 🔧 Configuração

### 1. Email via Resend (OBRIGATÓRIO)

```bash
# .env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@seudominio.com.br
RESEND_REPLY_TO_EMAIL=contato@seudominio.com.br
```

**Como obter:**
1. Criar conta: https://resend.com/signup
2. Verificar domínio (adicionar registros DNS)
3. Gerar API Key em Settings → API Keys
4. Copiar para `.env`

**Verificação de Domínio:**
```
Adicionar no DNS do seu domínio:

TXT  @  v=spf1 include:amazonses.com ~all
TXT  resend._domainkey  (valor fornecido pela Resend)
CNAME resend  (valor fornecido pela Resend)
```

### 2. SMS via Twilio (OPCIONAL)

```bash
# .env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

**Como obter:**
1. Criar conta: https://www.twilio.com/try-twilio
2. Console → Account Info → copiar SID e Auth Token
3. Phone Numbers → Buy a Number
4. Copiar número para `.env`

**Custo:** ~$1/mês por número + $0.0075 por SMS

### 3. WhatsApp via Meta Business API (OPCIONAL)

```bash
# .env
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

**Como obter:**
1. Criar Meta Business Account: https://business.facebook.com
2. Adicionar WhatsApp Business API
3. Obter Phone Number ID e Access Token
4. Configurar webhook (opcional)

**Documentação:** https://developers.facebook.com/docs/whatsapp/cloud-api

### 4. Web Push via OneSignal (OPCIONAL)

```bash
# .env
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_API_KEY=your_api_key
```

**Como obter:**
1. Criar conta: https://onesignal.com/
2. New App → Web Push
3. Copiar App ID e API Key
4. Instalar SDK no frontend

## 📝 Como Usar

### Em Server Actions / API Routes

```typescript
import { sendOrderConfirmation, sendDownloadReady } from '@/lib/notifications/helpers';

// Após criar pedido
await sendOrderConfirmation({
  userId: user.id,
  customerName: user.name,
  orderId: order.id,
  orderTotal: 'R$ 49,90',
  orderItems: [
    { name: 'Produto ABC', quantity: 1, price: 'R$ 49,90' }
  ],
  orderUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/conta/pedidos/${order.id}`,
});

// Após pagamento confirmado
await sendDownloadReady({
  userId: user.id,
  customerName: user.name,
  orderId: order.id,
  productName: 'Meu PDF Incrível',
  downloadUrl: signedUrl,
  expiresIn: '15 minutos',
});
```

### Notificação Manual (Qualquer Canal)

```typescript
import { NotificationService } from '@/lib/notifications/notification-service';

await NotificationService.send({
  userId: 'user-id',
  type: 'promotional',
  subject: 'Novidades Incríveis!',
  content: '<h1>Confira nossos novos produtos</h1>',
  channels: ['email', 'whatsapp'], // Opcional - usa preferências do usuário se omitido
  metadata: {
    campaign: 'black-friday-2025',
  },
});
```

### Retry de Notificações Falhas

```typescript
import { NotificationService } from '@/lib/notifications/notification-service';

// Via CRON job ou manualmente
const retried = await NotificationService.retryFailed(3); // máximo 3 tentativas
console.log(`${retried} notificações reenviadas`);
```

## 🎛️ Preferências do Usuário

Os usuários podem configurar suas preferências em `/conta/notificacoes`:

- ✅ Tipos de notificação (confirmação, download, promocional)
- ✅ Canais preferidos (email, SMS, WhatsApp)
- ✅ DND (Do Not Disturb) - horários permitidos
- ✅ Números alternativos (WhatsApp, SMS)

**Padrões:**
- Emails transacionais: ✅ Ativado
- Emails promocionais: ✅ Ativado
- SMS: ❌ Desativado
- WhatsApp: ❌ Desativado
- DND: ❌ Desativado

## 🔐 Segurança

- ✅ Notificações de segurança (reset senha) sempre por email
- ✅ DND não afeta notificações de segurança
- ✅ URLs assinadas com expiração
- ✅ Rate limiting em webhooks
- ✅ Validação de números de telefone

## 📊 Monitoramento

### Logs no Banco
```sql
SELECT 
  type,
  channel,
  status,
  COUNT(*) as total
FROM notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type, channel, status;
```

### Notificações Falhadas
```sql
SELECT * FROM notifications
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## 🚀 Próximos Passos

### Fase 1 (Imediato)
- [x] ✅ Implementar serviço de notificações
- [x] ✅ Configurar Resend (email)
- [x] ✅ Criar templates de email
- [x] ✅ APIs de preferências
- [ ] Integrar em criação de pedido
- [ ] Integrar em confirmação de pagamento
- [ ] Integrar em reset de senha

### Fase 2 (Opcional)
- [ ] Configurar Twilio (SMS)
- [ ] Configurar WhatsApp Business API
- [ ] Configurar OneSignal (Web Push)
- [ ] Interface de preferências no frontend
- [ ] Dashboard de monitoramento

### Fase 3 (Futuro)
- [ ] Templates personalizáveis por admin
- [ ] A/B testing de emails
- [ ] Analytics de engajamento
- [ ] Segmentação de audiência

## 📋 Checklist de Produção

- [ ] Verificar domínio no Resend
- [ ] Configurar SPF, DKIM, DMARC
- [ ] Testar emails em múltiplos clientes
- [ ] Configurar webhooks de Resend
- [ ] Adicionar unsubscribe link (emails promocionais)
- [ ] Configurar rate limiting
- [ ] Monitorar bounce rate
- [ ] Backup de templates

## 🆘 Troubleshooting

### Emails não chegam
1. Verificar domínio no Resend
2. Verificar registros DNS (SPF, DKIM)
3. Checar caixa de spam
4. Ver logs: `GET /api/notifications/history`

### SMS não envia
1. Verificar créditos Twilio
2. Verificar formato do número (+5511999999999)
3. Verificar país permitido
4. Ver logs no console Twilio

### WhatsApp não envia
1. Verificar WhatsApp Business Account aprovada
2. Verificar Phone Number ID correto
3. Verificar token válido
4. Ver logs na Meta Business Suite

## 📚 Recursos

- [Resend Docs](https://resend.com/docs)
- [Twilio SMS Docs](https://www.twilio.com/docs/sms)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [OneSignal Docs](https://documentation.onesignal.com/)
- [React Email](https://react.email/)
