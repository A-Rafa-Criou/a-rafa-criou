# 🔄 Workflow Fork - Resumo Visual

## 📊 Diagrama do Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│  REPOSITÓRIO ORIGINAL (Desenvolvedor)                           │
│  github.com/EduardooSodre/a-rafa-criou                         │
│                                                                  │
│  ✏️  Você desenvolve features                                   │
│  🧪 Testa localmente                                            │
│  ✅ Push para main                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Fork inicial
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  FORK DA CLIENTE                                                │
│  github.com/ClienteUsername/a-rafa-criou                       │
│                                                                  │
│  🔄 GitHub Actions (daily 3h AM)                               │
│  📥 Sync automático com upstream                               │
│  ✅ Merge automático                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Webhook
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL (Deploy Automático)                                     │
│  vercel.com/cliente/a-rafa-criou                               │
│                                                                  │
│  🚀 Build automático                                            │
│  📦 Deploy em produção                                          │
│  🌐 Site atualizado                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  SITE EM PRODUÇÃO                                               │
│  https://arafacriou.com.br                                      │
│                                                                  │
│  ✨ Sempre atualizado                                           │
│  🔒 Domínio da cliente                                          │
│  💳 Pagamentos funcionando                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⏱️ Timeline de Atualização

```
HORA          | AÇÃO                                    | QUEM
--------------|-----------------------------------------|------------------
09:00         | Você faz push de nova feature           | Desenvolvedor
09:01         | Commit aparece no GitHub                | GitHub
              |                                         |
03:00 (next)  | GitHub Actions detecta update           | Automático
03:01         | Sync fork com upstream                  | GitHub Actions
03:02         | Vercel detecta novo commit              | Vercel
03:03-03:05   | Build e deploy automático               | Vercel
03:06         | ✅ Site atualizado em produção          | Completo!
```

**⚡ Sync Manual:** Se urgente, cliente clica "Sync fork" → 2-3 minutos até site atualizar

---

## 🎯 Quem Faz O Quê

### 👨‍💻 **Você (Desenvolvedor)**

**Diariamente:**
- ✅ Desenvolve features
- ✅ Testa localmente
- ✅ Push para seu repo

**Raramente:**
- 📝 Cria releases para updates grandes
- 🚨 Ajuda resolver conflitos (se houver)
- 📞 Suporta cliente com dúvidas

**NUNCA:**
- ❌ Acessa Vercel da cliente
- ❌ Mexe no fork da cliente
- ❌ Configura variáveis de ambiente dela

---

### 👩‍💼 **Cliente**

**Na configuração inicial (1x):**
- ✅ Faz fork do seu repo
- ✅ Conecta fork na Vercel
- ✅ Configura variáveis de ambiente
- ✅ Configura domínio

**Diariamente:**
- ✅ NADA! Tudo automático ✨

**Raramente:**
- 🔄 Clica "Sync fork" se precisar atualização urgente
- 🐛 Reporta bugs para você
- 📧 Recebe notificações de releases

**NUNCA:**
- ❌ Mexe no código
- ❌ Faz commits no fork
- ❌ Precisa entender Git/GitHub

---

## 📁 Estrutura de Arquivos Importantes

```
a-rafa-criou/
│
├── .github/workflows/
│   └── sync-fork.yml              ← Sincronização automática (daily)
│
├── docs/
│   ├── DEPLOY_VERCEL_GUIA_CLIENTE.md      ← Guia para cliente
│   ├── WORKFLOW_DESENVOLVEDOR_FORK.md     ← Guia para você
│   └── WORKFLOW_FORK_RESUMO.md            ← Este arquivo
│
├── .env.example                   ← Template de variáveis (para cliente)
├── .env                          ← SEU .env (nunca commitado)
│
└── README.md                     ← Documentação do projeto
```

---

## 🔧 Comandos Úteis

### Para Você (Desenvolvedor)

```powershell
# Ver se cliente está desatualizado
git remote add cliente-fork https://github.com/CLIENTE/a-rafa-criou
git fetch cliente-fork
git log main..cliente-fork/main

# Criar release de versão
git tag -a v1.0.0 -m "Release v1.0.0: Nova funcionalidade"
git push origin v1.0.0

# Backup antes de update grande
git tag backup-$(Get-Date -Format "yyyyMMdd")
git push origin --tags
```

### Para Cliente

```
Opção 1 (Via Browser):
1. Acesse: https://github.com/SEU-USERNAME/a-rafa-criou
2. Clique: "Sync fork" → "Update branch"
3. Aguarde 2-3 minutos

Opção 2 (Via GitHub Actions):
1. Acesse: https://github.com/SEU-USERNAME/a-rafa-criou/actions
2. Clique: "Sync Fork with Upstream"
3. Clique: "Run workflow" → "Run workflow"
```

---

## 🚨 Troubleshooting Rápido

### **Problema:** Site não atualizou após sync

**Solução:**
1. Vercel → Deployments → Verify se o último deploy foi bem-sucedido
2. Se falhou, clique "Redeploy"
3. Se persistir, verifique logs em "View Function Logs"

### **Problema:** Conflito de merge no sync

**Solução:**
1. Cliente NÃO deve editar arquivos no fork
2. Se editou, você precisa resolver manualmente (ver WORKFLOW_DESENVOLVEDOR_FORK.md)
3. Configure `-X theirs` no sync-fork.yml para sempre usar sua versão

### **Problema:** GitHub Actions não está rodando

**Solução:**
1. Fork da cliente → Settings → Actions → General
2. Verificar se "Allow all actions" está selecionado
3. Verificar se "Read and write permissions" está ativo

### **Problema:** Cliente não recebe notificações de updates

**Solução:**
1. Acesse: https://github.com/EduardooSodre/a-rafa-criou
2. Botão "Watch" → "Custom"
3. Marcar "Releases"

---

## ✅ Checklist de Setup (Apenas 1x)

### Para Você (Desenvolvedor)

- [ ] Arquivo `.github/workflows/sync-fork.yml` commitado
- [ ] Arquivo `.env.example` criado e atualizado
- [ ] README.md atualizado com seção de deploy
- [ ] Documentação criada (`docs/DEPLOY_VERCEL_GUIA_CLIENTE.md`)
- [ ] `.gitignore` tem `.env` e `.env.local`

### Para Cliente (com sua ajuda)

- [ ] Conta GitHub criada
- [ ] Fork do repositório feito
- [ ] GitHub Actions habilitado no fork
- [ ] Conta Vercel criada (login com GitHub)
- [ ] Projeto importado na Vercel
- [ ] Variáveis de ambiente configuradas (todas do .env.example)
- [ ] Domínio `arafacriou.com.br` configurado
- [ ] DNS apontado para Vercel
- [ ] Site testado em produção
- [ ] Webhooks de pagamento configurados
- [ ] Google Search Console verificado

---

## 📈 Métricas de Sucesso

### ✅ **Workflow está funcionando se:**

- Cliente recebe atualizações em até 24h automaticamente
- Ou em 2-3 min quando faz sync manual
- Você não precisa acessar Vercel da cliente
- Cliente não precisa mexer em código
- Deploy automático funciona sem intervenção
- Site permanece estável após updates

### ⚠️ **Precisa ajustar se:**

- Sync falha frequentemente (>1x/semana)
- Conflitos de merge aparecem
- Cliente precisa fazer sync manual frequentemente
- Deploy falha após sync
- Variáveis de ambiente somem

---

## 🎓 Recursos de Aprendizado

### Para Cliente

- **GitHub Docs:** [Working with Forks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks)
- **Vercel Docs:** [Git Integration](https://vercel.com/docs/deployments/git)
- **YouTube:** "Como fazer deploy na Vercel" (vários tutoriais em PT-BR)

### Para Você

- **GitHub Actions:** [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- **Git Book:** [Git Branching](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- **Vercel API:** [Deployment API](https://vercel.com/docs/rest-api/endpoints/deployments)

---

## 📞 Suporte

### Para Cliente

**Dúvidas sobre:**
- Fork não sincroniza → Verificar GitHub Actions
- Deploy falha → Verificar Vercel logs
- Site caiu → Rollback na Vercel (Deployments → Promote anterior)
- Variável missing → Verificar Environment Variables

**Contato Desenvolvedor:** [Seu e-mail/Discord aqui]

### Para Você

**Recursos:**
- GitHub Status: https://www.githubstatus.com
- Vercel Status: https://www.vercel-status.com
- Vercel Discord: https://discord.gg/vercel

---

## 🎉 Conclusão

Este workflow permite:

✅ **Você:** Desenvolve com controle total, sem preocupação com deploy  
✅ **Cliente:** Recebe updates automáticos, sem mexer em código  
✅ **Site:** Sempre atualizado, estável, em produção  

**Próximo Passo:** Envie `docs/DEPLOY_VERCEL_GUIA_CLIENTE.md` para sua cliente e ajude no setup inicial!

---

**Última atualização:** Novembro 2025  
**Workflow:** Fork + GitHub Actions + Vercel Deploy
