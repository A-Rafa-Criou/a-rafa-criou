-- =====================================================
-- QUERY COMPLETA DE EXPORTAÇÃO DE PRODUTOS WORDPRESS
-- =====================================================
-- 
-- Esta query exporta produtos do WooCommerce com:
-- ✅ Nome, slug, descrições
-- ✅ Preços (regular e promocional)
-- ✅ Categorias (todas, separadas por |)
-- ✅ URL da imagem principal
-- ✅ SKU e status de estoque
-- ✅ Datas de criação
--
-- INSTRUÇÕES:
-- 1. Acesse: WordPress Admin → Ferramentas → Adminer
-- 2. Cole esta query no campo SQL
-- 3. Execute (botão "Executar")
-- 4. Clique em "Exportar" → Escolha CSV
-- 5. Salve como: data/test/test-produtos-completo.csv
-- =====================================================

SELECT DISTINCT
    p.ID as product_id,
    p.post_title as name,
    p.post_name as slug,
    p.post_content as description,
    p.post_excerpt as short_description,
    p.post_date as created_at,
    
    -- Preço regular
    COALESCE(
        (SELECT meta_value 
         FROM wp_postmeta 
         WHERE post_id = p.ID 
         AND meta_key = '_price' 
         LIMIT 1), 
        '0'
    ) as price,
    
    -- Preço promocional
    (SELECT meta_value 
     FROM wp_postmeta 
     WHERE post_id = p.ID 
     AND meta_key = '_sale_price' 
     LIMIT 1
    ) as sale_price,
    
    -- SKU
    (SELECT meta_value 
     FROM wp_postmeta 
     WHERE post_id = p.ID 
     AND meta_key = '_sku' 
     LIMIT 1
    ) as sku,
    
    -- Status estoque
    COALESCE(
        (SELECT meta_value 
         FROM wp_postmeta 
         WHERE post_id = p.ID 
         AND meta_key = '_stock_status' 
         LIMIT 1),
        'instock'
    ) as stock_status,
    
    -- Categorias (separadas por |)
    GROUP_CONCAT(
        DISTINCT t.name 
        ORDER BY t.name 
        SEPARATOR '|'
    ) as categories,
    
    -- URL da imagem principal
    (SELECT guid
     FROM wp_posts AS img
     WHERE img.ID = (
         SELECT meta_value
         FROM wp_postmeta
         WHERE post_id = p.ID
         AND meta_key = '_thumbnail_id'
         LIMIT 1
     )
     LIMIT 1
    ) as image_url,
    
    -- ID da imagem (para baixar depois)
    (SELECT meta_value
     FROM wp_postmeta
     WHERE post_id = p.ID
     AND meta_key = '_thumbnail_id'
     LIMIT 1
    ) as image_id,
    
    -- Se é produto variável
    (SELECT meta_value
     FROM wp_postmeta
     WHERE post_id = p.ID
     AND meta_key = '_product_type'
     LIMIT 1
    ) as product_type,
    
    -- Visibilidade
    (SELECT meta_value
     FROM wp_postmeta
     WHERE post_id = p.ID
     AND meta_key = '_visibility'
     LIMIT 1
    ) as visibility,
    
    -- Se está em destaque
    (SELECT meta_value
     FROM wp_postmeta
     WHERE post_id = p.ID
     AND meta_key = '_featured'
     LIMIT 1
    ) as is_featured

FROM wp_posts AS p

-- Join com categorias
LEFT JOIN wp_term_relationships AS tr ON p.ID = tr.object_id
LEFT JOIN wp_term_taxonomy AS tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
    AND tt.taxonomy = 'product_cat'
LEFT JOIN wp_terms AS t ON tt.term_id = t.term_id

WHERE 
    p.post_type = 'product'
    AND p.post_status = 'publish'

GROUP BY 
    p.ID,
    p.post_title,
    p.post_name,
    p.post_content,
    p.post_excerpt,
    p.post_date

ORDER BY p.post_date DESC;
