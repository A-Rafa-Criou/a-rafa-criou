# 🧪 Guia de Teste de Migração em Desenvolvimento

## ✅ Você PODE Testar Tudo Localmente Antes!

**Objetivo:** Validar toda a migração sem mexer no domínio ou site em produção.

---

## 📋 Passo 1: Preparar Ambiente de Teste Local

### **1.1 Banco de Dados de Teste**

Você tem 2 opções:

#### **Opção A: Usar banco local (Recomendado)**

```bash
# Se não tem PostgreSQL local, usar Docker
docker run --name postgres-test -e POSTGRES_PASSWORD=senha123 -p 5432:5432 -d postgres:15

# Criar banco de testes
docker exec -it postgres-test psql -U postgres -c "CREATE DATABASE arafacriou_test;"
```

#### **Opção B: Criar banco separado no Neon/Vercel**

```bash
# No Neon.tech, criar novo projeto:
# Nome: "a-rafa-criou-TESTE"
# Não vai custar nada - é grátis
```

### **1.2 Configurar variáveis de ambiente de teste**

Crie: `.env.local.test`

```bash
# Banco de TESTE (não é o de produção!)
DATABASE_URL="postgresql://user:senha@localhost:5432/arafacriou_test"

# R2 de TESTE (pode criar bucket separado ou usar mesmo)
R2_BUCKET="arafacriou-test"
R2_ACCOUNT_ID="seu-account-id"
R2_ACCESS_KEY_ID="sua-key"
R2_SECRET_ACCESS_KEY="sua-secret"

# Resend em modo teste
RESEND_API_KEY="sua-key-teste"

# Next.js local
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="qualquer-coisa-para-teste"
```

### **1.3 Rodar migrations no banco de teste**

```bash
# Copiar .env.local.test para .env.local temporariamente
cp .env.local.test .env.local

# Rodar migrations
npm run db:push

# Verificar se tabelas foram criadas
npm run db:studio
```

---

## 📊 Passo 2: Exportar SAMPLE dos Dados do WordPress

**Importante:** Não precisa exportar TUDO. Exporte apenas uma amostra para teste!

### **2.1 Exportar 10-20 clientes de teste**

```sql
-- No phpMyAdmin do WordPress
-- Copiar apenas primeiros 20 clientes
SELECT
  u.ID as id,
  u.user_email as email,
  u.user_pass as password_hash,
  u.display_name as name,
  u.user_registered as created_at,
  MAX(CASE WHEN um.meta_key = 'billing_phone' THEN um.meta_value END) as phone
FROM wp_users u
LEFT JOIN wp_usermeta um ON u.ID = um.user_id
GROUP BY u.ID
LIMIT 20;
```

**Salvar como:** `data/test-clientes.csv`

### **2.2 Exportar 5-10 pedidos de teste**

```sql
-- Apenas pedidos dos clientes de teste
SELECT
  p.ID as order_id,
  p.post_date as order_date,
  pm_customer.meta_value as customer_email,
  pm_total.meta_value as total,
  pm_status.meta_value as order_status
FROM wp_posts p
LEFT JOIN wp_postmeta pm_customer ON p.ID = pm_customer.post_id
  AND pm_customer.meta_key = '_billing_email'
LEFT JOIN wp_postmeta pm_total ON p.ID = pm_total.post_id
  AND pm_total.meta_key = '_order_total'
LEFT JOIN wp_postmeta pm_status ON p.ID = pm_status.post_id
  AND pm_status.meta_key = '_order_status'
WHERE p.post_type = 'shop_order'
  AND p.post_status = 'wc-completed'
ORDER BY p.post_date DESC
LIMIT 10;
```

**Salvar como:** `data/test-pedidos.csv`

### **2.3 Exportar 3-5 produtos de teste**

```sql
SELECT
  p.ID as product_id,
  p.post_title as name,
  p.post_content as description
FROM wp_posts p
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
LIMIT 5;
```

**Salvar como:** `data/test-produtos.csv`

---

## 🔧 Passo 3: Criar Scripts de Importação de Teste

### **3.1 Script para testar importação de clientes**

Crie: `scripts/test-import-customers.ts`

```typescript
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

async function testImportCustomers() {
  console.log('🧪 TESTE: Importação de Clientes\n');

  // Ler CSV de teste
  const csvContent = fs.readFileSync('data/test-clientes.csv', 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`📊 Total de clientes no CSV: ${records.length}\n`);

  let success = 0;
  let errors = 0;

  for (const customer of records) {
    try {
      // Verificar se já existe
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, customer.email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Já existe: ${customer.email}`);
        continue;
      }

      // Inserir
      await db.insert(users).values({
        email: customer.email.toLowerCase(),
        name: customer.name,
        phone: customer.phone || null,
        password: customer.password_hash, // Hash phpass do WP
        role: 'customer',
        createdAt: new Date(customer.created_at),
        legacyPasswordType: 'wordpress_phpass',
      });

      console.log(`✅ Importado: ${customer.email}`);
      success++;
    } catch (error) {
      console.error(`❌ Erro: ${customer.email}`, error);
      errors++;
    }
  }

  console.log(`\n📈 Resultado:`);
  console.log(`   ✅ Sucesso: ${success}`);
  console.log(`   ❌ Erros: ${errors}`);
}

testImportCustomers();
```

### **3.2 Rodar o teste**

```bash
# Instalar dependência se não tiver
npm install csv-parse

# Rodar teste
npx tsx scripts/test-import-customers.ts
```

---

## ✅ Passo 4: Validar Resultados

### **4.1 Abrir Drizzle Studio**

```bash
npm run db:studio
```

Acesse: http://localhost:4983

**Verificar:**
- ✅ Clientes importados na tabela `users`
- ✅ E-mails corretos
- ✅ Campo `legacyPasswordType` = 'wordpress_phpass'
- ✅ Datas de criação corretas

### **4.2 Testar login com senha do WordPress**

1. Escolha um cliente de teste
2. Acesse: http://localhost:3000/auth/signin
3. Tente fazer login com:
   - Email do WordPress
   - Senha do WordPress (a que você sabe do cliente de teste)

**Esperado:**
- ✅ Login funciona
- ✅ Senha é convertida automaticamente para bcrypt
- ✅ Próximo login já usa bcrypt

### **4.3 Verificar conversão de senha**

```bash
# No Drizzle Studio, verificar o usuário que fez login:
# Campos devem estar:
# - password: (hash bcrypt novo)
# - legacyPasswordType: null
# - legacyPasswordHash: null
```

---

## 🧪 Passo 5: Testar Download de PDFs

### **5.1 Fazer upload de 1 PDF de teste no R2**

```typescript
// scripts/test-upload-pdf.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function testUploadPDF() {
  // Criar PDF de teste simples
  const testPDF = Buffer.from('%PDF-1.4\nTeste de PDF');
  const fileName = 'test/produto-teste.pdf';

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: fileName,
      Body: testPDF,
      ContentType: 'application/pdf',
    })
  );

  console.log('✅ PDF de teste enviado para R2:', fileName);
}

testUploadPDF();
```

### **5.2 Testar geração de URL assinada**

```bash
# Acesse no navegador:
http://localhost:3000/api/download/[productId]

# Deve:
# 1. Verificar se usuário comprou
# 2. Gerar URL assinada do R2
# 3. Redirecionar para download
```

---

## 🔄 Passo 6: Teste de Pedido Completo (E2E)

### **6.1 Fazer um pedido de teste**

```bash
# Acesse: http://localhost:3000

# Fluxo completo:
1. Adicionar produto ao carrinho
2. Ir para checkout
3. Preencher dados
4. Usar método de pagamento de teste (Stripe test mode)
5. Finalizar pedido
```

### **6.2 Verificar se tudo foi criado**

**No Drizzle Studio:**
- ✅ Registro em `orders`
- ✅ Registro em `order_items`
- ✅ Registro em `download_permissions`

**No site:**
- ✅ Acesse: http://localhost:3000/conta/pedidos
- ✅ Pedido aparece na lista
- ✅ Botão de download funciona
- ✅ PDF é baixado

---

## 📊 Passo 7: Comparar Dados (WordPress vs Next.js)

### **7.1 Script de comparação**

Crie: `scripts/compare-migration.ts`

```typescript
async function compareMigration() {
  console.log('🔍 Comparando Dados:\n');

  // Contar clientes
  const nextCustomers = await db.select({ count: count() }).from(users);
  console.log(`Clientes importados: ${nextCustomers[0].count} / 20 esperados`);

  // Contar pedidos
  const nextOrders = await db.select({ count: count() }).from(orders);
  console.log(`Pedidos importados: ${nextOrders[0].count} / 10 esperados`);

  // Listar e-mails importados
  const emails = await db.select({ email: users.email }).from(users);
  console.log('\n📧 E-mails importados:');
  emails.forEach(u => console.log(`   - ${u.email}`));

  // Verificar produtos sem permissão
  const ordersWithoutPerms = await db
    .select()
    .from(orders)
    .leftJoin(downloadPermissions, eq(orders.id, downloadPermissions.orderId))
    .where(and(eq(orders.status, 'completed'), isNull(downloadPermissions.id)));

  console.log(`\n⚠️ Pedidos sem permissão de download: ${ordersWithoutPerms.length}`);
}

compareMigration();
```

---

## ✅ Checklist de Testes Locais

Antes de mexer em PRODUÇÃO, valide:

- [ ] Banco de teste criado
- [ ] Migrations rodadas no banco de teste
- [ ] CSV de amostra exportado do WordPress
- [ ] Script de importação funciona
- [ ] Clientes importados corretamente
- [ ] Login com senha WordPress funciona
- [ ] Senha é convertida para bcrypt
- [ ] PDF de teste enviado para R2
- [ ] URL assinada funciona
- [ ] Download de PDF funciona
- [ ] Pedido de teste completo (E2E)
- [ ] Permissões de download criadas
- [ ] Comparação de dados ok

---

## 🎯 Quando Tudo Estiver OK Localmente

### **Fase 1: Ambiente de Staging (Opcional mas Recomendado)**

```bash
# Criar preview deployment no Vercel
git checkout -b migracao-teste
git add .
git commit -m "test: ambiente de teste para migração"
git push origin migracao-teste

# Vercel vai criar URL tipo:
# https://a-rafa-criou-git-migracao-teste.vercel.app
```

**Configurar banco de staging:**
- Criar banco separado no Neon: `arafacriou-staging`
- Atualizar `DATABASE_URL` no Vercel para preview branch
- Testar tudo novamente nesse ambiente

### **Fase 2: Migração de Produção**

Só depois de validar em:
1. ✅ Local (localhost:3000)
2. ✅ Staging (preview deployment)

Aí sim você parte para produção seguindo o guia completo.

---

## 🚨 Vantagens de Testar Localmente Primeiro

1. **Zero risco:** Não afeta site em produção
2. **Iterativo:** Pode testar, ajustar, testar de novo
3. **Aprendizado:** Entende todo o processo antes
4. **Debug fácil:** Pode usar breakpoints, logs, etc
5. **Sem pressa:** Testa no seu tempo
6. **Rollback instantâneo:** Só apagar banco de teste
7. **Confiança:** Quando for fazer de verdade, já domina

---

## 💡 Dicas Importantes

### **Erros comuns e como resolver:**

**1. "Cannot find module csv-parse"**
```bash
npm install csv-parse
```

**2. "Database connection failed"**
```bash
# Verificar se PostgreSQL está rodando
docker ps

# Ver logs do container
docker logs postgres-test
```

**3. "Senha do WordPress não funciona"**
```typescript
// Verificar se implementou a função verifyWordPressPassword
// no src/lib/auth/config.ts
```

**4. "R2 upload fails"**
```bash
# Verificar variáveis de ambiente
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID
```

---

## 📞 Próximos Passos

Depois de validar tudo localmente:

1. ✅ Criar branch de staging
2. ✅ Deploy no Vercel (preview)
3. ✅ Testar com dados reais (sample pequeno)
4. ✅ Convidar beta testers (5-10 pessoas)
5. ✅ Coletar feedback
6. ✅ Ajustar bugs
7. ✅ Fazer migração completa em produção

---

## 🎉 Resumo

**Sim, você PODE e DEVE testar tudo localmente primeiro!**

Fluxo seguro:
```
Desenvolvimento Local (você agora)
    ↓ validou tudo funciona
Ambiente de Staging (preview Vercel)
    ↓ validou com dados reais (sample)
Beta Testing (5-10 clientes)
    ↓ feedback positivo
Produção (migração completa)
```

**Tempo estimado:**
- Testes locais: 2-3 dias
- Staging: 1 semana
- Beta: 1 semana
- Produção: 1 dia

**Você está no controle!** Não precisa ter pressa. Teste bem antes de ir para produção.
