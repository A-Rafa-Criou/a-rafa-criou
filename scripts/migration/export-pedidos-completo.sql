-- ============================================================================
-- EXPORTAR PEDIDOS COMPLETOS DO WOOCOMMERCE
-- ============================================================================
-- Para usar no Adminer (sem acesso cPanel):
-- 1. Acesse: https://seu-site.com.br/wp-admin/adminer.php
-- 2. Vá em "SQL command"
-- 3. Cole esta query e execute
-- 4. Clique em "Export" → Format: CSV → UTF-8
-- 5. Salve como: pedidos-completo.csv
-- ============================================================================

SELECT 
    -- IDs e identificação
    p.ID as order_id,
    p.post_date as order_date,
    p.post_status as order_status,
    p.post_modified as updated_at,
    
    -- Cliente
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_customer_user' LIMIT 1) as customer_user_id,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_email' LIMIT 1) as customer_email,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_first_name' LIMIT 1) as billing_first_name,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_last_name' LIMIT 1) as billing_last_name,
    
    -- Endereço de cobrança
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_address_1' LIMIT 1) as billing_address_1,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_address_2' LIMIT 1) as billing_address_2,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_city' LIMIT 1) as billing_city,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_state' LIMIT 1) as billing_state,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_postcode' LIMIT 1) as billing_postcode,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_country' LIMIT 1) as billing_country,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_phone' LIMIT 1) as billing_phone,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_billing_cpf' LIMIT 1) as billing_cpf,
    
    -- Endereço de entrega (se diferente)
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_first_name' LIMIT 1) as shipping_first_name,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_last_name' LIMIT 1) as shipping_last_name,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_address_1' LIMIT 1) as shipping_address_1,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_address_2' LIMIT 1) as shipping_address_2,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_city' LIMIT 1) as shipping_city,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_state' LIMIT 1) as shipping_state,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_postcode' LIMIT 1) as shipping_postcode,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_shipping_country' LIMIT 1) as shipping_country,
    
    -- Valores e totais
    COALESCE((SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_order_total' LIMIT 1), '0') as order_total,
    COALESCE((SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_order_subtotal' LIMIT 1), '0') as order_subtotal,
    COALESCE((SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_order_tax' LIMIT 1), '0') as order_tax,
    COALESCE((SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_order_shipping' LIMIT 1), '0') as shipping_total,
    COALESCE((SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_order_discount' LIMIT 1), '0') as discount_total,
    COALESCE((SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_cart_discount' LIMIT 1), '0') as cart_discount,
    
    -- Moeda e cupons
    COALESCE((SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_order_currency' LIMIT 1), 'BRL') as currency,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_coupon_code' LIMIT 1) as coupon_code,
    
    -- Pagamento
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_payment_method' LIMIT 1) as payment_method,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_payment_method_title' LIMIT 1) as payment_method_title,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_transaction_id' LIMIT 1) as transaction_id,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_paid_date' LIMIT 1) as paid_date,
    
    -- Pagamento específico (Mercado Pago, PayPal, etc)
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_wc_mercadopago_payment_id' LIMIT 1) as mercadopago_payment_id,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_paypal_transaction_id' LIMIT 1) as paypal_transaction_id,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_stripe_charge_id' LIMIT 1) as stripe_charge_id,
    
    -- Informações adicionais
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_customer_ip_address' LIMIT 1) as customer_ip,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_customer_user_agent' LIMIT 1) as user_agent,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_order_key' LIMIT 1) as order_key,
    (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_customer_note' LIMIT 1) as customer_note

FROM wp_posts p
WHERE p.post_type = 'shop_order'
  AND p.post_status IN ('wc-completed', 'wc-processing', 'wc-pending', 'wc-on-hold', 'wc-cancelled', 'wc-refunded', 'wc-failed')
ORDER BY p.post_date DESC;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- - Esta query exporta TODOS os pedidos com status válido
-- - Inclui dados de pagamento (Mercado Pago, PayPal, Stripe)
-- - Inclui endereços completos (cobrança e entrega)
-- - Exporta em ordem decrescente (mais recentes primeiro)
-- - Certifique-se de exportar como UTF-8 para preservar caracteres especiais
-- ============================================================================
