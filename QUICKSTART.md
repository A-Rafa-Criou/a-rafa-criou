# 🚀 Quick Start - Deploy em 30 Minutos

## ⚡ Preparação Rápida para Produção

Siga esta ordem exata para colocar o site no ar hoje:

---

## 📝 CHECKLIST EXPRESS

### **FASE 1: Criar Contas (15 min)**

- [ ] **1. Vercel** - [vercel.com](https://vercel.com)
  - Criar conta
  - Conectar GitHub
  - Plano: Pro ($20/mês)

- [ ] **2. Neon** - [neon.tech](https://neon.tech)
  - Criar projeto "a-rafa-criou"
  - Copiar `DATABASE_URL`
  - Plano: Pro ($19/mês)

- [ ] **3. Cloudflare** - [dash.cloudflare.com](https://dash.cloudflare.com)
  - Criar bucket R2: "a-rafa-criou-pdfs"
  - Gerar API Token (R2 Read/Write)
  - Copiar: Account ID, Access Key, Secret Key

- [ ] **4. Cloudinary** - [cloudinary.com](https://cloudinary.com)
  - Dashboard → Copiar credenciais
  - Cloud Name, API Key, API Secret

- [ ] **5. Stripe** - [stripe.com](https://stripe.com)
  - Ativar modo Live
  - Copiar chaves live
  - Criar webhook: `https://SEUDOMINIO.com/api/stripe/webhook`
  - Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`

- [ ] **6. PayPal** - [developer.paypal.com](https://developer.paypal.com)
  - Criar app em produção
  - Copiar Client ID e Secret (live)
  - Criar webhook

- [ ] **7. Mercado Pago** - [mercadopago.com.br](https://mercadopago.com.br)
  - Criar aplicação
  - Copiar Access Token (produção)

---

### **FASE 2: Configurar Banco (5 min)**

```bash
# 1. Adicionar DATABASE_URL temporariamente no .env.local
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# 2. Aplicar migrations
npm run db:migrate

# 3. Criar admin inicial
npx tsx scripts/create-admin.ts

# 4. Remover DATABASE_URL do .env.local (segurança)
```

---

### **FASE 3: Deploy Vercel (10 min)**

1. **Importar Projeto:**
   - Vercel Dashboard → New Project
   - Importar do GitHub: `a-rafa-criou`

2. **Configurar Environment Variables:**

Copiar e colar no Vercel (Settings → Environment Variables):

```env
# Banco
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_URL=https://seudominio.com
NEXTAUTH_SECRET=GERAR_COM_OPENSSL_RAND

# R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=a-rafa-criou-pdfs
R2_PUBLIC_URL=https://files.seudominio.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_MODE=live

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_WEBHOOK_SECRET=...
```

3. **Deploy:**
   - Clicar em "Deploy"
   - Aguardar 2-5 minutos

---

### **FASE 4: Configurar Domínio (Depende da Propagação DNS)**

#### **No Registrador de Domínio:**

```
Tipo  | Nome | Valor
------|------|-------
A     | @    | 76.76.21.21
CNAME | www  | cname.vercel-dns.com
```

#### **No Vercel:**
- Settings → Domains
- Adicionar: `seudominio.com` e `www.seudominio.com`

**⏱️ Aguardar propagação: 1-48h (geralmente < 4h)**

---

## ✅ TESTE FINAL

Após deploy, testar:

1. **Homepage:** `https://seudominio.com` ✅
2. **Login Admin:** `https://seudominio.com/admin` ✅
3. **Catálogo:** Ver produtos ✅
4. **Adicionar ao Carrinho:** ✅
5. **Checkout Stripe (Teste):** Usar cartão de teste ✅
   - `4242 4242 4242 4242` | 12/34 | 123
6. **Verificar Webhook:** Pedido criado no banco ✅
7. **Download PDF:** Link funcional ✅

---

## ⚠️ ANTES DO LAUNCH REAL

### **Sistema de E-mail - OBRIGATÓRIO**

Sem e-mail, clientes não recebem:
- ❌ Confirmação de pedido
- ❌ Link de download
- ❌ Reset de senha

**Implementar Resend:**
1. Criar conta: [resend.com](https://resend.com)
2. Adicionar `RESEND_API_KEY` no Vercel
3. Criar templates de e-mail
4. Testar envio

**Tempo estimado:** 2-3 dias de desenvolvimento

---

## 🆘 PROBLEMAS COMUNS

### "Build failed no Vercel"
```bash
# Testar localmente
npm run build

# Se passar, verificar variáveis de ambiente no Vercel
```

### "Database connection failed"
- Verificar `DATABASE_URL` está correto
- Testar com: `npx drizzle-kit studio`

### "Webhook não recebe eventos"
- URL deve ser HTTPS
- Testar com Stripe CLI: `stripe trigger payment_intent.succeeded`

### "Site está lento"
- Upgrade para Vercel Pro (mais recursos)
- Verificar Vercel Analytics

---

## 📞 SUPORTE RÁPIDO

- **Vercel:** [vercel.com/support](https://vercel.com/support)
- **Stripe:** [support.stripe.com](https://support.stripe.com)
- **Neon:** [neon.tech/docs](https://neon.tech/docs)

---

## 🎉 PRONTO!

Site está no ar! 🚀

**Próximos passos:**
1. Implementar sistema de e-mail (CRÍTICO)
2. Testar compra real ($1)
3. Monitorar primeiras 72h
4. Implementar features restantes

---

**Boa sorte com o lançamento! 💪**
