-- ============================================================
-- EXPORTAR HASHES CORRETOS DO WORDPRESS
-- ============================================================
-- Execute esta query no Adminer do WordPress
-- Depois exporte como CSV (UTF-8 com BOM)
-- Salve como: data/test/wordpress-password-hashes.csv
-- ============================================================

SELECT 
    u.user_email as email,
    u.user_pass as password_hash
FROM wp_users u
WHERE u.user_email IS NOT NULL
AND u.user_email != ''
ORDER BY u.user_email;

-- ============================================================
-- DEPOIS DE EXPORTAR:
-- Execute: npx tsx scripts/migration/update-password-hashes.ts
-- ============================================================
