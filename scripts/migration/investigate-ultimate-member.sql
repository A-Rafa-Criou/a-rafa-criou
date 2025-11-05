-- ============================================================
-- INVESTIGAR DADOS DO ULTIMATE MEMBER
-- Execute no Adminer: https://arafacriou.com.br/wp-adminer
-- ============================================================

-- 1. Ver TODAS as tabelas customizadas (Ultimate Member pode ter criado)
SHOW TABLES;

-- 2. Ver se Ultimate Member tem dados de senha em algum meta
SELECT 
    meta_key,
    LEFT(meta_value, 100) as valor_inicio,
    CHAR_LENGTH(meta_value) as tamanho
FROM wp_usermeta 
WHERE user_id = 1330
AND (
    meta_key LIKE '%password%' 
    OR meta_key LIKE '%pass%'
    OR meta_key LIKE '%hash%'
    OR meta_key LIKE '%um_%'
    OR CHAR_LENGTH(meta_value) BETWEEN 50 AND 70
)
ORDER BY meta_key;

-- 3. Ver configurações do Ultimate Member
SELECT 
    option_name,
    LEFT(option_value, 200) as valor
FROM wp_options 
WHERE option_name LIKE '%ultimate_member%'
OR option_name LIKE '%um_%'
ORDER BY option_name;

-- ============================================================
-- Cole os 3 resultados aqui no chat
-- ============================================================
