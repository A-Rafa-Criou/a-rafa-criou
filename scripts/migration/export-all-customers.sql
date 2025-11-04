-- ============================================================
-- EXPORTAR TODOS OS CLIENTES - WORDPRESS → NEXT.JS
-- ============================================================
-- Esta query exporta TODOS os clientes de uma vez:
-- - Usuários registrados do WordPress (wp_users)
-- - Clientes "convidados" que fizeram pedidos sem conta
-- 
-- COPIE TUDO E EXECUTE DE UMA VEZ NO ADMINER
-- Depois exporte como CSV (UTF-8 com BOM)
-- ============================================================

SELECT DISTINCT
    -- ID (NULL para convidados)
    u.ID as user_id,
    
    -- Email (prioriza wp_users, depois billing_email)
    COALESCE(u.user_email, billing_emails.email) as email,
    
    -- Hash da senha (apenas para usuários registrados)
    u.user_pass as password_hash,
    
    -- Nome
    COALESCE(
        u.display_name,
        TRIM(CONCAT(
            COALESCE(billing_first.meta_value, ''),
            ' ',
            COALESCE(billing_last.meta_value, '')
        ))
    ) as name,
    
    -- Data de criação
    COALESCE(u.user_registered, orders.post_date) as created_at,
    
    -- Informações de contato
    billing_phone.meta_value as phone,
    billing_address.meta_value as address,
    billing_city.meta_value as city,
    billing_state.meta_value as state,
    billing_postcode.meta_value as zipcode,
    billing_country.meta_value as country

FROM (
    -- Emails únicos de pedidos (prioriza pedidos mais recentes)
    SELECT 
        meta_value as email, 
        MAX(post_id) as order_id
    FROM wp_postmeta pm
    WHERE meta_key = '_billing_email'
    AND meta_value IS NOT NULL
    AND meta_value != ''
    GROUP BY meta_value
) as billing_emails

-- Join com usuários (quando existe)
LEFT JOIN wp_users u ON LOWER(u.user_email) = LOWER(billing_emails.email)

-- Join com pedidos para pegar data (usando o pedido mais recente)
LEFT JOIN wp_posts orders ON orders.ID = billing_emails.order_id

-- Dados de billing do pedido mais recente
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

WHERE billing_emails.email IS NOT NULL
AND billing_emails.email != ''

ORDER BY created_at DESC;
