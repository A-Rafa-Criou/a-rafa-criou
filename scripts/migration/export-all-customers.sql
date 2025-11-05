-- ============================================================
-- EXPORTAR TODOS OS CLIENTES - WORDPRESS → NEXT.JS
-- ============================================================
-- Esta query exporta TODOS os clientes de uma vez:
-- - TODOS os usuários registrados do WordPress (wp_users) - COM OU SEM PEDIDOS
-- - Clientes "convidados" que fizeram pedidos sem conta
-- 
-- COPIE TUDO E EXECUTE DE UMA VEZ NO ADMINER
-- Depois exporte como CSV (UTF-8 com BOM)
-- ============================================================

-- PARTE 1: Todos os usuários registrados (com ou sem pedidos)
SELECT DISTINCT
    u.ID as user_id,
    u.user_email as email,
    u.user_pass as password_hash,
    u.display_name as name,
    u.user_registered as created_at,
    
    -- Dados de billing do pedido mais recente (se existir)
    billing_phone.meta_value as phone,
    billing_address.meta_value as address,
    billing_city.meta_value as city,
    billing_state.meta_value as state,
    billing_postcode.meta_value as zipcode,
    billing_country.meta_value as country
    
FROM wp_users u

-- Pedido mais recente do usuário (se existir)
LEFT JOIN (
    SELECT 
        pm.meta_value as user_email,
        MAX(pm.post_id) as latest_order_id
    FROM wp_postmeta pm
    WHERE pm.meta_key = '_billing_email'
    GROUP BY pm.meta_value
) latest_order ON LOWER(latest_order.user_email) = LOWER(u.user_email)

-- Dados de billing do pedido mais recente
LEFT JOIN wp_postmeta billing_phone 
    ON billing_phone.post_id = latest_order.latest_order_id 
    AND billing_phone.meta_key = '_billing_phone'
LEFT JOIN wp_postmeta billing_address 
    ON billing_address.post_id = latest_order.latest_order_id 
    AND billing_address.meta_key = '_billing_address_1'
LEFT JOIN wp_postmeta billing_city 
    ON billing_city.post_id = latest_order.latest_order_id 
    AND billing_city.meta_key = '_billing_city'
LEFT JOIN wp_postmeta billing_state 
    ON billing_state.post_id = latest_order.latest_order_id 
    AND billing_state.meta_key = '_billing_state'
LEFT JOIN wp_postmeta billing_postcode 
    ON billing_postcode.post_id = latest_order.latest_order_id 
    AND billing_postcode.meta_key = '_billing_postcode'
LEFT JOIN wp_postmeta billing_country 
    ON billing_country.post_id = latest_order.latest_order_id 
    AND billing_country.meta_key = '_billing_country'

WHERE u.user_email IS NOT NULL 
AND u.user_email != ''

UNION ALL

-- PARTE 2: Clientes convidados (pedidos sem conta)
SELECT DISTINCT
    NULL as user_id,
    billing_emails.email as email,
    NULL as password_hash,
    
    TRIM(CONCAT(
        COALESCE(billing_first.meta_value, ''),
        ' ',
        COALESCE(billing_last.meta_value, '')
    )) as name,
    
    orders.post_date as created_at,
    
    billing_phone.meta_value as phone,
    billing_address.meta_value as address,
    billing_city.meta_value as city,
    billing_state.meta_value as state,
    billing_postcode.meta_value as zipcode,
    billing_country.meta_value as country

FROM (
    SELECT 
        meta_value as email, 
        MAX(post_id) as order_id
    FROM wp_postmeta pm
    WHERE meta_key = '_billing_email'
    AND meta_value IS NOT NULL
    AND meta_value != ''
    GROUP BY meta_value
) as billing_emails

-- Verifica se NÃO é um usuário registrado
LEFT JOIN wp_users u ON LOWER(u.user_email) = LOWER(billing_emails.email)

-- Pedido e dados de billing
LEFT JOIN wp_posts orders ON orders.ID = billing_emails.order_id
LEFT JOIN wp_postmeta billing_first 
    ON billing_first.post_id = billing_emails.order_id 
    AND billing_first.meta_key = '_billing_first_name'
LEFT JOIN wp_postmeta billing_last 
    ON billing_last.post_id = billing_emails.order_id 
    AND billing_last.meta_key = '_billing_last_name'
LEFT JOIN wp_postmeta billing_phone 
    ON billing_phone.post_id = billing_emails.order_id 
    AND billing_phone.meta_key = '_billing_phone'
LEFT JOIN wp_postmeta billing_address 
    ON billing_address.post_id = billing_emails.order_id 
    AND billing_address.meta_key = '_billing_address_1'
LEFT JOIN wp_postmeta billing_city 
    ON billing_city.post_id = billing_emails.order_id 
    AND billing_city.meta_key = '_billing_city'
LEFT JOIN wp_postmeta billing_state 
    ON billing_state.post_id = billing_emails.order_id 
    AND billing_state.meta_key = '_billing_state'
LEFT JOIN wp_postmeta billing_postcode 
    ON billing_postcode.post_id = billing_emails.order_id 
    AND billing_postcode.meta_key = '_billing_postcode'
LEFT JOIN wp_postmeta billing_country 
    ON billing_country.post_id = billing_emails.order_id 
    AND billing_country.meta_key = '_billing_country'

-- Apenas convidados (sem conta)
WHERE u.ID IS NULL

ORDER BY created_at DESC;
