# 🚀 Executar Migration - Sistema de Autenticação

## ⚠️ IMPORTANTE: Executar ANTES de usar o sistema

A migration adiciona os campos necessários para recuperação de senha no banco de dados.

---

## 📋 O que será adicionado

**Tabela:** `users`

**Novos campos:**
- `reset_token` (TEXT) - Token de recuperação de senha
- `reset_token_expiry` (TIMESTAMP) - Data de expiração do token

---

## 🔧 Opções de Execução

### **Opção 1: Drizzle Kit (Recomendado)**

```powershell
# Aplicar todas as migrations pendentes
npx drizzle-kit push:pg
```

**Vantagens:**
- ✅ Gerencia automaticamente todas as migrations
- ✅ Cria tabelas auxiliares de controle
- ✅ Previne execução duplicada

---

### **Opção 2: SQL Direto no Terminal**

```powershell
# Conectar ao banco e executar migration
psql $env:DATABASE_URL -f drizzle/0006_add_password_reset.sql
```

**Se usar bash/linux:**
```bash
psql $DATABASE_URL -f drizzle/0006_add_password_reset.sql
```

---

### **Opção 3: Copiar SQL e Executar Manualmente**

**1. Abra o arquivo:**
```
drizzle/0006_add_password_reset.sql
```

**2. Copie o conteúdo:**
```sql
-- Migration: Add password reset fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
```

**3. Execute no cliente PostgreSQL:**
- PgAdmin
- DBeaver
- TablePlus
- Qualquer cliente SQL

---

## ✅ Verificar se Migration foi Aplicada

### **No Terminal (psql):**

```powershell
psql $env:DATABASE_URL -c "\d users"
```

**Procure por:**
```
reset_token         | text      |
reset_token_expiry  | timestamp |
```

---

### **Query SQL:**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('reset_token', 'reset_token_expiry');
```

**Resultado esperado:**
```
     column_name     | data_type
---------------------+-----------
 reset_token         | text
 reset_token_expiry  | timestamp
```

---

## 🧪 Testar após Migration

### **1. Solicitar Reset de Senha**
```
1. Acesse: http://localhost:3000/auth/forgot-password
2. Digite seu e-mail
3. Clique em "Enviar Link de Recuperação"
4. Verifique o e-mail recebido
```

### **2. Verificar no Banco**
```sql
SELECT email, reset_token, reset_token_expiry 
FROM users 
WHERE reset_token IS NOT NULL;
```

**Exemplo de resultado:**
```
        email         |           reset_token            |   reset_token_expiry
----------------------+----------------------------------+------------------------
 usuario@example.com  | a3f2c1b9e7d6...                  | 2025-01-20 15:30:00
```

### **3. Redefinir Senha**
```
1. Clique no link do e-mail
2. Digite nova senha
3. Confirme senha
4. Clique em "Redefinir Senha"
```

### **4. Verificar Token Limpo**
```sql
SELECT email, reset_token, reset_token_expiry 
FROM users 
WHERE email = 'usuario@example.com';
```

**Resultado esperado (token limpo):**
```
        email         | reset_token | reset_token_expiry
----------------------+-------------+--------------------
 usuario@example.com  | null        | null
```

---

## ❌ Erros Comuns

### **Erro: "relation 'users' does not exist"**
**Causa:** Tabela users não existe
**Solução:** Execute as migrations anteriores primeiro
```powershell
npx drizzle-kit push:pg
```

---

### **Erro: "column 'reset_token' already exists"**
**Causa:** Migration já foi executada
**Solução:** Nada a fazer, já está aplicada ✅

---

### **Erro: "permission denied"**
**Causa:** Usuário do banco sem permissão para ALTER TABLE
**Solução:** Use usuário com privilégios de DDL (CREATE/ALTER)

---

## 🔐 Variáveis de Ambiente Necessárias

Certifique-se que estas variáveis estão configuradas:

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@host:port/database

# Resend (para e-mails)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# NextAuth
AUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

---

## 📝 Checklist Final

Antes de usar o sistema de autenticação:

- [ ] Migration executada (campos `reset_token` e `reset_token_expiry` existem)
- [ ] `RESEND_API_KEY` configurada no `.env`
- [ ] `AUTH_SECRET` configurada no `.env`
- [ ] Testado fluxo de recuperação de senha
- [ ] Testado Link Mágico (magic link)
- [ ] Testado visualização de senha
- [ ] E-mails sendo recebidos corretamente

---

## 🎯 Próximo Passo

Após executar a migration, teste o sistema completo seguindo o guia:
👉 **`AUTENTICACAO_PRODUCAO_COMPLETA.md`**

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique logs do servidor Next.js
2. Verifique logs do PostgreSQL
3. Teste conexão com o banco: `psql $DATABASE_URL -c "SELECT 1"`
