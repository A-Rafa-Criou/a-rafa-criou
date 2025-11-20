# 🔧 Correção de Erros - Email e OneSignal

## ❌ PROBLEMAS IDENTIFICADOS

### 1. Gmail: "Username and Password not accepted" (EAUTH 535)

**Erro:**
```
❌ Erro ao enviar email via Gmail: [Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Causa:**
- Senha de app do Gmail inválida, expirada ou não configurada
- Variável `GMAIL_APP_PASSWORD` incorreta no `.env.local`

**Solução:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Se aparecer "App passwords aren't recommended", clique em "Try anyway"
3. Selecione:
   - App: "Mail"
   - Device: "Windows Computer" (ou outro)
4. Clique em "Generate"
5. Copie a senha de 16 caracteres (formato: `xxxx xxxx xxxx xxxx`)
6. Cole no `.env.local` **SEM ESPAÇOS**:
   ```bash
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   ```
7. Reinicie servidor: `Ctrl+C` e `npm run dev`

**Verificação:**
- App Password deve ter 16 caracteres
- Usar MESMA conta do `GMAIL_USER`
- NÃO usar senha normal da conta

---

### 2. OneSignal: "não configurado"

**Erro:**
```
⚠️ OneSignal não configurado
⚠️ OneSignal não configurado - Web Push não enviado
```

**Causa:**
- Faltando `ONESIGNAL_REST_API_KEY` no `.env.local`

**Solução:**
1. Acesse: https://app.onesignal.com
2. Selecione seu app (ou ID: `173f6c22-d127-49d5-becc-f12054437d1b`)
3. Vá em: **Settings → Keys & IDs**
4. Copie: **REST API Key** (NÃO é o App ID)
5. Cole no `.env.local`:
   ```bash
   ONESIGNAL_REST_API_KEY=sua_rest_api_key_aqui
   ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
   NEXT_PUBLIC_ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
   ```
6. Reinicie servidor

**Verificação:**
- REST API Key começa com: `MWQ...` (formato UUID longo)
- Diferente do App ID (que já está configurado)

---

### 3. Resend: "domain is not verified"

**Erro:**
```
❌ Erro Resend: The seudominio.com.br domain is not verified
```

**Causa:**
- Domínio `seudominio.com.br` não verificado no Resend

**Solução (Temporária):**
- Sistema já faz fallback automático para Gmail
- Quando Gmail estiver funcionando, emails serão enviados normalmente

**Solução (Permanente):**
1. Acesse: https://resend.com/domains
2. Clique em "Add Domain"
3. Digite seu domínio: `seudominio.com.br` (ou use domínio real)
4. Adicione registros DNS:
   - TXT record para verificação
   - MX records para entrega
5. Aguarde verificação (pode levar até 48h)

**OU use email padrão do Resend:**
- Remetente será: `onboarding@resend.dev`
- Funciona sem verificação, mas não é profissional

---

## ✅ COMO TESTAR APÓS CORREÇÃO

### 1. Verificar .env.local

```bash
# Abrir arquivo
notepad .env.local

# Verificar linhas:
GMAIL_USER=edduardo2011@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx  # 16 caracteres SEM espaços
ONESIGNAL_REST_API_KEY=MWQ...        # REST API Key completa
ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
NEXT_PUBLIC_ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
```

### 2. Reiniciar Servidor

```bash
# Parar servidor (Ctrl+C)
# Reiniciar
npm run dev
```

### 3. Testar Email Admin

```bash
# Executar script de teste
npx tsx scripts/test-admin-email.ts
```

**Saída esperada (SUCESSO):**
```
🔍 Buscando admins no banco...
✅ Encontrado(s) 1 admin(s)

📧 Renderizando email de teste...
✅ Email renderizado com sucesso

📤 Enviando emails para admins...
  ✅ Email enviado para admin@example.com

✅ Teste concluído!
```

### 4. Testar Compra Real

1. Fazer compra no site (modo teste)
2. Verificar logs no terminal:
   ```
   ✅ Email enviado via Gmail
   ✅ Notificação de venda enviada para 1 admin(s)
   ✅ Notificações enviadas (Email + Web Push)
   ```
3. Verificar:
   - Cliente recebe email de confirmação
   - Admin recebe email sobre venda
   - Admin recebe Web Push (navegador)

---

## 🔍 CHECKLIST DE VERIFICAÇÃO

### Gmail
- [ ] `GMAIL_USER` é um email válido
- [ ] `GMAIL_APP_PASSWORD` tem 16 caracteres (sem espaços)
- [ ] App Password foi gerado em https://myaccount.google.com/apppasswords
- [ ] Usou MESMA conta do `GMAIL_USER`
- [ ] Servidor foi reiniciado após mudança

### OneSignal
- [ ] `ONESIGNAL_REST_API_KEY` copiada de Settings → Keys & IDs
- [ ] REST API Key começa com `MWQ...`
- [ ] App ID está correto: `173f6c22-d127-49d5-becc-f12054437d1b`
- [ ] Servidor foi reiniciado após mudança

### Banco de Dados
- [ ] Existe pelo menos 1 usuário com `role='admin'`
  ```sql
  SELECT id, email, role FROM users WHERE role = 'admin';
  ```
- [ ] Admin tem email válido no banco

---

## 📞 AINDA NÃO FUNCIONA?

### Se Gmail falhar novamente:

1. Verificar autenticação de 2 fatores está ATIVA:
   - https://myaccount.google.com/security
   - 2-Step Verification → DEVE estar ON

2. Gerar NOVA senha de app:
   - Deletar senha antiga em https://myaccount.google.com/apppasswords
   - Gerar nova senha
   - Atualizar `.env.local`

3. Verificar conta não está bloqueada:
   - https://myaccount.google.com/notifications
   - Verificar alertas de segurança

4. Testar com script:
   ```bash
   npx tsx scripts/test-admin-email.ts
   ```

### Se OneSignal falhar:

1. Verificar REST API Key:
   - https://app.onesignal.com → Settings → Keys & IDs
   - Copiar chave completa (muito longa, tipo UUID)

2. Verificar Service Workers:
   - Abrir: http://localhost:3000/OneSignalSDKWorker.js
   - Deve retornar: `importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');`

3. Verificar Console do navegador (F12):
   - Procurar por: "✅ OneSignal inicializado"
   - Se aparecer erro, copiar mensagem completa

---

## 🎯 PRÓXIMOS PASSOS

Após corrigir Gmail e OneSignal:

1. ✅ **Testar compra completa**
   - Fazer pedido no site
   - Verificar email do cliente
   - Verificar email do admin
   - Verificar Web Push no navegador admin

2. ✅ **Criar usuário admin (se não existir)**
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'seuemail@gmail.com';
   ```

3. ✅ **Monitorar logs**
   - Verificar: `✅ Notificação de venda enviada para X admin(s)`
   - Verificar: `✅ Email enviado via Gmail`

4. ✅ **Documentar**
   - Salvar App Password em local seguro
   - Salvar OneSignal REST API Key em local seguro
   - NÃO commitar `.env.local` no Git

---

## 📋 TEMPLATE .env.local

```bash
# ========================================
# EMAIL - Gmail (GRATUITO - 500/dia)
# ========================================
GMAIL_USER=edduardo2011@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx  # GERAR EM: https://myaccount.google.com/apppasswords

# ========================================
# EMAIL - Resend (Alternativa)
# ========================================
RESEND_API_KEY=re_xxxxxxxx            # OPCIONAL (domínio precisa ser verificado)

# ========================================
# ONESIGNAL - Web Push
# ========================================
ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
NEXT_PUBLIC_ONESIGNAL_APP_ID=173f6c22-d127-49d5-becc-f12054437d1b
ONESIGNAL_REST_API_KEY=MWQ...         # COPIAR DE: Settings → Keys & IDs

# ========================================
# OUTROS
# ========================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://...
AUTH_SECRET=...
# ...demais variáveis...
```

---

## 💡 DICAS FINAIS

1. **Gmail App Password expira?** 
   - Não, mas pode ser revogada se você trocar senha da conta
   - Guarde em local seguro (gerenciador de senhas)

2. **OneSignal REST API Key expira?**
   - Não, permanece ativa indefinidamente
   - Apenas se você regenerar manualmente

3. **Posso usar outro email que não seja Gmail?**
   - Sim, mas precisa configurar SMTP manualmente
   - Gmail é mais fácil (suporte nativo no código)

4. **Resend é melhor que Gmail?**
   - Gmail: 500 emails/dia GRÁTIS, fácil configurar
   - Resend: 100 emails/dia GRÁTIS, depois $0.001/email
   - Ambos funcionam bem para pequeno e-commerce

5. **Admin não recebe Web Push?**
   - Verificar tag `role:admin` no OneSignal Dashboard
   - Verificar Service Worker ativo em DevTools → Application
   - Admin precisa aceitar notificações no navegador
