# 📤 Guia de Exportação: WordPress → Next.js

**Objetivo:** Exportar dados do WordPress/WooCommerce para arquivos CSV.

---

## 🎯 O QUE VOCÊ PRECISA EXPORTAR

- ✅ **Clientes** (users + billing info)
- ✅ **Produtos** (products)
- ✅ **Variações** (product variations)
- ✅ **Pedidos** (orders + items)
- ✅ **Permissões de Download** (quem comprou o quê)

---

## 🔑 PASSO 1: ACESSAR O BANCO DE DADOS

### Opção A: Via Plugin WordPress (MAIS FÁCIL - SEM CPANEL) ✅

**Você tem o "All-in-One WP Migration"? Perfeito!** 

Esse plugin exporta **TUDO** (banco de dados completo). Depois eu extraio os CSVs para você.

#### Passos:

1. Acesse: **All-in-One WP Migration** → **Export**
2. Clique em: **Export To** → **File**
3. Aguarde o backup completar
4. Clique em: **Download** para baixar o arquivo `.wpress`
5. **Me envie o arquivo** (ou coloque em local acessível)
6. Eu extraio os CSVs necessários do backup

**⚠️ IMPORTANTE:** 
- O arquivo pode ser grande (centenas de MB)
- Contém senhas dos clientes (hash WordPress)
- Contém todos os dados necessários
- É mais seguro que exportar manualmente

**OU use plugins alternativos:**

1. Acesse: https://arafacriou.com.br/wp-admin/plugin-install.php
2. Busque: **"WP Data Access"** (permite SQL direto no WordPress)
3. Ou busque: **"Adminer"** (phpMyAdmin dentro do WordPress)

### Opção B: Via phpMyAdmin (Painel de Hospedagem)

**Se sua hospedagem tem painel próprio (não cPanel):**

1. Acesse o painel da sua hospedagem (Hostinger, Hostgator, etc.)
2. Procure por **Bancos de Dados** ou **MySQL**
3. Clique em **phpMyAdmin** ou **Gerenciar Banco**
4. Selecione o banco do WordPress

### Opção C: Via cPanel (se conseguir acesso)

1. Acesse o painel da sua hospedagem
2. Procure por **Bancos de Dados** ou **MySQL**
3. Clique em **phpMyAdmin** ou **Gerenciar Banco**
4. Selecione o banco do WordPress

### Opção C: Via SSH (Avançado)

```bash
ssh usuario@arafacriou.com.br
mysql -u usuario_db -p nome_do_banco
```

---

## 📊 PASSO 2: EXPORTAR CLIENTES (20 PARA TESTE)

### 2.1 No phpMyAdmin:

1. Clique na aba **SQL** (no topo)
2. Cole a query abaixo
3. Clique em **Executar**
4. Clique em **Exportar** → Escolha **CSV**

### 2.2 Query SQL:

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
WHERE um.meta_key IN (
  'billing_phone',
  'billing_address_1',
  'billing_city',
  'billing_state',
  'billing_postcode'
)
GROUP BY u.ID
ORDER BY u.user_registered DESC
LIMIT 20;
```

### 2.3 Salvar arquivo:

- **Nome:** `test-clientes.csv`
- **Local:** `data/test/test-clientes.csv`

---

## 🛍️ PASSO 3: EXPORTAR PRODUTOS (10 PARA TESTE)

### 3.1 Query SQL:

```sql
SELECT
  p.ID as product_id,
  p.post_title as name,
  p.post_name as slug,
  p.post_content as description,
  p.post_excerpt as short_description,
  p.post_date as created_at,
  MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as price,
  MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as sale_price,
  MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) as sku,
  MAX(CASE WHEN pm.meta_key = '_stock_status' THEN pm.meta_value END) as stock_status,
  (
    SELECT GROUP_CONCAT(t.name SEPARATOR '|')
    FROM wp_term_relationships tr
    LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
    LEFT JOIN wp_terms t ON tt.term_id = t.term_id
    WHERE tr.object_id = p.ID 
      AND tt.taxonomy = 'product_cat'
  ) as categories
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
GROUP BY p.ID
ORDER BY p.post_date DESC
LIMIT 10;
```

### 3.2 Salvar arquivo:

- **Nome:** `test-produtos.csv`
- **Local:** `data/test/test-produtos.csv`

---

## 🎨 PASSO 4: EXPORTAR VARIAÇÕES DE PRODUTOS

### 4.1 Query SQL:

```sql
SELECT
  p.ID as variation_id,
  p.post_parent as product_id,
  p.post_title as name,
  p.post_name as slug,
  p.post_date as created_at,
  MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as price,
  MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as sale_price,
  MAX(CASE WHEN pm.meta_key = '_stock_status' THEN pm.meta_value END) as stock_status,
  MAX(CASE WHEN pm.meta_key = 'attribute_pa_tamanho' THEN pm.meta_value END) as attr_tamanho,
  MAX(CASE WHEN pm.meta_key = 'attribute_pa_cor' THEN pm.meta_value END) as attr_cor,
  MAX(CASE WHEN pm.meta_key = 'attribute_pa_idioma' THEN pm.meta_value END) as attr_idioma
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'product_variation'
  AND p.post_status = 'publish'
  AND p.post_parent IN (
    SELECT ID FROM wp_posts 
    WHERE post_type = 'product' 
    AND post_status = 'publish'
    LIMIT 10
  )
GROUP BY p.ID
ORDER BY p.post_parent, p.ID;
```

### 4.2 Salvar arquivo:

- **Nome:** `test-variacoes.csv`
- **Local:** `data/test/test-variacoes.csv`

---

## 📦 PASSO 5: EXPORTAR PEDIDOS (20 PARA TESTE)

### 5.1 Query SQL:

```sql
SELECT
  p.ID as order_id,
  p.post_date as order_date,
  p.post_status as order_status,
  MAX(CASE WHEN pm.meta_key = '_billing_email' THEN pm.meta_value END) as customer_email,
  MAX(CASE WHEN pm.meta_key = '_order_total' THEN pm.meta_value END) as total,
  MAX(CASE WHEN pm.meta_key = '_order_currency' THEN pm.meta_value END) as currency,
  MAX(CASE WHEN pm.meta_key = '_payment_method' THEN pm.meta_value END) as payment_method,
  MAX(CASE WHEN pm.meta_key = '_payment_method_title' THEN pm.meta_value END) as payment_method_title,
  MAX(CASE WHEN pm.meta_key = '_customer_user' THEN pm.meta_value END) as user_id
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type IN ('shop_order', 'shop_order_placehold')
  AND p.post_status IN ('wc-completed', 'wc-processing')
GROUP BY p.ID
ORDER BY p.post_date DESC
LIMIT 20;
```

### 5.2 Salvar arquivo:

- **Nome:** `test-pedidos.csv`
- **Local:** `data/test/test-pedidos.csv`

---

## 🛒 PASSO 6: EXPORTAR ITEMS DOS PEDIDOS

### 6.1 Query SQL:

```sql
SELECT
  oi.order_item_id as item_id,
  oi.order_id,
  oi.order_item_name as product_name,
  MAX(CASE WHEN oim.meta_key = '_product_id' THEN oim.meta_value END) as product_id,
  MAX(CASE WHEN oim.meta_key = '_variation_id' THEN oim.meta_value END) as variation_id,
  MAX(CASE WHEN oim.meta_key = '_qty' THEN oim.meta_value END) as quantity,
  MAX(CASE WHEN oim.meta_key = '_line_total' THEN oim.meta_value END) as line_total,
  MAX(CASE WHEN oim.meta_key = '_line_tax' THEN oim.meta_value END) as line_tax
FROM wp_woocommerce_order_items oi
LEFT JOIN wp_woocommerce_order_itemmeta oim ON oi.order_item_id = oim.order_item_id
WHERE oi.order_item_type = 'line_item'
  AND oi.order_id IN (
    SELECT ID FROM wp_posts 
    WHERE post_type IN ('shop_order', 'shop_order_placehold')
    AND post_status IN ('wc-completed', 'wc-processing')
    ORDER BY post_date DESC
    LIMIT 20
  )
GROUP BY oi.order_item_id
ORDER BY oi.order_id, oi.order_item_id;
```

### 6.2 Salvar arquivo:

- **Nome:** `test-order-items.csv`
- **Local:** `data/test/test-order-items.csv`

---

## 📥 PASSO 7: EXPORTAR PERMISSÕES DE DOWNLOAD

### 7.1 Query SQL:

```sql
SELECT
  d.download_id,
  d.user_id,
  d.user_email,
  d.product_id,
  d.order_id,
  d.downloads_remaining,
  d.access_expires,
  d.download_count
FROM wp_woocommerce_downloadable_product_permissions d
WHERE (
  d.downloads_remaining != '0' 
  OR d.downloads_remaining IS NULL
  OR d.access_expires IS NULL
  OR d.access_expires > NOW()
)
AND d.order_id IN (
  SELECT ID FROM wp_posts 
  WHERE post_type IN ('shop_order', 'shop_order_placehold')
  AND post_status IN ('wc-completed', 'wc-processing')
  ORDER BY post_date DESC
  LIMIT 20
)
ORDER BY d.order_id;
```

### 7.2 Salvar arquivo:

- **Nome:** `test-downloads.csv`
- **Local:** `data/test/test-downloads.csv`

---

## 📎 PASSO 8: EXPORTAR URLs DOS ARQUIVOS PDF

### 8.1 Query SQL:

```sql
SELECT
  p.ID as product_id,
  p.post_title as product_name,
  pm.meta_value as downloadable_files
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
  AND pm.meta_key = '_downloadable_files'
  AND pm.meta_value IS NOT NULL
  AND pm.meta_value != ''
ORDER BY p.ID
LIMIT 10;
```

**IMPORTANTE:** Este campo armazena um array serializado do PHP. Você verá algo como:

```
a:1:{s:32:"abc123";a:3:{s:4:"name";s:14:"meu-arquivo.pdf";s:4:"file";s:65:"https://arafacriou.com.br/wp-content/uploads/2024/arquivo.pdf";}}
```

### 8.2 Salvar arquivo:

- **Nome:** `test-files.csv`
- **Local:** `data/test/test-files.csv`

---

## ✅ CHECKLIST DE EXPORTAÇÃO

Após executar todas as queries, você deve ter:

- [ ] `data/test/test-clientes.csv` (20 registros)
- [ ] `data/test/test-produtos.csv` (10 registros)
- [ ] `data/test/test-variacoes.csv` (variações dos 10 produtos)
- [ ] `data/test/test-pedidos.csv` (20 registros)
- [ ] `data/test/test-order-items.csv` (items dos 20 pedidos)
- [ ] `data/test/test-downloads.csv` (permissões de download)
- [ ] `data/test/test-files.csv` (URLs dos PDFs)

---

## 🔍 COMO VALIDAR OS CSVS

### Verificar encoding:

- Abra o CSV no Excel ou VSCode
- Caracteres especiais (ã, ç, é) devem aparecer corretamente
- Se não aparecer, re-exporte como **UTF-8**

### Verificar colunas:

Cada CSV deve ter as colunas esperadas. Exemplo:

**test-clientes.csv:**
```
id,email,password_hash,name,created_at,phone,address,city,state,zipcode
```

**test-produtos.csv:**
```
product_id,name,slug,description,short_description,created_at,price,sale_price,sku,stock_status,categories
```

---

## 🚨 PROBLEMAS COMUNS

### 1. "Table 'wp_users' doesn't exist"

- Seu WordPress pode usar prefixo diferente de `wp_`
- Verifique o prefixo correto nas tabelas
- Substitua `wp_` pelo prefixo correto em todas as queries

**Como descobrir o prefixo:**

1. No phpMyAdmin, veja o nome das tabelas
2. Geralmente algo como: `wp_users`, `wpdb_users`, ou `wordpress_users`
3. Use esse prefixo nas queries

### 2. "Access denied" ou "Permission denied"

- Seu usuário do banco pode não ter permissão de leitura
- Entre em contato com o suporte da hospedagem
- Ou use um usuário com mais permissões

### 3. CSV com caracteres estranhos (�, ã vira Ã£)

- Problema de encoding
- No phpMyAdmin, ao exportar, escolha **UTF-8**
- Ou abra o CSV no VSCode e salve como UTF-8

### 4. "No database selected"

- Clique no nome do banco na barra lateral esquerda
- O banco deve ficar destacado/selecionado

---

## 📞 PRÓXIMOS PASSOS

Após ter todos os CSVs:

1. ✅ Coloque-os na pasta `data/test/`
2. ✅ Execute o script de validação:
   ```bash
   npx tsx scripts/migration/validate-csvs.ts
   ```
3. ✅ Execute os scripts de importação:
   ```bash
   npx tsx scripts/migration/import-customers.ts
   npx tsx scripts/migration/import-products.ts
   npx tsx scripts/migration/import-orders.ts
   ```

---

## 💾 BACKUP IMPORTANTE

**ANTES de qualquer migração:**

1. Faça backup completo do banco WordPress
2. Faça backup dos arquivos WordPress
3. Guarde os CSVs em local seguro
4. Documente tudo que fizer

---

## 🎯 DICA PROFISSIONAL

**Use um cliente SQL mais amigável:**

- **HeidiSQL** (Windows): https://www.heidisql.com/
- **Sequel Pro** (Mac): https://www.sequelpro.com/
- **DBeaver** (Multiplataforma): https://dbeaver.io/

Eles facilitam muito a exportação de dados!

---

**Dúvidas?** Consulte: `MIGRACAO_WORDPRESS_COMPLETA.md` para mais detalhes.
