-- ============================================================
-- VERIFICAR HASH DA SENHA NO WORDPRESS
-- ============================================================
-- Execute esta query no Adminer do WordPress para pegar
-- o hash DIRETO da tabela wp_users
-- ============================================================

SELECT 
    ID,
    user_login,
    user_email,
    user_pass as password_hash,
    LENGTH(user_pass) as hash_length,
    SUBSTRING(user_pass, 1, 4) as hash_prefix
FROM wp_users 
WHERE user_email = 'edduardooo2011@hotmail.com'
LIMIT 1;

-- ============================================================
-- RESULTADO ESPERADO:
-- - Se hash começar com $P$ ou $H$ = phpass (WordPress antigo)
-- - Se hash começar com $2y$ = bcrypt (WordPress moderno)
-- - Tamanho: 34 chars (phpass) ou 60 chars (bcrypt)
-- ============================================================
