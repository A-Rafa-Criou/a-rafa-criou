-- ============================================
-- Query: Top 50 Produtos Mais Vendidos
-- ============================================
-- Propósito: Ver quais produtos você precisa recriar primeiro
-- Uso: Executar no Adminer do WordPress
-- ============================================

SELECT 
    p.ID as produto_id_wordpress,
    p.post_title as nome_produto,
    p.post_name as slug_produto,
    COUNT(DISTINCT oi.order_id) as total_pedidos_unicos,
    SUM(CAST(oim_qty.meta_value AS UNSIGNED)) as quantidade_total_vendida,
    ROUND(SUM(CAST(oim_total.meta_value AS DECIMAL(10,2))), 2) as receita_total_brl
FROM wp_posts p
INNER JOIN wp_woocommerce_order_itemmeta oim_product 
    ON p.ID = oim_product.meta_value
    AND oim_product.meta_key = '_product_id'
INNER JOIN wp_woocommerce_order_items oi 
    ON oim_product.order_item_id = oi.order_item_id
LEFT JOIN wp_woocommerce_order_itemmeta oim_qty 
    ON oi.order_item_id = oim_qty.order_item_id 
    AND oim_qty.meta_key = '_qty'
LEFT JOIN wp_woocommerce_order_itemmeta oim_total 
    ON oi.order_item_id = oim_total.order_item_id 
    AND oim_total.meta_key = '_line_total'
INNER JOIN wp_posts orders ON oi.order_id = orders.ID
WHERE orders.post_type = 'shop_order'
    AND orders.post_status IN ('wc-completed', 'wc-processing', 'wc-on-hold')
    AND p.post_type IN ('product', 'product_variation')
GROUP BY p.ID, p.post_title, p.post_name
ORDER BY quantidade_total_vendida DESC
LIMIT 50;
