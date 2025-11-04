-- Query MÍNIMA - apenas as colunas essenciais
-- Esta deve funcionar em qualquer versão do WooCommerce

SELECT 
    dp.*,
    p.post_status as order_status,
    p.post_date as order_date
FROM wp_woocommerce_downloadable_product_permissions dp
LEFT JOIN wp_posts p ON p.ID = dp.order_id
WHERE p.post_status IN ('wc-completed', 'wc-processing')
ORDER BY dp.order_id DESC
LIMIT 5000;
