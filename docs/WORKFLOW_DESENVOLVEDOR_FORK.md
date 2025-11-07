# 🔧 Guia do Desenvolvedor - Workflow com Fork

## 📋 **Visão Geral**

Este documento explica o workflow de desenvolvimento usando **fork** onde:
- **Você (EduardooSodre):** Mantém o repositório original
- **Cliente:** Faz fork e sincroniza automaticamente
- **Vercel:** Deploy automático do fork da cliente

---

## 🎯 **Vantagens deste Workflow**

### **Para Você:**
- ✅ **Controle total** do código-fonte
- ✅ **Testa localmente** antes de publicar
- ✅ **Múltiplos clientes** podem usar forks do mesmo código
- ✅ **Portfólio público** mantido no seu GitHub

### **Para a Cliente:**
- ✅ **Deploy independente** na Vercel dela
- ✅ **Atualizações automáticas** do seu repo
- ✅ **Sem necessidade** de mexer em código
- ✅ **Domínio próprio** funcionando

---

## 🚀 **Workflow de Atualização**

### **Fluxo Completo:**

```
Seu Repositório (EduardooSodre/a-rafa-criou)
        ↓
    git push (você faz update)
        ↓
GitHub Actions no fork da cliente detecta
        ↓
    Sync automático (3h da manhã)
        ↓
Fork da Cliente (ClienteUsername/a-rafa-criou)
        ↓
    Vercel detecta novo commit
        ↓
Deploy automático → arafacriou.com.br atualizado
```

---

## 📝 **Como Fazer Atualizações**

### **Passo 1: Desenvolver Localmente**

```powershell
# Criar nova branch para feature
git checkout -b feature/nova-funcionalidade

# Fazer alterações...
# ... editar arquivos ...

# Testar localmente
npm run dev
npm run build

# Commit
git add .
git commit -m "feat: adiciona nova funcionalidade X"
```

### **Passo 2: Testar Tudo**

```powershell
# Build de produção
npm run build

# Verificar erros
npm run lint

# Testar no navegador
# - Login/Logout
# - Pagamento teste
# - Download de PDF
```

### **Passo 3: Merge para Main**

```powershell
# Voltar para main
git checkout main

# Merge da feature
git merge feature/nova-funcionalidade

# Push para GitHub
git push origin main
```

### **Passo 4: Aguardar Sincronização**

A partir daqui é **automático**:

1. **GitHub Actions do fork da cliente** roda diariamente (3h AM)
2. **Detecta novos commits** no seu repo
3. **Faz merge automático** para o fork dela
4. **Vercel detecta** o novo commit
5. **Deploy automático** em produção

---

## ⚡ **Sincronização Manual (Emergência)**

Se precisar que a cliente receba updates IMEDIATAMENTE:

### **Opção 1: Ela clica no GitHub**

Peça para ela:
1. Acessar: `https://github.com/SEU-CLIENTE-USERNAME/a-rafa-criou`
2. Clicar em **"Sync fork"** → **"Update branch"**
3. Aguardar 2-3 minutos
4. ✅ Vercel faz deploy automático

### **Opção 2: Via GitHub Actions**

Peça para ela:
1. Acessar: `https://github.com/SEU-CLIENTE-USERNAME/a-rafa-criou/actions`
2. Clicar em **"Sync Fork with Upstream"**
3. Clicar em **"Run workflow"** → **"Run workflow"**
4. ✅ Sincronização imediata

### **Opção 3: Você ajuda ela (via Discord/WhatsApp)**

Se ela não souber mexer:
```
"Oi! Publiquei uma atualização importante. 
Pode acessar este link:
https://github.com/SEU-CLIENTE-USERNAME/a-rafa-criou/actions/workflows/sync-fork.yml

E clicar em 'Run workflow' → 'Run workflow'?
Em 2 minutos o site estará atualizado automaticamente!"
```

---

## 📦 **Releases e Versionamento**

### **Como Criar Releases**

Para updates grandes, crie releases no seu repo:

```powershell
# Criar tag de versão
git tag -a v1.0.0 -m "Release v1.0.0: Sistema de afiliados"
git push origin v1.0.0
```

### **No GitHub:**

1. Vá em **"Releases"** → **"Create a new release"**
2. Escolha a tag: `v1.0.0`
3. Título: **"v1.0.0 - Sistema de Afiliados"**
4. Descrição:
```markdown
## ✨ Novidades
- Sistema de afiliados completo
- Dashboard para afiliados
- Rastreamento de comissões

## 🐛 Correções
- Corrigido bug no carrinho
- Melhorado performance do banco

## ⚠️ Breaking Changes
Nenhuma mudança que quebre compatibilidade
```

5. ✅ **"Publish release"**

### **Cliente Recebe Notificação:**

Se ela configurou o **"Watch"** no seu repo original, receberá e-mail:

> **Nova Release: v1.0.0 - Sistema de Afiliados**  
> EduardooSodre/a-rafa-criou  
> [Ver mudanças]

---

## 🔍 **Monitoramento**

### **Verificar se Cliente Está Sincronizado:**

1. Acesse: `https://github.com/CLIENTE-USERNAME/a-rafa-criou`
2. Olhe o aviso abaixo do título do repo:
   - ✅ **"This branch is up to date with EduardooSodre:main"** → OK!
   - ⚠️ **"This branch is 3 commits behind EduardooSodre:main"** → Desatualizado

### **Ver Histórico de Syncs:**

1. Acesse: `https://github.com/CLIENTE-USERNAME/a-rafa-criou/actions`
2. Clique em **"Sync Fork with Upstream"**
3. Veja todas as execuções diárias

---

## 🚨 **Conflitos de Merge**

### **Quando Acontecem:**

Se a cliente editar arquivos no fork dela E você editar os mesmos arquivos:

```
CONFLITO: src/app/page.tsx
Você alterou linha 10
Cliente alterou linha 10
```

### **Como Resolver:**

**Opção 1: Você resolve (Recomendado)**

1. Clone o fork da cliente temporariamente:
```powershell
git clone https://github.com/CLIENTE-USERNAME/a-rafa-criou temp-cliente
cd temp-cliente
git remote add upstream https://github.com/EduardooSodre/a-rafa-criou
git fetch upstream
git merge upstream/main
# Resolve conflitos manualmente
git push origin main
```

**Opção 2: Regra "Seu Repo Sempre Vence"**

Configure no fork da cliente para sempre aceitar suas mudanças:

Edite `.github/workflows/sync-fork.yml`:
```yaml
- name: Sync with Upstream
  run: |
    git checkout main
    git merge upstream/main -X theirs --no-edit
```

Explicação: `-X theirs` = em caso de conflito, usa SEMPRE a versão do upstream (sua)

---

## 🎯 **Boas Práticas**

### **✅ DO:**

1. **Commits descritivos:**
   ```
   feat: adiciona sistema de cupons
   fix: corrige bug no checkout
   docs: atualiza README com setup
   ```

2. **Testar TUDO antes de push:**
   - Build sem erros
   - Login/Logout
   - Pagamento teste
   - Downloads

3. **Comunicar updates grandes:**
   - Envie mensagem à cliente
   - Explique o que mudou
   - Avise se precisa configurar algo

4. **Usar branches para features:**
   - Não comite direto na `main`
   - Teste na branch primeiro
   - Merge só quando estável

### **❌ DON'T:**

1. **Não comite credenciais:**
   - Nunca `.env` no repo
   - Use `.env.example` apenas

2. **Não mude estrutura drasticamente:**
   - Migrações de banco devem ter script
   - Mudanças de pastas devem ser documentadas

3. **Não depende de arquivos locais:**
   - Tudo deve estar no repo
   - Sem dependências externas não documentadas

---

## 📊 **Checklist de Deploy de Update**

Antes de fazer push de uma atualização:

**Desenvolvimento:**
- [ ] Código testado localmente
- [ ] `npm run build` sem erros
- [ ] `npm run lint` sem erros críticos
- [ ] Testado em Chrome, Firefox, Safari
- [ ] Testado em mobile (DevTools)

**Segurança:**
- [ ] Nenhuma credencial no código
- [ ] `.env` está no `.gitignore`
- [ ] API routes têm validação
- [ ] Dados sensíveis não vão para cliente

**Comunicação:**
- [ ] Commit message descritivo
- [ ] Se update grande: criar Release
- [ ] Se breaking change: avisar cliente
- [ ] Documentação atualizada (se necessário)

**Pós-Deploy:**
- [ ] Aguardar sync (3h AM ou manual)
- [ ] Verificar Vercel logs da cliente
- [ ] Testar site em produção dela
- [ ] Confirmar com cliente que está OK

---

## 🛠️ **Comandos Rápidos**

```powershell
# Ver diferença entre seu repo e fork da cliente
git remote add cliente-fork https://github.com/CLIENTE-USERNAME/a-rafa-criou
git fetch cliente-fork
git log main..cliente-fork/main

# Ver quais arquivos foram alterados no fork dela
git diff main..cliente-fork/main --name-only

# Criar backup antes de update grande
git tag backup-$(date +%Y%m%d)
git push origin --tags

# Forçar sync do fork da cliente (se ela te der acesso)
gh repo sync CLIENTE-USERNAME/a-rafa-criou -b main
```

---

## 📞 **Suporte à Cliente**

### **Resposta Pronta para "O site não atualizou":**

```
Oi! Vou te ajudar a atualizar:

1. Acesse: https://github.com/SEU-USERNAME/a-rafa-criou
2. Clique no botão verde "Sync fork"
3. Depois clique em "Update branch"
4. Aguarde 2-3 minutos

O site será atualizado automaticamente!

Se não funcionar, me avise que eu sincronizo manualmente aqui.
```

### **Resposta para "Deu erro no deploy":**

```
Entendi! Vou verificar:

1. Pode me mandar o link do deploy com erro?
   (Ex: https://vercel.com/CLIENTE/a-rafa-criou/DEPLOY-ID)

2. Enquanto isso, vou fazer um rollback:
   - Acesse: https://vercel.com/CLIENTE/a-rafa-criou/deployments
   - Encontre o deploy anterior que funcionava
   - Clique nos 3 pontinhos → "Promote to Production"

Seu site voltará ao normal em 30 segundos!
```

---

## ✅ **Resumo: Seu Workflow Diário**

1. **Desenvolver** na sua branch local
2. **Testar** tudo com `npm run build`
3. **Commitar** com mensagem descritiva
4. **Push** para `main` do seu repo
5. **Aguardar** sync automático (3h AM) OU
6. **Pedir** para cliente rodar sync manual
7. **Verificar** se Vercel dela fez deploy
8. **Confirmar** com cliente que está OK

---

**Última atualização:** Novembro 2025  
**Workflow:** Fork + Sync Automático + Vercel
