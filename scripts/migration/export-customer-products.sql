-- ============================================
-- Query: Mapear Clientes + Produtos Comprados
-- ============================================
-- Propósito: Exportar CSV para liberar downloads no site novo
-- Uso: Executar no Adminer do WordPress → Exportar como CSV
-- CSV vai para: data/migration/customer-products.csv
-- 
-- Depois rodar:
-- npx tsx scripts/migration/grant-downloads-by-name.ts data/migration/customer-products.csv
-- ============================================

SELECT 
    pm_email.meta_value as email_cliente,
    p.post_title as produto_nome,
    p.post_name as produto_slug,
    COUNT(*) as vezes_comprado,
    MAX(orders.post_date) as ultima_compra,
    GROUP_CONCAT(DISTINCT orders.ID ORDER BY orders.ID SEPARATOR ',') as pedidos_ids
FROM wp_woocommerce_order_items oi
INNER JOIN wp_woocommerce_order_itemmeta oim_product 
    ON oi.order_item_id = oim_product.order_item_id 
    AND oim_product.meta_key = '_product_id'
INNER JOIN wp_posts p ON oim_product.meta_value = p.ID
INNER JOIN wp_posts orders ON oi.order_id = orders.ID
INNER JOIN wp_postmeta pm_email ON orders.ID = pm_email.post_id 
    AND pm_email.meta_key = '_billing_email'
WHERE orders.post_type = 'shop_order'
    AND orders.post_status IN ('wc-completed', 'wc-processing')
    AND p.post_type IN ('product', 'product_variation')
    AND pm_email.meta_value IS NOT NULL
    AND pm_email.meta_value != ''
GROUP BY pm_email.meta_value, p.post_title, p.post_name
ORDER BY email_cliente, produto_nome;
