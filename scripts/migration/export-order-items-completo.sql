-- ============================================================================
-- EXPORTAR ITENS DE PEDIDOS DO WOOCOMMERCE
-- ============================================================================
-- Para usar no Adminer (sem acesso cPanel):
-- 1. Acesse: https://seu-site.com.br/wp-admin/adminer.php
-- 2. Vá em "SQL command"
-- 3. Cole esta query e execute
-- 4. Clique em "Export" → Format: CSV → UTF-8
-- 5. Salve como: order-items-completo.csv
-- ============================================================================

SELECT 
    -- IDs principais
    oi.order_item_id as item_id,
    oi.order_id,
    oi.order_item_name as product_name,
    oi.order_item_type as item_type,
    
    -- ID do produto
    (SELECT meta_value FROM wp_woocommerce_order_itemmeta 
     WHERE order_item_id = oi.order_item_id 
     AND meta_key = '_product_id' LIMIT 1) as product_id,
    
    -- ID da variação (se houver)
    (SELECT meta_value FROM wp_woocommerce_order_itemmeta 
     WHERE order_item_id = oi.order_item_id 
     AND meta_key = '_variation_id' LIMIT 1) as variation_id,
    
    -- Quantidade
    COALESCE(
        (SELECT meta_value FROM wp_woocommerce_order_itemmeta 
         WHERE order_item_id = oi.order_item_id 
         AND meta_key = '_qty' LIMIT 1), 
        '1'
    ) as quantity,
    
    -- Preços
    COALESCE(
        (SELECT meta_value FROM wp_woocommerce_order_itemmeta 
         WHERE order_item_id = oi.order_item_id 
         AND meta_key = '_line_total' LIMIT 1), 
        '0'
    ) as line_total,
    
    COALESCE(
        (SELECT meta_value FROM wp_woocommerce_order_itemmeta 
         WHERE order_item_id = oi.order_item_id 
         AND meta_key = '_line_subtotal' LIMIT 1), 
        '0'
    ) as line_subtotal,
    
    COALESCE(
        (SELECT meta_value FROM wp_woocommerce_order_itemmeta 
         WHERE order_item_id = oi.order_item_id 
         AND meta_key = '_line_tax' LIMIT 1), 
        '0'
    ) as line_tax,
    
    -- Informações do produto no momento da compra
    (SELECT meta_value FROM wp_woocommerce_order_itemmeta 
     WHERE order_item_id = oi.order_item_id 
     AND meta_key = '_sku' LIMIT 1) as product_sku,
    
    -- Dados da variação (se houver)
    (SELECT GROUP_CONCAT(
        CONCAT(oim2.meta_key, ':', oim2.meta_value) 
        SEPARATOR '|'
     )
     FROM wp_woocommerce_order_itemmeta oim2
     WHERE oim2.order_item_id = oi.order_item_id
     AND oim2.meta_key LIKE 'pa_%'
    ) as variation_data,
    
    -- Status do pedido para referência
    (SELECT post_status FROM wp_posts WHERE ID = oi.order_id LIMIT 1) as order_status

FROM wp_woocommerce_order_items oi
WHERE oi.order_item_type = 'line_item'
ORDER BY oi.order_id DESC, oi.order_item_id ASC;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- - Esta query exporta APENAS itens de linha (produtos)
-- - Não inclui taxas, shipping ou fees
-- - Inclui informações de variações de produto
-- - variation_data contém atributos separados por | (ex: "pa_cor:azul|pa_tam:M")
-- - Exporta em ordem: pedidos mais recentes primeiro
-- - Certifique-se de exportar como UTF-8 para preservar caracteres especiais
-- ============================================================================
