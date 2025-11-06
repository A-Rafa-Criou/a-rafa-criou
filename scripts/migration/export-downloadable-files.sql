-- ================================================
-- EXPORTAR ARQUIVOS PARA DOWNLOAD DO WORDPRESS
-- ================================================
-- Este script exporta metadados de arquivos (_downloadable_files)
-- dos produtos do WooCommerce
--
-- COMO USAR:
-- 1. Acesse phpMyAdmin ou Adminer
-- 2. Copie e cole esta query
-- 3. Execute
-- 4. Exporte o resultado como CSV
-- 5. Salve em: data/test/downloadable-files.csv
-- ================================================

SELECT 
    p.ID as product_id,
    p.post_title as product_name,
    p.post_type,
    p.post_parent as parent_product_id,
    pm.meta_value as downloadable_files_json
FROM 
    wp_posts p
INNER JOIN 
    wp_postmeta pm ON p.ID = pm.post_id
WHERE 
    pm.meta_key = '_downloadable_files'
    AND p.post_type IN ('product', 'product_variation')
    AND p.post_status IN ('publish', 'private', 'inherit')
ORDER BY 
    p.post_type DESC, -- produtos primeiro, variações depois
    p.ID ASC;

-- ================================================
-- EXPLICAÇÃO DOS CAMPOS:
-- ================================================
-- product_id: ID do produto ou variação no WordPress
-- product_name: Nome do produto/variação
-- post_type: 'product' ou 'product_variation'
-- parent_product_id: ID do produto pai (0 se for produto principal)
-- downloadable_files_json: JSON serializado do PHP contendo:
--   - name: Nome do arquivo
--   - file: URL ou caminho do arquivo
--
-- EXEMPLO DE downloadable_files_json:
-- a:1:{s:32:"abc123...";a:2:{s:4:"name";s:15:"Meu PDF.pdf";s:4:"file";s:50:"https://exemplo.com/wp-content/uploads/2024/01/arquivo.pdf";}}
--
-- Este é um array serializado do PHP que precisaremos
-- desserializar no script de importação.
-- ================================================
