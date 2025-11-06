-- ================================================
-- EXPORTAR URLs DE IMAGENS DOS PRODUTOS
-- ================================================
-- Este script exporta as URLs das imagens dos produtos
-- do WordPress/WooCommerce
--
-- COMO USAR:
-- 1. Acesse phpMyAdmin ou Adminer
-- 2. Copie e cole esta query
-- 3. Execute
-- 4. Exporte o resultado como CSV
-- 5. Salve em: data/migration/product-images.csv
-- ================================================

SELECT 
    p.ID as product_id,
    p.post_title as product_name,
    p.post_type,
    p.post_parent as parent_product_id,
    -- URL da imagem principal
    (
        SELECT guid 
        FROM wp_posts img 
        WHERE img.ID = (
            SELECT meta_value 
            FROM wp_postmeta 
            WHERE post_id = p.ID 
            AND meta_key = '_thumbnail_id' 
            LIMIT 1
        )
    ) as image_url,
    -- Galeria de imagens (se houver)
    (
        SELECT meta_value 
        FROM wp_postmeta 
        WHERE post_id = p.ID 
        AND meta_key = '_product_image_gallery' 
        LIMIT 1
    ) as gallery_ids
FROM 
    wp_posts p
WHERE 
    p.post_type IN ('product', 'product_variation')
    AND p.post_status IN ('publish', 'private', 'inherit')
ORDER BY 
    p.post_type DESC,
    p.ID ASC;

-- ================================================
-- EXPLICAÇÃO DOS CAMPOS:
-- ================================================
-- product_id: ID do produto ou variação no WordPress
-- product_name: Nome do produto/variação
-- post_type: 'product' ou 'product_variation'
-- parent_product_id: ID do produto pai (0 se for produto principal)
-- image_url: URL completa da imagem principal
-- gallery_ids: IDs das imagens da galeria (separados por vírgula)
--
-- NOTAS:
-- - Produtos sem imagem terão image_url como NULL
-- - Variações podem herdar a imagem do produto pai
-- - gallery_ids pode conter múltiplos IDs: "123,456,789"
-- ================================================
