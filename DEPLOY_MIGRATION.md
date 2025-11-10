# 🚀 Guia de Deploy - Sistema de Promoções

## ⚠️ IMPORTANTE: Aplicar Migração ANTES do Deploy

O sistema de promoções requer novas tabelas no banco de dados. Execute este comando **UMA VEZ** antes do deploy na Vercel:

---

## 📋 Passo a Passo

### **Opção A: Via Terminal Local (Recomendado)**

1. **Configure a variável de ambiente de produção:**

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://usuario:senha@host:5432/database"

# Linux/Mac
export DATABASE_URL="postgresql://usuario:senha@host:5432/database"
```

2. **Execute a migração:**

```bash
npm run db:push
```

3. **Pronto!** Agora pode fazer deploy na Vercel normalmente.

---

### **Opção B: Via Vercel CLI**

Se você tem acesso ao Vercel CLI:

```bash
# Instalar Vercel CLI (se não tiver)
npm install -g vercel

# Login
vercel login

# Linkar projeto
vercel link

# Executar migração no ambiente de produção
vercel env pull .env.production
npm run db:push
```

---

### **Opção C: Executar SQL Manualmente**

Se preferir, pode executar o SQL direto no banco:

1. **Acesse o arquivo:** `drizzle/0022_add_promotions.sql`

2. **Execute o conteúdo no seu cliente PostgreSQL** (pgAdmin, DBeaver, etc.)

3. **Confirme que as tabelas foram criadas:**

```sql
-- Verificar se tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('promotions', 'promotion_products', 'promotion_variations');
```

Deve retornar 3 tabelas.

---

## ✅ Tabelas Criadas

Após a migração, estas tabelas estarão disponíveis:

- `promotions` - Dados das promoções (nome, desconto, datas)
- `promotion_products` - Relação promoção ↔ produto
- `promotion_variations` - Relação promoção ↔ variação

---

## 🔒 Variáveis de Ambiente Necessárias

Certifique-se de que a Vercel tem estas variáveis configuradas:

**Settings → Environment Variables:**

| Nome | Valor | Ambiente |
|------|-------|----------|
| `DATABASE_URL` | `postgresql://...` | Production, Preview, Development |
| `NEXTAUTH_SECRET` | (seu secret) | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://seu-dominio.com` | Production |
| `R2_ACCOUNT_ID` | (Cloudflare R2) | Production |
| `R2_ACCESS_KEY_ID` | (Cloudflare R2) | Production |
| `R2_SECRET_ACCESS_KEY` | (Cloudflare R2) | Production |
| `R2_BUCKET_NAME` | (Cloudflare R2) | Production |

---

## 🐛 Troubleshooting

### **Erro: "relation 'promotions' does not exist"**

➜ A migração não foi aplicada. Execute `npm run db:push` conforme Opção A.

### **Erro: "permission denied for schema public"**

➜ O usuário do banco não tem permissões. Execute como superuser ou adicione permissões:

```sql
GRANT ALL ON SCHEMA public TO seu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seu_usuario;
```

### **Erro: "connection timeout"**

➜ Verifique se o IP da sua máquina está liberado no firewall do banco (ex: Neon, Supabase, Railway).

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs da Vercel: **Dashboard → Deployments → [último deploy] → Function Logs**
2. Confirme que `DATABASE_URL` está configurada corretamente
3. Teste a conexão local: `npm run db:studio` (abre interface do banco)

---

**Após aplicar a migração, o sistema de promoções estará 100% funcional!** 🎉
