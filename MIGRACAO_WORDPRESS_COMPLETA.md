# 🔄 Migração Completa: WordPress/WooCommerce → Next.js

## 📋 Índice

1. [Visão Geral da Migração](#visão-geral)
2. [Fase 1: Exportação do WordPress](#fase-1-exportação)
3. [Fase 2: Importação para Next.js](#fase-2-importação)
4. [Fase 3: Migração de Senhas](#fase-3-senhas)
5. [Fase 4: Acesso aos Produtos Comprados](#fase-4-produtos-comprados)
6. [Fase 5: Transição sem Downtime](#fase-5-transição)
7. [Fase 6: Pós-Migração](#fase-6-pós-migração)

---

## 🎯 Visão Geral da Migração

### **O que será migrado:**

```
WordPress/WooCommerce          →          Next.js
├── Clientes (users)           →          users table
├── Pedidos (orders)           →          orders table
├── Produtos (products)        →          products table
├── Variações (variations)     →          product_variations table
├── PDFs (downloads)           →          Cloudflare R2
└── Senhas (hashed)            →          senhas compatíveis
```

### **Desafios principais:**

1. ✅ **Senhas:** WordPress usa phpass, Next.js usa bcrypt
2. ✅ **PDFs:** Migrar de WordPress para Cloudflare R2
3. ✅ **Acesso aos produtos:** Vincular compras antigas
4. ✅ **Zero downtime:** Clientes não podem perder acesso

---

## 📊 Fase 1: Exportação do WordPress

### **1.1 Exportar Clientes (Users)**

#### **Via WP-CLI (Recomendado):**

```bash
# Conecte via SSH no servidor WordPress
ssh usuario@arafacriou.com.br

# Exportar usuários para CSV
wp user list --format=csv --fields=ID,user_login,user_email,user_registered,display_name > clientes.csv

# Exportar metadados dos usuários
wp db query "
SELECT 
  u.ID,
  u.user_login,
  u.user_email,
  u.user_pass,
  u.display_name,
  u.user_registered,
  GROUP_CONCAT(CONCAT(um.meta_key, ':', um.meta_value) SEPARATOR '|') as metadata
FROM wp_users u
LEFT JOIN wp_usermeta um ON u.ID = um.user_id
WHERE um.meta_key IN (
  'billing_first_name',
  'billing_last_name',
  'billing_phone',
  'billing_address_1',
  'billing_city',
  'billing_state',
  'billing_postcode',
  'billing_country'
)
GROUP BY u.ID
" --skip-column-names > clientes_completo.csv
```

#### **Via Plugin (Alternativa):**

1. Instale o plugin: **Export All Users to CSV**
2. Vá em: Ferramentas → Export Users
3. Selecione campos:
   - ID
   - Email
   - Nome
   - Data de registro
   - Campos de billing (endereço)
4. Baixe o CSV

#### **Via phpMyAdmin:**

```sql
SELECT 
  u.ID as id,
  u.user_email as email,
  u.user_pass as password_hash,
  u.display_name as name,
  u.user_registered as created_at,
  MAX(CASE WHEN um.meta_key = 'billing_phone' THEN um.meta_value END) as phone,
  MAX(CASE WHEN um.meta_key = 'billing_address_1' THEN um.meta_value END) as address,
  MAX(CASE WHEN um.meta_key = 'billing_city' THEN um.meta_value END) as city,
  MAX(CASE WHEN um.meta_key = 'billing_state' THEN um.meta_value END) as state,
  MAX(CASE WHEN um.meta_key = 'billing_postcode' THEN um.meta_value END) as zipcode
FROM wp_users u
LEFT JOIN wp_usermeta um ON u.ID = um.user_id
GROUP BY u.ID
INTO OUTFILE '/tmp/clientes.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

---

### **1.2 Exportar Pedidos (Orders)**

#### **Query SQL completa:**

```sql
SELECT 
  p.ID as order_id,
  p.post_date as order_date,
  pm_customer.meta_value as customer_email,
  pm_status.meta_value as order_status,
  pm_total.meta_value as total,
  pm_currency.meta_value as currency,
  pm_payment.meta_value as payment_method,
  (
    SELECT GROUP_CONCAT(
      CONCAT(
        oi.order_item_name, '|',
        MAX(CASE WHEN oim.meta_key = '_product_id' THEN oim.meta_value END), '|',
        MAX(CASE WHEN oim.meta_key = '_variation_id' THEN oim.meta_value END), '|',
        MAX(CASE WHEN oim.meta_key = '_qty' THEN oim.meta_value END), '|',
        MAX(CASE WHEN oim.meta_key = '_line_total' THEN oim.meta_value END)
      ) SEPARATOR '||'
    )
    FROM wp_woocommerce_order_items oi
    LEFT JOIN wp_woocommerce_order_itemmeta oim ON oi.order_item_id = oim.order_item_id
    WHERE oi.order_id = p.ID AND oi.order_item_type = 'line_item'
    GROUP BY oi.order_item_id
  ) as items
FROM wp_posts p
LEFT JOIN wp_postmeta pm_customer ON p.ID = pm_customer.post_id AND pm_customer.meta_key = '_billing_email'
LEFT JOIN wp_postmeta pm_status ON p.ID = pm_status.post_id AND pm_status.meta_key = '_order_status'
LEFT JOIN wp_postmeta pm_total ON p.ID = pm_total.post_id AND pm_total.meta_key = '_order_total'
LEFT JOIN wp_postmeta pm_currency ON p.ID = pm_currency.post_id AND pm_currency.meta_key = '_order_currency'
LEFT JOIN wp_postmeta pm_payment ON p.ID = pm_payment.post_id AND pm_payment.meta_key = '_payment_method'
WHERE p.post_type = 'shop_order'
  AND p.post_status IN ('wc-completed', 'wc-processing')
ORDER BY p.post_date DESC
INTO OUTFILE '/tmp/pedidos.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

#### **Via Plugin:**

1. Instale: **WooCommerce Order Export**
2. Vá em: WooCommerce → Orders → Export
3. Selecione:
   - Status: Completed, Processing
   - Formato: CSV
   - Incluir: Items, Customer data, Payment info
4. Baixe o arquivo

---

### **1.3 Exportar Produtos**

#### **Query SQL:**

```sql
SELECT 
  p.ID as product_id,
  p.post_title as name,
  p.post_content as description,
  p.post_date as created_at,
  MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as price,
  MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as sale_price,
  MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) as sku,
  MAX(CASE WHEN pm.meta_key = '_downloadable' THEN pm.meta_value END) as is_downloadable,
  MAX(CASE WHEN pm.meta_key = '_product_image_gallery' THEN pm.meta_value END) as gallery_images,
  (
    SELECT GROUP_CONCAT(t.name SEPARATOR '|')
    FROM wp_term_relationships tr
    LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
    LEFT JOIN wp_terms t ON tt.term_id = t.term_id
    WHERE tr.object_id = p.ID AND tt.taxonomy = 'product_cat'
  ) as categories
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
GROUP BY p.ID
INTO OUTFILE '/tmp/produtos.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

---

### **1.4 Exportar Downloads (Permissões de Acesso)**

**Query crítica para vincular PDFs aos clientes:**

```sql
SELECT 
  d.download_id,
  d.user_id,
  d.user_email,
  d.product_id,
  d.order_id,
  d.downloads_remaining,
  d.access_expires,
  d.download_count,
  pm.meta_value as file_url
FROM wp_woocommerce_downloadable_product_permissions d
LEFT JOIN wp_postmeta pm ON d.product_id = pm.post_id 
  AND pm.meta_key = '_downloadable_files'
WHERE d.downloads_remaining != '0'
  OR d.access_expires IS NULL
  OR d.access_expires > NOW()
INTO OUTFILE '/tmp/downloads_permissions.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

---

## 🔧 Fase 2: Importação para Next.js

### **2.1 Script de Importação de Clientes**

Crie: `scripts/import-customers.ts`

```typescript
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import * as fs from 'fs';
import * as csv from 'csv-parser';

interface WordPressUser {
  id: string;
  email: string;
  password_hash: string; // phpass hash do WordPress
  name: string;
  phone?: string;
  created_at: string;
}

async function importCustomers() {
  const customers: WordPressUser[] = [];

  // Ler CSV
  fs.createReadStream('data/clientes.csv')
    .pipe(csv())
    .on('data', (row) => customers.push(row))
    .on('end', async () => {
      console.log(`📊 Total de clientes: ${customers.length}`);

      for (const customer of customers) {
        try {
          // Verificar se já existe
          const existing = await db
            .select()
            .from(users)
            .where(eq(users.email, customer.email.toLowerCase()))
            .limit(1);

          if (existing.length > 0) {
            console.log(`⏭️  Cliente já existe: ${customer.email}`);
            continue;
          }

          // Inserir cliente
          await db.insert(users).values({
            email: customer.email.toLowerCase(),
            name: customer.name,
            phone: customer.phone || null,
            // IMPORTANTE: Manter hash do WordPress temporariamente
            password: customer.password_hash, // phpass hash
            role: 'customer',
            createdAt: new Date(customer.created_at),
            // Marcar para conversão de senha
            legacyPasswordType: 'wordpress_phpass', // Campo customizado
          });

          console.log(`✅ Cliente importado: ${customer.email}`);
        } catch (error) {
          console.error(`❌ Erro ao importar ${customer.email}:`, error);
        }
      }

      console.log('\n🎉 Importação concluída!');
    });
}

importCustomers();
```

---

### **2.2 Script de Importação de Pedidos**

Crie: `scripts/import-orders.ts`

```typescript
import { db } from '@/lib/db';
import { orders, orderItems } from '@/lib/db/schema';
import * as fs from 'fs';
import * as csv from 'csv-parser';

interface WordPressOrder {
  order_id: string;
  order_date: string;
  customer_email: string;
  order_status: string;
  total: string;
  currency: string;
  payment_method: string;
  items: string; // Format: "name|product_id|variation_id|qty|total||..."
}

async function importOrders() {
  const wpOrders: WordPressOrder[] = [];

  fs.createReadStream('data/pedidos.csv')
    .pipe(csv())
    .on('data', (row) => wpOrders.push(row))
    .on('end', async () => {
      console.log(`📦 Total de pedidos: ${wpOrders.length}`);

      for (const wpOrder of wpOrders) {
        try {
          // Buscar usuário pelo e-mail
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, wpOrder.customer_email.toLowerCase()))
            .limit(1);

          if (!user) {
            console.log(`⚠️  Usuário não encontrado: ${wpOrder.customer_email}`);
            continue;
          }

          // Criar pedido
          const [order] = await db
            .insert(orders)
            .values({
              userId: user.id,
              total: parseFloat(wpOrder.total),
              currency: wpOrder.currency || 'BRL',
              status: mapOrderStatus(wpOrder.order_status),
              paymentMethod: wpOrder.payment_method,
              createdAt: new Date(wpOrder.order_date),
              // Manter ID original para referência
              wpOrderId: parseInt(wpOrder.order_id),
            })
            .returning();

          // Processar items
          const items = wpOrder.items.split('||');
          for (const itemStr of items) {
            const [name, productId, variationId, qty, total] = itemStr.split('|');

            await db.insert(orderItems).values({
              orderId: order.id,
              productId: parseInt(productId),
              variationId: variationId ? parseInt(variationId) : null,
              quantity: parseInt(qty),
              price: parseFloat(total) / parseInt(qty),
              name,
            });
          }

          console.log(`✅ Pedido importado: #${wpOrder.order_id}`);
        } catch (error) {
          console.error(`❌ Erro ao importar pedido #${wpOrder.order_id}:`, error);
        }
      }

      console.log('\n🎉 Importação de pedidos concluída!');
    });
}

function mapOrderStatus(wpStatus: string): string {
  const statusMap: Record<string, string> = {
    'wc-completed': 'completed',
    'wc-processing': 'processing',
    'wc-pending': 'pending',
    'wc-cancelled': 'cancelled',
    'wc-refunded': 'refunded',
  };
  return statusMap[wpStatus] || 'pending';
}

importOrders();
```

---

## 🔐 Fase 3: Migração de Senhas (CRÍTICO!)

### **Problema:**

- WordPress: usa **phpass** (MD5 + salt)
- Next.js: usa **bcrypt**

### **Solução: Conversão Híbrida**

#### **3.1 Adicionar campo ao schema:**

```typescript
// src/lib/db/schema.ts
export const users = pgTable('users', {
  // ... campos existentes
  password: text('password'),
  legacyPasswordHash: text('legacy_password_hash'), // Hash phpass do WP
  legacyPasswordType: text('legacy_password_type'), // 'wordpress_phpass'
});
```

#### **3.2 Migration:**

```sql
-- drizzle/0007_add_legacy_password.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_password_type TEXT;
```

#### **3.3 Verificação de Login Híbrida:**

Atualize `src/lib/auth/config.ts`:

```typescript
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Função para verificar senha phpass do WordPress
function verifyWordPressPassword(password: string, hash: string): boolean {
  // Implementação phpass (compatível com WordPress)
  const itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  
  if (hash.length !== 34) return false;
  
  const count = itoa64.indexOf(hash[3]);
  if (count < 7 || count > 30) return false;
  
  const count_log2 = count;
  const salt = hash.substring(4, 12);
  
  let hashMd5 = crypto
    .createHash('md5')
    .update(salt + password)
    .digest();
  
  do {
    hashMd5 = crypto
      .createHash('md5')
      .update(Buffer.concat([hashMd5, Buffer.from(password)]))
      .digest();
  } while (--count_log2 > 0);
  
  let output = '';
  let i = 0;
  do {
    const value =
      hashMd5[i++] |
      (i < 16 ? hashMd5[i] << 8 : 0) |
      (i < 15 ? hashMd5[i + 1] << 16 : 0);
    
    output += itoa64[value & 0x3f];
    output += itoa64[(value >> 6) & 0x3f];
    output += itoa64[(value >> 12) & 0x3f];
    output += itoa64[(value >> 18) & 0x3f];
  } while (i < 16);
  
  return hash === '$P$' + itoa64[count_log2] + salt + output;
}

// Atualizar authorize no CredentialsProvider
async authorize(credentials) {
  // ... código existente para buscar usuário
  
  let isPasswordValid = false;

  // Verificar se é senha legada do WordPress
  if (dbUser.legacyPasswordType === 'wordpress_phpass' && dbUser.legacyPasswordHash) {
    isPasswordValid = verifyWordPressPassword(
      credentials.password,
      dbUser.legacyPasswordHash
    );

    // Se senha correta, converter para bcrypt
    if (isPasswordValid) {
      const newHash = await bcrypt.hash(credentials.password, 10);
      await db.update(users).set({
        password: newHash,
        legacyPasswordHash: null,
        legacyPasswordType: null,
      }).where(eq(users.id, dbUser.id));

      console.log(`🔄 Senha convertida para bcrypt: ${dbUser.email}`);
    }
  } 
  // Verificar senha bcrypt normal
  else if (dbUser.password) {
    isPasswordValid = await bcrypt.compare(credentials.password, dbUser.password);
  }

  if (!isPasswordValid) {
    return null;
  }

  // ... resto do código
}
```

**Alternativa mais simples (Recomendada):**

Forçar redefinição de senha via e-mail:

```typescript
// scripts/send-password-reset-to-all.ts
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetToAll() {
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 86400000); // 24 horas

    await db.update(users).set({
      resetToken,
      resetTokenExpiry,
    }).where(eq(users.id, user.id));

    // Enviar e-mail
    await resend.emails.send({
      from: 'A Rafa Criou <onboarding@resend.dev>',
      to: user.email,
      subject: '🚀 Bem-vindo ao Novo Site - Defina sua Senha',
      html: `
        <h1>Olá ${user.name}!</h1>
        <p>Nosso site foi renovado! 🎉</p>
        <p>Para acessar sua conta, defina uma nova senha:</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}">
          Definir Nova Senha
        </a>
      `,
    });

    console.log(`✅ E-mail enviado para: ${user.email}`);
  }
}
```

---

## 📦 Fase 4: Acesso aos Produtos Comprados

### **4.1 Migrar PDFs para Cloudflare R2**

```typescript
// scripts/migrate-pdfs-to-r2.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

interface ProductDownload {
  product_id: number;
  file_url: string; // URL do WordPress
  file_name: string;
}

async function migratePDFs() {
  // Ler lista de downloads do CSV
  const downloads: ProductDownload[] = []; // Carregar do CSV

  for (const download of downloads) {
    try {
      // Baixar PDF do WordPress
      const response = await axios.get(download.file_url, {
        responseType: 'arraybuffer',
      });

      const fileBuffer = Buffer.from(response.data);
      const fileName = `products/${download.product_id}/${download.file_name}`;

      // Upload para R2
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET!,
          Key: fileName,
          Body: fileBuffer,
          ContentType: 'application/pdf',
        })
      );

      // Atualizar URL no banco
      await db.update(products).set({
        pdfUrl: fileName, // Caminho no R2
      }).where(eq(products.id, download.product_id));

      console.log(`✅ PDF migrado: ${fileName}`);
    } catch (error) {
      console.error(`❌ Erro ao migrar PDF ${download.file_url}:`, error);
    }
  }
}
```

### **4.2 Garantir Acesso aos Produtos Comprados**

```typescript
// scripts/link-purchased-products.ts
async function linkPurchasedProducts() {
  // Buscar todos os pedidos completados
  const completedOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.status, 'completed'));

  for (const order of completedOrders) {
    // Buscar items do pedido
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    for (const item of items) {
      // Verificar se o produto é digital (PDF)
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (product && product.pdfUrl) {
        // Criar permissão de download
        await db.insert(downloadPermissions).values({
          userId: order.userId,
          orderId: order.id,
          productId: item.productId,
          variationId: item.variationId,
          downloadsRemaining: -1, // Ilimitado
          expiresAt: null, // Nunca expira
          createdAt: order.createdAt,
        });

        console.log(`✅ Acesso concedido: Usuário ${order.userId} → Produto ${item.productId}`);
      }
    }
  }
}
```

---

## 🚀 Fase 5: Transição sem Downtime

### **Estratégia: Dual-Mode (WordPress + Next.js simultâneos)**

#### **Cronograma:**

```
Semana 1-2: Preparação
├── Exportar dados do WordPress
├── Importar para Next.js
├── Testar importação
└── Migrar PDFs para R2

Semana 3: Teste Beta
├── Selecionar 10-20 clientes beta
├── Enviar acesso ao novo site (subdomínio)
├── Coletar feedback
└── Ajustar bugs

Semana 4: Transição Gradual
├── Dia 1-2: Redirecionar 10% do tráfego
├── Dia 3-4: Redirecionar 25% do tráfego
├── Dia 5-6: Redirecionar 50% do tráfego
└── Dia 7: Redirecionar 100% do tráfego

Semana 5: Pós-lançamento
├── Monitorar erros
├── Dar suporte a clientes
└── Desativar WordPress
```

#### **Configuração DNS:**

```
# Subdomínio para testes
novo.arafacriou.com.br → Vercel (Next.js)

# Domínio principal (gradual)
arafacriou.com.br → Cloudflare (Load Balancer)
  ├── 90% → WordPress (antigo)
  └── 10% → Vercel (novo)

# Após validação completa
arafacriou.com.br → Vercel (Next.js)
antigo.arafacriou.com.br → WordPress (backup)
```

#### **Redirecionamentos importantes:**

```nginx
# .htaccess no WordPress
RewriteEngine On

# Redirecionar página de produtos
RewriteRule ^produto/(.*)$ https://arafacriou.com.br/produtos/$1 [R=301,L]

# Redirecionar minha conta
RewriteRule ^minha-conta/?$ https://arafacriou.com.br/conta [R=301,L]

# Redirecionar carrinho
RewriteRule ^carrinho/?$ https://arafacriou.com.br/carrinho [R=301,L]

# Redirecionar checkout
RewriteRule ^checkout/?$ https://arafacriou.com.br/checkout [R=301,L]
```

---

## ✉️ Fase 6: Comunicação com Clientes

### **6.1 E-mail de Aviso (1 semana antes)**

```html
Assunto: 🚀 Nosso site está de cara nova!

Olá [NOME],

Estamos muito animados em anunciar que o site da A Rafa Criou foi completamente renovado! 🎉

O que muda para você:
✅ Visual moderno e responsivo
✅ Navegação mais fácil
✅ Checkout mais rápido
✅ Acesso aos seus produtos comprados mantido

⚠️ IMPORTANTE: Você precisará redefinir sua senha

Para sua segurança, todos os clientes precisarão criar uma nova senha.
Não se preocupe, é super rápido!

[BOTÃO: Definir Nova Senha]

Seus produtos comprados estarão disponíveis em: Minha Conta → Meus Pedidos

Qualquer dúvida, estamos aqui para ajudar!

Atenciosamente,
Equipe A Rafa Criou
```

### **6.2 E-mail Pós-Migração**

```html
Assunto: ✅ Novo site já está no ar!

Olá [NOME],

Nosso novo site já está disponível! 🎉

Acesse agora: https://arafacriou.com.br

Para acessar sua conta:
1. Clique em "Entrar"
2. Digite seu e-mail
3. Clique em "Esqueci minha senha"
4. Defina uma nova senha

Seus produtos comprados estão em: Minha Conta → Meus Downloads

Precisa de ajuda? Responda este e-mail ou acesse nosso suporte.

Boas compras! 🛍️
```

---

## 📋 Checklist Final de Migração

### **Antes do Go-Live:**

- [ ] Exportar todos os clientes do WordPress
- [ ] Exportar todos os pedidos (completed + processing)
- [ ] Exportar produtos e variações
- [ ] Exportar permissões de download
- [ ] Importar clientes para Next.js
- [ ] Importar pedidos para Next.js
- [ ] Importar produtos para Next.js
- [ ] Migrar PDFs para Cloudflare R2
- [ ] Testar download de PDFs
- [ ] Vincular produtos comprados aos clientes
- [ ] Testar login com senhas antigas (phpass)
- [ ] Enviar e-mails de redefinição de senha
- [ ] Configurar redirecionamentos 301
- [ ] Testar checkout completo
- [ ] Testar todos os métodos de pagamento
- [ ] Criar subdomínio para testes (novo.arafacriou.com.br)
- [ ] Selecionar grupo beta (10-20 clientes)
- [ ] Coletar feedback do beta
- [ ] Corrigir bugs encontrados

### **Dia do Go-Live:**

- [ ] Backup completo do WordPress
- [ ] Backup completo do banco Next.js
- [ ] Atualizar DNS (gradual: 10% → 25% → 50% → 100%)
- [ ] Monitorar logs de erro
- [ ] Monitorar métricas de conversão
- [ ] Equipe de suporte disponível
- [ ] Enviar e-mail anunciando novo site

### **Pós Go-Live (Primeiros 7 dias):**

- [ ] Monitorar taxa de erro
- [ ] Monitorar reclamações de clientes
- [ ] Verificar se todos conseguem acessar produtos
- [ ] Verificar se downloads funcionam
- [ ] Verificar se pagamentos funcionam
- [ ] Ajustar problemas críticos imediatamente
- [ ] Coletar feedback dos clientes
- [ ] Melhorar pontos fracos identificados

### **Após 30 dias:**

- [ ] Analisar métricas (taxa de conversão, abandono de carrinho)
- [ ] Desativar WordPress antigo
- [ ] Cancelar hospedagem WordPress (se aplicável)
- [ ] Documentar lições aprendidas
- [ ] Comemorar o sucesso! 🎉

---

## 🛠️ Scripts Úteis

### **Verificar Migração:**

```typescript
// scripts/verify-migration.ts
async function verifyMigration() {
  // Contar clientes
  const wpCustomers = 1543; // Do WordPress
  const nextCustomers = await db.select({ count: count() }).from(users);
  console.log(`Clientes WP: ${wpCustomers}, Next.js: ${nextCustomers[0].count}`);

  // Contar pedidos
  const wpOrders = 3241; // Do WordPress
  const nextOrders = await db.select({ count: count() }).from(orders);
  console.log(`Pedidos WP: ${wpOrders}, Next.js: ${nextOrders[0].count}`);

  // Verificar produtos sem PDF
  const productsNoPDF = await db
    .select()
    .from(products)
    .where(isNull(products.pdfUrl));
  console.log(`⚠️ Produtos sem PDF: ${productsNoPDF.length}`);

  // Verificar clientes sem acesso a produtos comprados
  const ordersWithoutPermissions = await db
    .select()
    .from(orders)
    .leftJoin(downloadPermissions, eq(orders.id, downloadPermissions.orderId))
    .where(
      and(
        eq(orders.status, 'completed'),
        isNull(downloadPermissions.id)
      )
    );
  console.log(`⚠️ Pedidos sem permissão de download: ${ordersWithoutPermissions.length}`);
}
```

---

## 💡 Dicas Importantes

1. **Faça backup de TUDO antes de começar**
2. **Teste em ambiente de staging primeiro**
3. **Não delete nada do WordPress até confirmar que tudo funciona**
4. **Mantenha WordPress em subdomínio como backup por 30-60 dias**
5. **Tenha um plano de rollback (voltar ao WordPress se der problema)**
6. **Monitore TUDO nos primeiros dias**
7. **Tenha equipe de suporte pronta**
8. **Seja transparente com os clientes sobre a mudança**

---

## 🆘 Plano de Rollback (Se algo der errado)

```bash
# Reverter DNS para WordPress
1. Acessar Cloudflare DNS
2. Mudar A record de Vercel para servidor WordPress
3. Aguardar propagação (5-10 min)

# Notificar clientes
Enviar e-mail explicando retorno temporário ao site antigo

# Corrigir problema
Identificar e corrigir o problema no Next.js

# Tentar novamente
Fazer nova tentativa de migração quando estável
```

---

## 📞 Precisa de Ajuda?

**Migração é um processo crítico!**

Se tiver dúvidas em qualquer etapa:
1. Teste em ambiente local primeiro
2. Faça backup antes de qualquer alteração
3. Documente cada passo
4. Peça ajuda se necessário

**Lembre-se:** É melhor demorar mais e fazer certo do que ter problemas com clientes perdendo acesso!

---

## ✅ Conclusão

Com este guia, você conseguirá:
- ✅ Exportar todos os dados do WordPress
- ✅ Importar para Next.js sem perder nada
- ✅ Manter acesso dos clientes aos produtos comprados
- ✅ Fazer transição sem downtime
- ✅ Ter plano de rollback caso necessário

**Tempo estimado total:** 3-4 semanas (com testes)

**Próximo passo:** Começar pela Fase 1 (Exportação) em ambiente de teste!
