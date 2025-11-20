# ✅ Gmail Autenticado - Como Resolver o Erro no Next.js

## 🎉 BOA NOTÍCIA

O script de teste confirma que a **autenticação Gmail está FUNCIONANDO**:

```
✅ Autenticação Gmail FUNCIONANDO!
✅ Email de teste enviado com sucesso!
```

## ❌ PROBLEMA

O servidor Next.js ainda mostra erro `EAUTH 535` porque está usando **variáveis de ambiente antigas em cache**.

## 🔧 SOLUÇÃO RÁPIDA

### 1. Parar TODOS os servidores

No terminal PowerShell, pressione:

```bash
Ctrl + C
```

Se tiver múltiplos terminais rodando, pare todos.

### 2. Limpar cache do Turbopack

```powershell
Remove-Item -Recurse -Force .next
```

### 3. Reiniciar servidor

```powershell
npm run dev
```

### 4. Testar compra

Faça uma compra de teste e verifique os logs. Deve aparecer:

```
✅ Email enviado via Gmail
✅ Notificação de venda enviada para X admin(s)
✅ Notificações enviadas (Email + Web Push)
```

---

## 🔍 POR QUE ISSO ACONTECEU?

### Problema: Cache de Variáveis de Ambiente

O Next.js (especialmente com Turbopack) **carrega as variáveis de ambiente na inicialização** e mantém em cache. Quando você atualiza `.env.local`, o servidor rodando não detecta automaticamente.

### Variáveis Afetadas:

- `GMAIL_USER=edduardooo2011@gmail.com` ✅
- `GMAIL_APP_PASSWORD=sctndahcijexjmwb` ✅
- `ONESIGNAL_REST_API_KEY=os_v2_app_c47...` ✅

Todas estão **corretas** no arquivo, mas o servidor estava usando valores antigos.

---

## 📋 CHECKLIST COMPLETO

### Antes de Testar:

- [x] Gmail App Password configurado (16 caracteres, sem espaços)
- [x] Variável `GMAIL_USER` no `.env.local`
- [x] Variável `GMAIL_APP_PASSWORD` no `.env.local`
- [x] OneSignal REST API Key configurado
- [x] Script de teste funcionando (`npx tsx scripts/test-gmail-auth.ts`)
- [ ] **Servidor Next.js REINICIADO** (Ctrl+C e `npm run dev`)
- [ ] Cache limpo (`.next` deletado)

### Durante Teste:

1. Fazer compra de teste
2. Verificar logs no terminal
3. Verificar email recebido:
   - Cliente: email de confirmação ✅
   - Admin: email de nova venda ✅
4. Verificar Web Push (navegador)

---

## 🚨 SE AINDA NÃO FUNCIONAR

### Verificação 1: Servidor está usando .env.local correto?

```powershell
# No terminal do servidor Next.js, adicionar log temporário
echo "GMAIL_USER: $env:GMAIL_USER"
```

Se aparecer vazio, o Next.js não está carregando o arquivo.

### Verificação 2: Múltiplos arquivos .env?

```powershell
Get-ChildItem -Filter ".env*"
```

**Ordem de prioridade:**

1. `.env.local` (MAIOR prioridade - use este)
2. `.env.development.local`
3. `.env.development`
4. `.env`

Certifique-se que `GMAIL_USER` e `GMAIL_APP_PASSWORD` estão no `.env.local`.

### Verificação 3: Reinício completo

```powershell
# Matar TODOS os processos Node.js
Get-Process node | Stop-Process -Force

# Limpar cache
Remove-Item -Recurse -Force .next

# Reiniciar
npm run dev
```

---

## 📧 CONFIRMAÇÃO DE SUCESSO

### Logs Esperados (Cliente):

```
❌ Erro Resend: API key is invalid  (ESPERADO - domínio não verificado)
⚠️ Resend falhou, tentando Gmail...  (ESPERADO - fallback automático)
✅ Email enviado via Gmail: <message-id>  (SUCESSO!)
✅ Notificações enviadas (Email + Web Push)  (SUCESSO!)
```

### Logs Esperados (Admin):

```
✅ Email enviado via Gmail: <message-id>  (SUCESSO!)
✅ Notificação de venda enviada para 3 admin(s)  (SUCESSO!)
```

### Emails Recebidos:

1. **Cliente** (`edduardooo2011@gmail.com`):
   - Assunto: "Pedido #[ID] Confirmado!"
   - Conteúdo: Confirmação de pedido + links de download

2. **Admins** (3 admins encontrados):
   - `edduardooo2011@gmail.com`
   - `byrafaelapereirajw@gmail.com`
   - `arafacriou@gmail.com`
   - Assunto: "🛒 Nova Venda - [Nome Cliente] - R$ [Total]"
   - Conteúdo: Detalhes da venda completos

---

## 🎯 RESUMO

| Item                 | Status         | Ação          |
| -------------------- | -------------- | ------------- |
| Gmail App Password   | ✅ Funcionando | Nenhuma       |
| Variáveis .env.local | ✅ Corretas    | Nenhuma       |
| Script de teste      | ✅ Passou      | Nenhuma       |
| Servidor Next.js     | ⚠️ Cache       | **REINICIAR** |
| OneSignal REST API   | ✅ Configurado | Nenhuma       |
| Admins no banco      | ✅ 3 admins    | Nenhuma       |

---

## 🔑 COMANDOS RÁPIDOS

### Parar servidor e limpar cache:

```powershell
# Ctrl+C no terminal do servidor
Remove-Item -Recurse -Force .next; npm run dev
```

### Testar autenticação Gmail:

```powershell
npx tsx scripts/test-gmail-auth.ts
```

### Testar email ao admin:

```powershell
npx tsx scripts/test-admin-email.ts
```

### Ver admins no banco:

```powershell
npx tsx -e "import { db } from './src/lib/db'; import { users } from './src/lib/db/schema'; import { eq } from 'drizzle-orm'; db.select().from(users).where(eq(users.role, 'admin')).then(console.log)"
```

---

## ✅ PRÓXIMO PASSO

**REINICIE O SERVIDOR:**

1. Vá ao terminal do `npm run dev`
2. Pressione `Ctrl + C`
3. Execute: `npm run dev`
4. Faça uma compra de teste
5. Verifique os logs e emails recebidos

Após reiniciar, o erro `EAUTH 535` deve desaparecer e os emails devem ser enviados com sucesso! 🎉
