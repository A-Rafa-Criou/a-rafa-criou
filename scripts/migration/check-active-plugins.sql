-- ============================================================
-- LISTAR PLUGINS ATIVOS NO WORDPRESS
-- Execute no Adminer: https://arafacriou.com.br/wp-adminer
-- ============================================================

SELECT 
    option_name,
    option_value
FROM wp_options 
WHERE option_name = 'active_plugins';

-- ============================================================
-- Cole o resultado aqui no chat
-- ============================================================
