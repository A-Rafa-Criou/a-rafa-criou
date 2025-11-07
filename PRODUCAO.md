# 🚀 Guia de Deploy para Produção - A Rafa Criou

## 📋 Índice

1. [Credenciais Necessárias](#credenciais-necessárias)
2. [Setup de Hospedagem](#setup-de-hospedagem)
3. [Configuração de Domínio](#configuração-de-domínio)
4. [Variáveis de Ambiente](#variáveis-de-ambiente)
5. [Deploy Inicial](#deploy-inicial)
6. [Workflow de Manutenção](#workflow-de-manutenção)
7. [Monitoramento](#monitoramento)
8. [Backups e Segurança](#backups-e-segurança)

---

## 🔑 Credenciais Necessárias

### **1. Hospedagem (Vercel - Recomendado)**

**Por que Vercel?**

- Deploy automático via Git
- CDN global
- Serverless Functions
- SSL gratuito
- Zero configuração para Next.js
- Domínio customizado gratuito

**O que você precisa:**

- Criar conta em [vercel.com](https://vercel.com)
- Conectar com GitHub
- **Plano recomendado:** Pro ($20/mês) - necessário para:
  - Proteção de senha em staging
  - Mais tempo de execução em Serverless Functions
  - Suporte prioritário

---

### **2. Banco de Dados (Neon ou Supabase)**

#### **Opção A: Neon (Recomendado)**

- Site: [neon.tech](https://neon.tech)
- **Plano:** Pro ($19/mês)
- **Vantagens:**
  - PostgreSQL serverless
  - Branching (criar cópias para testes)
  - Conexões ilimitadas
  - Backups automáticos
- **Como configurar:**
  1. Criar conta
  2. Criar projeto "a-rafa-criou"
  3. Copiar `DATABASE_URL` (Connection String)

---

### **3. Storage de Arquivos**

#### **Cloudflare R2 (PDFs)**

- Site: [cloudflare.com/products/r2](https://cloudflare.com/products/r2)
- **Custo:** $0.015 por GB/mês (sem custo de egress!)
- **Setup:**
  1. Criar conta Cloudflare
  2. Criar bucket "a-rafa-criou-pdfs"
  3. Gerar API Token (R2 Read/Write)
  4. Copiar credenciais:
     - `R2_ACCOUNT_ID`
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`

#### **Cloudinary (Imagens)**

- Site: [cloudinary.com](https://cloudinary.com)
- **Plano:** Plus ($99/mês) ou Pay as you go
- **Setup:**
  1. Criar conta
  2. Copiar credenciais do Dashboard:
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`

---

### **4. Pagamentos**

#### **Stripe**

- Site: [stripe.com](https://stripe.com)
- **Custo:** 2.9% + $0.30 por transação (Brasil: 3.99% + R$0.39)
- **Setup:**
  1. Criar conta
  2. Ativar modo live
  3. Copiar chaves:
     - `STRIPE_SECRET_KEY` (live)
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live)
  4. Configurar Webhook:
     - URL: `https://seudominio.com/api/stripe/webhook`
     - Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
     - Copiar `STRIPE_WEBHOOK_SECRET`

#### **PayPal**

- Site: [developer.paypal.com](https://developer.paypal.com)
- **Setup:**
  1. Criar app
  2. Obter credenciais live:
     - `PAYPAL_CLIENT_ID`
     - `PAYPAL_CLIENT_SECRET`
  3. Configurar Webhook:
     - URL: `https://seudominio.com/api/paypal/webhook`
     - Eventos: `PAYMENT.CAPTURE.COMPLETED`
     - Copiar `PAYPAL_WEBHOOK_ID`

#### **Mercado Pago (PIX)**

- Site: [mercadopago.com.br](https://mercadopago.com.br)
- **Setup:**
  1. Criar conta comercial
  2. Criar aplicação
  3. Obter `MERCADO_PAGO_ACCESS_TOKEN` (produção)
  4. Configurar Webhook:
     - URL: `https://seudominio.com/api/mercado-pago/webhook`

---

### **5. E-mail (Resend)**

- Site: [resend.com](https://resend.com)
- **Plano:** Pro ($20/mês para 50k emails)
- **Setup:**
  1. Criar conta
  2. Adicionar domínio (ex: `mail.arafacriou.com`)
  3. Configurar DNS (MX, SPF, DKIM)
  4. Criar API Key: `RESEND_API_KEY`
  5. Configurar remetente: `noreply@arafacriou.com`

---

### **6. Monitoramento (Opcional mas Recomendado)**

#### **Google Analytics**

- Site: [analytics.google.com](https://analytics.google.com)
- **Gratuito**
- Copiar `NEXT_PUBLIC_GA_TRACKING_ID`

---

## 🏗️ Setup de Hospedagem

### **Opção 1: Vercel (Recomendado)**

#### **1. Criar Projeto**

```bash
# No seu computador
cd a-rafa-criou
git add .
git commit -m "Preparar para deploy"
git push origin main
```

#### **2. Conectar no Vercel**

1. Ir para [vercel.com/new](https://vercel.com/new)
2. Importar repositório do GitHub
3. Configurar projeto:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

#### **3. Adicionar Variáveis de Ambiente**

No Vercel Dashboard > Settings > Environment Variables, adicionar:

```env
# Banco de dados
DATABASE_URL=postgresql://user:pass@host/db

# Auth.js
NEXTAUTH_URL=https://seudominio.com
NEXTAUTH_SECRET=<gerar com: openssl rand -base64 32>

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=a-rafa-criou-pdfs
R2_PUBLIC_URL=https://files.arafacriou.com

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

# E-mail
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@arafacriou.com

# Monitoramento (Opcional)
NEXT_PUBLIC_GA_TRACKING_ID=G-...
SENTRY_DSN=https://...
```

#### **4. Deploy!**

Clicar em "Deploy" e aguardar 2-5 minutos.

---

## 🌐 Configuração de Domínio

### **1. Comprar Domínio**

Recomendações:

- **Registro.br** (R$40/ano para .com.br)
- **Namecheap** ($10/ano para .com)
- **Cloudflare Registrar** (custo + $0.18/ano)

### **2. Configurar DNS**

#### **No Vercel:**

1. Ir para **Settings > Domains**
2. Adicionar `arafacriou.com` e `www.arafacriou.com`
3. Vercel fornecerá records A/CNAME

#### **No seu Registrador de Domínio:**

Adicionar os seguintes records:

```
Tipo  | Nome  | Valor
------|-------|-------
A     | @     | 76.76.21.21 (IP do Vercel)
CNAME | www   | cname.vercel-dns.com
```

Para **subdomínios adicionais**:

```
CNAME | files | r2.seudominio.com (Cloudflare R2)
CNAME | mail  | resend.com (E-mail)
```

**Aguardar propagação DNS:** 1-48h (geralmente < 4h)

---

## 📦 Deploy Inicial

### **Checklist Pré-Deploy**

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Banco de dados criado e migrations aplicadas
- [ ] Cloudflare R2 bucket criado
- [ ] Cloudinary configurado
- [ ] Stripe/PayPal/Mercado Pago em modo live
- [ ] Domínio configurado
- [ ] Webhooks configurados e testados

### **Passos para Deploy**

#### **1. Aplicar Migrations no Banco de Produção**

```bash
# Localmente, apontar para banco de produção temporariamente
DATABASE_URL="postgresql://prod..." npm run db:migrate

# OU usar Drizzle Studio remotamente
DATABASE_URL="postgresql://prod..." npm run db:studio
```

#### **2. Seed de Dados Iniciais (se necessário)**

```bash
# Criar admin inicial
DATABASE_URL="postgresql://prod..." npx tsx scripts/create-admin.ts
```

#### **3. Testar Localmente com Produção**

```bash
# .env.local apontando para produção
npm run build
npm start
```

#### **4. Deploy no Vercel**

```bash
git push origin main
# Vercel faz deploy automático
```

#### **5. Verificações Pós-Deploy**

- [ ] Site acessível em `https://seudominio.com`
- [ ] Login funcionando
- [ ] Checkout com Stripe/PayPal/PIX
- [ ] Webhooks recebendo eventos
- [ ] E-mails sendo enviados
- [ ] Downloads de PDFs funcionando
- [ ] Admin acessível

---

## 🔄 Workflow de Manutenção

### **Cenário: Você vai fazer alterações e testar localmente**

#### **1. Setup no Seu Computador**

```bash
# Clonar repositório (se ainda não tem)
git clone https://github.com/seuuser/a-rafa-criou.git
cd a-rafa-criou

# Instalar dependências
npm install

# Criar .env.local com credenciais de DEV
cp .env.example .env.local
# Editar .env.local com suas credenciais locais
```

#### **2. Banco de Dados Local (Opcional)**

**Opção A: Usar Produção diretamente (cuidado!)**

- Adicionar `DATABASE_URL` de produção em `.env.local`
- **Risco:** pode afetar dados reais

**Opção B: Banco Local com Docker**

```bash
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: arafacriou_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
docker-compose up -d
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/arafacriou_dev
npm run db:migrate
```

**Opção C: Branch de banco (Neon)**

- Criar branch "development" do banco de produção
- Usar essa URL em `.env.local`

#### **3. Fazer Alterações**

```bash
# Criar branch
git checkout -b feature/nova-funcionalidade

# Desenvolver...
# Testar localmente
npm run dev

# Commit
git add .
git commit -m "feat: nova funcionalidade"
git push origin feature/nova-funcionalidade
```

#### **4. Deploy para Staging (Opcional)**

No Vercel:

- Criar preview deploy automaticamente para cada PR
- URL temporária: `https://a-rafa-criou-pr123.vercel.app`

#### **5. Deploy para Produção**

```bash
# Merge na main
git checkout main
git merge feature/nova-funcionalidade
git push origin main

# Vercel faz deploy automático
```

---

## 📊 Monitoramento

### **1. Logs (Vercel)**

- **Runtime Logs:** Vercel Dashboard > Logs
- **Filtrar por:** Erro, Warning, Info
- **Download:** JSON ou CSV

### **2. Uptime Monitoring (UptimeRobot)**

- Site: [uptimerobot.com](https://uptimerobot.com)
- **Gratuito:** 50 monitores
- Configurar:
  - HTTP(S): `https://arafacriou.com`
  - Intervalo: 5 minutos
  - Alertas: E-mail, SMS, Slack

### **3. Performance (Vercel Analytics)**

- **Incluso no Vercel Pro**
- Métricas:
  - Real Experience Score
  - Lighthouse scores
  - Core Web Vitals

### **4. Errors (Sentry)**

- **Dashboard:** [sentry.io](https://sentry.io)
- Ver erros em tempo real
- Stack traces completos
- User feedback

---

## 💾 Backups e Segurança

### **1. Backup de Banco de Dados**

#### **Neon (Automático)**

- Backups diários automáticos (últimos 7 dias)
- Restore via Dashboard

#### **Manual (Recomendado semanalmente)**

```bash
# Fazer backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restaurar
psql $DATABASE_URL < backup-20240101.sql
```

### **2. Backup de Arquivos (R2)**

- Cloudflare R2 tem redundância automática
- **Backup externo (opcional):**
  - Sync semanal para outro bucket
  - AWS S3 Glacier (arquivamento barato)

### **3. Segurança**

#### **Variáveis de Ambiente**

- ✅ **NUNCA commitar** `.env.local`
- ✅ Usar secrets do Vercel
- ✅ Rotacionar chaves a cada 90 dias

#### **Rate Limiting**

- Configurar no Vercel ou Cloudflare
- Limites recomendados:
  - Login: 5 tentativas/minuto
  - Checkout: 10 requests/minuto
  - APIs: 60 requests/minuto

#### **SSL/TLS**

- Vercel fornece certificados automáticos
- Force HTTPS em `next.config.ts`

---

## 🆘 Troubleshooting Comum

### **"Build failed" no Vercel**

1. Verificar logs no Dashboard
2. Testar build localmente: `npm run build`
3. Verificar se todas as variáveis de ambiente estão configuradas

### **"Database connection failed"**

1. Verificar `DATABASE_URL` está correto
2. Testar conexão com Drizzle Studio
3. Verificar IP do Vercel na whitelist (se aplicável)

### **"Webhook not receiving events"**

1. Verificar URL está correta (HTTPS)
2. Testar com Stripe CLI: `stripe trigger payment_intent.succeeded`
3. Verificar logs do Vercel

### **"Site is slow"**

1. Verificar Vercel Analytics
2. Otimizar imagens (Cloudinary automático)
3. Adicionar caching em APIs
4. Upgrade para Vercel Pro (mais recursos)

---

## 📞 Contatos de Suporte

- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **Neon Support:** [neon.tech/docs](https://neon.tech/docs)
- **Stripe Support:** [support.stripe.com](https://support.stripe.com)
- **Cloudflare Support:** [cloudflare.com/support](https://cloudflare.com/support)

---

## ✅ Checklist Final para Go-Live

- [ ] Domínio configurado e propagado
- [ ] Todas as variáveis de ambiente em produção
- [ ] Banco de dados com migrations aplicadas
- [ ] Admin inicial criado
- [ ] Stripe/PayPal/Mercado Pago em modo live
- [ ] Webhooks configurados e testados
- [ ] E-mails enviando corretamente
- [ ] Cloudflare R2 com PDFs de teste
- [ ] SSL ativo (HTTPS)
- [ ] Backup inicial feito
- [ ] Monitoramento configurado (Sentry, GA)
- [ ] Testar checkout completo (compra real de $1)
- [ ] Testar download de PDF
- [ ] Documentação atualizada

---

## 🎉 Pronto para Produção!

Seu e-commerce está preparado para receber clientes reais. Boa sorte! 🚀

**Desenvolvido com ❤️ para A Rafa Criou**
