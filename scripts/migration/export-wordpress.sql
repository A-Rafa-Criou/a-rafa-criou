-- ============================================================================
-- EXPORTAÇÃO COMPLETA: WORDPRESS/WOOCOMMERCE → NEXT.JS
-- ============================================================================
-- Execute estas queries no phpMyAdmin ou via SSH no servidor WordPress
-- ============================================================================

-- ============================================================================
-- 1. EXPORTAR CLIENTES (USERS)
-- ============================================================================
SELECT 
  u.ID as id,
  u.user_email as email,
  u.user_pass as wordpress_password_hash,
  u.display_name as name,
  u.user_registered as created_at,
  MAX(CASE WHEN um.meta_key = 'billing_first_name' THEN um.meta_value END) as first_name,
  MAX(CASE WHEN um.meta_key = 'billing_last_name' THEN um.meta_value END) as last_name,
  MAX(CASE WHEN um.meta_key = 'billing_phone' THEN um.meta_value END) as phone,
  MAX(CASE WHEN um.meta_key = 'billing_address_1' THEN um.meta_value END) as address,
  MAX(CASE WHEN um.meta_key = 'billing_city' THEN um.meta_value END) as city,
  MAX(CASE WHEN um.meta_key = 'billing_state' THEN um.meta_value END) as state,
  MAX(CASE WHEN um.meta_key = 'billing_postcode' THEN um.meta_value END) as zipcode,
  MAX(CASE WHEN um.meta_key = 'billing_country' THEN um.meta_value END) as country
FROM wp_users u
LEFT JOIN wp_usermeta um ON u.ID = um.user_id
WHERE u.ID > 1  -- Excluir admin
GROUP BY u.ID
ORDER BY u.ID
INTO OUTFILE '/tmp/clientes.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Se OUTFILE não funcionar, use este para copiar resultado:
-- Copie e salve como: data/clientes.csv


-- ============================================================================
-- 2. EXPORTAR PEDIDOS (ORDERS)
-- ============================================================================
SELECT 
  p.ID as order_id,
  p.post_date as order_date,
  p.post_status as wp_status,
  MAX(CASE WHEN pm.meta_key = '_customer_user' THEN pm.meta_value END) as user_id,
  MAX(CASE WHEN pm.meta_key = '_billing_email' THEN pm.meta_value END) as customer_email,
  MAX(CASE WHEN pm.meta_key = '_order_total' THEN pm.meta_value END) as total,
  MAX(CASE WHEN pm.meta_key = '_order_currency' THEN pm.meta_value END) as currency,
  MAX(CASE WHEN pm.meta_key = '_payment_method' THEN pm.meta_value END) as payment_method,
  MAX(CASE WHEN pm.meta_key = '_payment_method_title' THEN pm.meta_value END) as payment_method_title,
  MAX(CASE WHEN pm.meta_key = '_transaction_id' THEN pm.meta_value END) as transaction_id,
  MAX(CASE WHEN pm.meta_key = '_billing_first_name' THEN pm.meta_value END) as billing_first_name,
  MAX(CASE WHEN pm.meta_key = '_billing_last_name' THEN pm.meta_value END) as billing_last_name,
  MAX(CASE WHEN pm.meta_key = '_billing_phone' THEN pm.meta_value END) as billing_phone,
  MAX(CASE WHEN pm.meta_key = '_billing_address_1' THEN pm.meta_value END) as billing_address
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'shop_order'
  AND p.post_status IN ('wc-completed', 'wc-processing', 'wc-pending')
GROUP BY p.ID
ORDER BY p.post_date DESC
INTO OUTFILE '/tmp/pedidos.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';


-- ============================================================================
-- 3. EXPORTAR ITEMS DOS PEDIDOS (ORDER ITEMS)
-- ============================================================================
SELECT 
  oi.order_id,
  oi.order_item_name as product_name,
  MAX(CASE WHEN oim.meta_key = '_product_id' THEN oim.meta_value END) as product_id,
  MAX(CASE WHEN oim.meta_key = '_variation_id' THEN oim.meta_value END) as variation_id,
  MAX(CASE WHEN oim.meta_key = '_qty' THEN oim.meta_value END) as quantity,
  MAX(CASE WHEN oim.meta_key = '_line_total' THEN oim.meta_value END) as line_total,
  MAX(CASE WHEN oim.meta_key = '_line_subtotal' THEN oim.meta_value END) as line_subtotal
FROM wp_woocommerce_order_items oi
LEFT JOIN wp_woocommerce_order_itemmeta oim ON oi.order_item_id = oim.order_item_id
WHERE oi.order_item_type = 'line_item'
GROUP BY oi.order_item_id
ORDER BY oi.order_id, oi.order_item_id
INTO OUTFILE '/tmp/order_items.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';


-- ============================================================================
-- 4. EXPORTAR PRODUTOS
-- ============================================================================
SELECT 
  p.ID as product_id,
  p.post_title as name,
  p.post_content as description,
  p.post_excerpt as short_description,
  p.post_status as status,
  p.post_date as created_at,
  MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as regular_price,
  MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as sale_price,
  MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as current_price,
  MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) as sku,
  MAX(CASE WHEN pm.meta_key = '_stock' THEN pm.meta_value END) as stock,
  MAX(CASE WHEN pm.meta_key = '_downloadable' THEN pm.meta_value END) as is_downloadable,
  MAX(CASE WHEN pm.meta_key = '_virtual' THEN pm.meta_value END) as is_virtual,
  MAX(CASE WHEN pm.meta_key = '_product_image_gallery' THEN pm.meta_value END) as gallery_image_ids,
  MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as featured_image_id
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type IN ('product', 'product_variation')
  AND p.post_status = 'publish'
GROUP BY p.ID
ORDER BY p.post_date DESC
INTO OUTFILE '/tmp/produtos.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';


-- ============================================================================
-- 5. EXPORTAR CATEGORIAS DE PRODUTOS
-- ============================================================================
SELECT 
  p.ID as product_id,
  GROUP_CONCAT(t.name SEPARATOR '|') as categories,
  GROUP_CONCAT(t.term_id SEPARATOR '|') as category_ids
FROM wp_posts p
LEFT JOIN wp_term_relationships tr ON p.ID = tr.object_id
LEFT JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
LEFT JOIN wp_terms t ON tt.term_id = t.term_id
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
  AND tt.taxonomy = 'product_cat'
GROUP BY p.ID
INTO OUTFILE '/tmp/product_categories.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';


-- ============================================================================
-- 6. EXPORTAR VARIAÇÕES DE PRODUTOS
-- ============================================================================
SELECT 
  p.ID as variation_id,
  p.post_parent as product_id,
  p.post_title as variation_name,
  MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as regular_price,
  MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as sale_price,
  MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as current_price,
  MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) as sku,
  MAX(CASE WHEN pm.meta_key = '_stock' THEN pm.meta_value END) as stock,
  -- Atributos de variação
  MAX(CASE WHEN pm.meta_key LIKE 'attribute_%' THEN CONCAT(pm.meta_key, ':', pm.meta_value) END) as attributes
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'product_variation'
  AND p.post_status = 'publish'
GROUP BY p.ID
ORDER BY p.post_parent, p.ID
INTO OUTFILE '/tmp/product_variations.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';


-- ============================================================================
-- 7. EXPORTAR PERMISSÕES DE DOWNLOAD (CRÍTICO!)
-- ============================================================================
SELECT 
  d.download_id,
  d.user_id,
  d.user_email,
  d.product_id,
  d.order_id,
  d.order_key,
  d.downloads_remaining,
  d.access_expires,
  d.download_count,
  p.post_title as product_name
FROM wp_woocommerce_downloadable_product_permissions d
LEFT JOIN wp_posts p ON d.product_id = p.ID
WHERE (d.downloads_remaining != '0' OR d.downloads_remaining IS NULL)
  AND (d.access_expires IS NULL OR d.access_expires > NOW())
ORDER BY d.user_id, d.product_id
INTO OUTFILE '/tmp/download_permissions.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';


-- ============================================================================
-- 8. EXPORTAR ARQUIVOS PARA DOWNLOAD (URLs dos PDFs)
-- ============================================================================
SELECT 
  p.ID as product_id,
  p.post_title as product_name,
  pm.meta_value as downloadable_files
FROM wp_posts p
INNER JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
  AND pm.meta_key = '_downloadable_files'
ORDER BY p.ID
INTO OUTFILE '/tmp/downloadable_files.csv'
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n';


-- ============================================================================
-- 9. ESTATÍSTICAS DE VERIFICAÇÃO
-- ============================================================================
-- Execute estas queries para confirmar os números antes da exportação

-- Total de clientes
SELECT COUNT(*) as total_clientes FROM wp_users WHERE ID > 1;

-- Total de pedidos completados
SELECT COUNT(*) as total_pedidos 
FROM wp_posts 
WHERE post_type = 'shop_order' 
  AND post_status IN ('wc-completed', 'wc-processing');

-- Total de produtos
SELECT COUNT(*) as total_produtos 
FROM wp_posts 
WHERE post_type = 'product' 
  AND post_status = 'publish';

-- Total de variações
SELECT COUNT(*) as total_variacoes 
FROM wp_posts 
WHERE post_type = 'product_variation' 
  AND post_status = 'publish';

-- Total de permissões de download ativas
SELECT COUNT(*) as total_downloads_ativos
FROM wp_woocommerce_downloadable_product_permissions
WHERE (downloads_remaining != '0' OR downloads_remaining IS NULL)
  AND (access_expires IS NULL OR access_expires > NOW());

-- Pedidos por status
SELECT post_status, COUNT(*) as total
FROM wp_posts
WHERE post_type = 'shop_order'
GROUP BY post_status
ORDER BY total DESC;

-- Top 10 produtos mais vendidos
SELECT 
  p.ID,
  p.post_title,
  SUM(CAST(oim.meta_value AS UNSIGNED)) as total_vendido
FROM wp_posts p
INNER JOIN wp_woocommerce_order_itemmeta oim ON p.ID = CAST(oim.meta_value AS UNSIGNED)
WHERE oim.meta_key = '_product_id'
GROUP BY p.ID
ORDER BY total_vendido DESC
LIMIT 10;


-- ============================================================================
-- INSTRUÇÕES DE USO:
-- ============================================================================
-- 1. Faça login no phpMyAdmin
-- 2. Selecione o banco de dados do WordPress
-- 3. Vá na aba "SQL"
-- 4. Cole cada query acima (UMA POR VEZ)
-- 5. Execute e baixe o resultado como CSV
-- 6. Salve os arquivos na pasta: /data/
--
-- Estrutura esperada:
-- /data/
--   ├── clientes.csv
--   ├── pedidos.csv
--   ├── order_items.csv
--   ├── produtos.csv
--   ├── product_categories.csv
--   ├── product_variations.csv
--   ├── download_permissions.csv
--   └── downloadable_files.csv
--
-- 7. Execute os scripts de importação:
--    npm run migrate:import-customers
--    npm run migrate:import-orders
--    npm run migrate:import-products
--
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING:
-- ============================================================================
-- Se OUTFILE não funcionar (permissões):
-- 1. Execute a query normalmente
-- 2. Clique em "Exportar" no phpMyAdmin
-- 3. Escolha formato CSV
-- 4. Baixe o arquivo
-- 5. Salve na pasta /data/
-- ============================================================================
