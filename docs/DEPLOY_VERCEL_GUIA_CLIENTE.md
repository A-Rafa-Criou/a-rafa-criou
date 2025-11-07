# 🚀 Guia de Deploy - A Rafa Criou na Vercel

## 📋 **Pré-requisitos**

Você vai precisar de:
- ✅ Conta no GitHub
- ✅ Conta na Vercel (pode criar com login do GitHub)
- ✅ Acesso ao painel de DNS do domínio `arafacriou.com.br`

---

## 🔄 **Passo 1: Fazer Fork do Repositório**

O desenvolvedor mantém o repositório original e você cria uma cópia sincronizada.

### **1.1: Criar o Fork**

1. Acesse: `https://github.com/EduardooSodre/a-rafa-criou`
2. Clique no botão **"Fork"** (canto superior direito)
3. Selecione sua conta como destino
4. ✅ Marque: **"Copy the main branch only"**
5. Clique em **"Create fork"**
6. Seu fork estará em: `https://github.com/SEU-USERNAME/a-rafa-criou`

### **1.2: Configurar Sincronização Automática**

Para receber atualizações do desenvolvedor automaticamente:

1. No seu fork, vá em **"Settings"** → **"Actions"** → **"General"**
2. Em **"Workflow permissions"**, selecione: **"Read and write permissions"**
3. Clique em **"Save"**

### **Passo 2: Conectar na Vercel**

1. Acesse: https://vercel.com
2. Faça login com sua conta GitHub
3. Clique em **"Add New..."** → **"Project"**
4. Encontre o repositório `a-rafa-criou` (seu fork) na lista
5. Clique em **"Import"**

### **Passo 3: Configurar Variáveis de Ambiente**

**IMPORTANTE:** Antes de fazer o deploy, configure estas variáveis:

#### **Variáveis OBRIGATÓRIAS:**

```env
# URL do Site (MUDE para seu domínio!)
NEXT_PUBLIC_APP_URL=https://arafacriou.com.br

# Banco de Dados (já configurado)
DATABASE_URL=postgresql://neondb_owner:npg_sOX1NwcgjVb3@ep-frosty-fog-acknw8gn-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Autenticação
AUTH_SECRET=zFs//C7UXJITBCaSPrM1wHL1N7uq7GK15D6LILid144=
NEXTAUTH_URL=https://arafacriou.com.br

# Cloudinary (Imagens)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dr2fs6urk
CLOUDINARY_API_KEY=772792428618415
CLOUDINARY_API_SECRET=7jPboYhVZ2Nare4d9rRuF1aZvQ8
CLOUDINARY_FOLDER=a-rafa-criou

# E-mail (Resend)
RESEND_API_KEY=re_G2AmZHgd_35TRiN6juUfL4W7dhpBhKFqX
FROM_EMAIL=A Rafa Criou <noreply@aquanize.com.br>

# Cloudflare R2 (PDFs)
R2_ACCOUNT_ID=cd1a164db8d1fd883dfb3e2c8a94023c
R2_ACCESS_KEY_ID=f729e594769bc5120c1b682df67932ef
R2_SECRET_ACCESS_KEY=4c08d8d50871e65c774d6932c70b99acad7e865ef43724a9bdaf78145d2f172a
R2_BUCKET=pdfs
R2_REGION=auto
R2_PUBLIC_URL=https://cd1a164db8d1fd883dfb3e2c8a94023c.r2.cloudflarestorage.com

# Mercado Pago (PRODUÇÃO)
MERCADOPAGO_ACCESS_TOKEN_PROD=APP_USR-3166468636714348-103013-b1511bcf34236ebbf9cd50b4d06be91f-330639405
MERCADOPAGO_PUBLIC_KEY_PROD=APP_USR-4708728410257411-103013-8998bd225b670fc91565e3ae1acce27e-2911608756
MERCADOPAGO_WEBHOOK_SECRET=dab6efeca54667b6074a4130947fb40926049040bf2429be8e3118c66d7e22cf

# PayPal
PAYPAL_CLIENT_ID=Af3CbryKIpObDmCwHg0VXXJEO_IhoLl3ZSJ3RI8690fwDrpnp5aRLsXmxQouwYITUcKykx9uxvbT2EAn
PAYPAL_CLIENT_SECRET=EJiqR57aJdhhXFhGa4dLDdtfy91-CWax3z5mLEhf9Oa3W7xF3Kit6qMXYwvn3e22kHkrIBc5f5bzPFsD
PAYPAL_WEBHOOK_ID=5PJ261937G544091U

# WordPress (validação de senhas antigas)
WORDPRESS_API_URL=https://arafacriou.com.br/wp-json/nextjs/v1/validate-password
WORDPRESS_API_KEY=wp_a521bccb4d50dd1b2391d09dfb16babdeba490b74f4ffb872236bad686fba2a0

# Ambiente
NODE_ENV=production
```

#### **Como adicionar na Vercel:**

1. Na página de configuração do projeto, vá em **"Environment Variables"**
2. Para cada variável acima:
   - Cole o **nome** (ex: `NEXT_PUBLIC_APP_URL`)
   - Cole o **valor** (ex: `https://arafacriou.com.br`)
   - Selecione: **Production**, **Preview**, **Development**
   - Clique em **"Add"**

### **Passo 4: Deploy!**

1. Clique em **"Deploy"**
2. Aguarde ~5 minutos (primeira build leva mais tempo)
3. Quando terminar, você verá: **"🎉 Your project is live!"**
4. Vercel vai gerar uma URL temporária: `a-rafa-criou-xxxxx.vercel.app`

### **Passo 5: Configurar Domínio Personalizado**

1. No painel do projeto, vá em **"Settings"** → **"Domains"**
2. Adicione: `arafacriou.com.br`
3. Adicione também: `www.arafacriou.com.br`
4. Vercel vai mostrar as configurações de DNS necessárias:

```
Type: A
Name: @
Value: 76.76.21.21
```

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

5. Acesse o painel do seu provedor de domínio (Registro.br, Hostgator, etc.)
6. Adicione esses registros DNS
7. Aguarde até 48h para propagação (geralmente 15-30 minutos)

---

## � **Como Receber Atualizações do Desenvolvedor**

### **Método 1: Sincronização Automática via GitHub Actions (Recomendado)**

Vou configurar uma sincronização automática que roda diariamente.

**O desenvolvedor vai criar um arquivo no seu fork que:**
- ✅ Verifica atualizações do repositório original a cada 24h
- ✅ Sincroniza automaticamente (merge)
- ✅ Vercel detecta e faz deploy automático
- ✅ **Você não precisa fazer NADA!**

### **Método 2: Sincronização Manual (Backup)**

Se quiser sincronizar manualmente:

1. Acesse seu fork: `https://github.com/SEU-USERNAME/a-rafa-criou`
2. Você verá um aviso: **"This branch is X commits behind EduardooSodre:main"**
3. Clique em **"Sync fork"** → **"Update branch"**
4. ✅ Pronto! Vercel fará o deploy automaticamente

### **Notificações de Atualização**

Para ser notificada quando o desenvolvedor atualizar:

1. No repositório original: `https://github.com/EduardooSodre/a-rafa-criou`
2. Clique em **"Watch"** (👁️) → **"Custom"**
3. Marque: ✅ **"Releases"** e ✅ **"Discussions"**
4. Você receberá e-mail sempre que houver atualizações importantes

---

## �🔧 **Configurações Pós-Deploy**

### **1. Configurar Webhooks de Pagamento**

#### **Mercado Pago:**
1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione seu app
3. Em **"Webhooks"**, adicione:
   - URL: `https://arafacriou.com.br/api/webhooks/mercadopago`
   - Eventos: `payment`, `merchant_order`

#### **PayPal:**
1. Acesse: https://developer.paypal.com/dashboard/webhooks
2. Clique em **"Add Webhook"**
3. URL: `https://arafacriou.com.br/api/webhooks/paypal`
4. Eventos: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

### **2. Testar Pagamentos**

Antes de divulgar, faça compras teste:

1. Acesse o site: `https://arafacriou.com.br`
2. Adicione um produto ao carrinho
3. Finalize a compra com Mercado Pago (modo teste)
4. Verifique se o e-mail chegou
5. Faça login e teste o download do PDF

### **3. Google Search Console**

1. Acesse: https://search.google.com/search-console
2. Adicione a propriedade: `https://arafacriou.com.br`
3. Verifique via **meta tag** (Vercel facilita isso)
4. Submeta o sitemap: `https://arafacriou.com.br/sitemap.xml`

### **4. Google Analytics (Opcional)**

1. Crie uma propriedade GA4: https://analytics.google.com
2. Copie o ID de medição (ex: `G-XXXXXXXXXX`)
3. Adicione como variável de ambiente na Vercel:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
4. Faça redeploy do site

---

## 🛠️ **Comandos Úteis**

### **Redeploy Manual:**
- No painel da Vercel → **"Deployments"** → **"Redeploy"**

### **Ver Logs de Erro:**
- **"Deployments"** → Clique no deploy com erro → **"View Function Logs"**

### **Rollback (voltar versão):**
- **"Deployments"** → Encontre o deploy anterior que funcionava
- Clique nos 3 pontinhos → **"Promote to Production"**

---

## 🐛 **Troubleshooting**

### **Erro: "Environment Variable Missing"**
- Verifique se TODAS as variáveis obrigatórias foram adicionadas
- Atenção: `NEXT_PUBLIC_*` precisam estar em todas as etapas (Production, Preview, Development)

### **Erro: "Database Connection Failed"**
- Verifique se o `DATABASE_URL` está correto
- Teste a conexão no Neon.tech: https://console.neon.tech

### **Site não abre (404 ou 502)**
- Aguarde 5-10 minutos após o deploy
- Limpe o cache do navegador (Ctrl + Shift + R)
- Verifique se o DNS propagou: https://dnschecker.org

### **Pagamentos não funcionam**
- Verifique se configurou os webhooks
- Teste com cartões de teste do Mercado Pago
- Veja os logs em **"Functions"** → **"Logs"**

### **E-mails não chegam**
- Verifique se `RESEND_API_KEY` está correto
- Teste enviando um e-mail de teste
- Verifique a caixa de spam

---

## 📞 **Suporte**

### **Vercel:**
- Documentação: https://vercel.com/docs
- Status: https://vercel-status.com

### **Neon (Database):**
- Console: https://console.neon.tech
- Docs: https://neon.tech/docs

### **Cloudflare R2:**
- Dashboard: https://dash.cloudflare.com
- Docs: https://developers.cloudflare.com/r2

---

## ✅ **Checklist Final**

Antes de considerar o deploy completo:

- [ ] Site abre em `https://arafacriou.com.br`
- [ ] Redirecionamento `www` funciona
- [ ] Login funciona
- [ ] Cadastro funciona
- [ ] Pagamento com Mercado Pago funciona
- [ ] Pagamento com PayPal funciona
- [ ] E-mail de confirmação chega
- [ ] Download de PDF funciona
- [ ] Área da conta funciona
- [ ] Admin pode acessar `/admin`
- [ ] Google Search Console verificado
- [ ] Sitemap submetido
- [ ] Open Graph testado (Facebook Debugger)
- [ ] Site mobile responsivo

---

**Última atualização:** Novembro 2025  
**Desenvolvido por:** Eduardo Sodré  
**Contato:** [Seu contato aqui]
