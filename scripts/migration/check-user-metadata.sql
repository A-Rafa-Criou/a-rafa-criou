-- ============================================================
-- DESCOBRIR PLUGINS ATIVOS E DADOS EXTRAS DO USUÁRIO
-- Execute no Adminer: https://arafacriou.com.br/wp-adminer
-- ============================================================

-- 1. Ver todos os metadados do usuário (pode ter hash alternativo)
SELECT 
    meta_key,
    meta_value,
    CHAR_LENGTH(meta_value) as tamanho
FROM wp_usermeta 
WHERE user_id = 1330
ORDER BY meta_key;

-- ============================================================
-- Cole o resultado aqui no chat
-- ============================================================
