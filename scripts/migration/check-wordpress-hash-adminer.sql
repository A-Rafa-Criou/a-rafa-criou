-- ============================================================
-- SCRIPT PARA EXECUTAR NO ADMINER DO WORDPRESS
-- ============================================================
-- INSTRUÇÕES:
-- 1. Abra: https://arafacriou.com.br/wp-adminer
-- 2. Vá em "SQL command"
-- 3. Cole esta query
-- 4. Execute
-- 5. Copie o resultado e envie para mim
-- ============================================================

-- Ver o hash atual do usuário
SELECT 
    ID,
    user_login,
    user_email,
    user_pass as hash_atual,
    CHAR_LENGTH(user_pass) as tamanho_hash
FROM wp_users 
WHERE user_email = 'edduardooo2011@hotmail.com';

-- ============================================================
-- RESULTADO ESPERADO:
-- ID | user_login | user_email | hash_atual | tamanho_hash
-- ============================================================
