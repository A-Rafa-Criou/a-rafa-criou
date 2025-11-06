-- ============================================================================
-- EXPORTAR PRODUTOS COMPLETO - VERSÃO ADMINER (SEM OUTFILE)
-- ============================================================================
-- Execute no Adminer e clique em "Export" → CSV (UTF-8 with BOM)
-- Salvar como: data/test/produtos-completo.csv
-- ============================================================================

SELECT 
  p.ID as product_id,
  p.post_title as name,
  p.post_name as slug,
  p.post_content as description,
  p.post_excerpt as short_description,
  p.post_date as created_at,
  p.post_type as product_type,
  p.post_parent as parent_id,
  MAX(CASE WHEN pm.meta_key = '_price' THEN pm.meta_value END) as price,
  MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) as sale_price,
  MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) as regular_price,
  MAX(CASE WHEN pm.meta_key = '_sku' THEN pm.meta_value END) as sku,
  MAX(CASE WHEN pm.meta_key = '_stock_status' THEN pm.meta_value END) as stock_status,
  MAX(CASE WHEN pm.meta_key = '_downloadable' THEN pm.meta_value END) as downloadable,
  MAX(CASE WHEN pm.meta_key = '_virtual' THEN pm.meta_value END) as virtual,
  MAX(CASE WHEN pm.meta_key = '_featured' THEN pm.meta_value END) as is_featured,
  -- Categorias (pipe-separated)
  (
    SELECT GROUP_CONCAT(t.name SEPARATOR '|')
    FROM wp_term_relationships tr
    JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
    JOIN wp_terms t ON tt.term_id = t.term_id
    WHERE tr.object_id = p.ID 
    AND tt.taxonomy = 'product_cat'
  ) as categories,
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
    LIMIT 1
  ) as image_url
FROM wp_posts p
LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id
WHERE p.post_type IN ('product', 'product_variation')
  AND p.post_status = 'publish'
GROUP BY p.ID
ORDER BY p.post_type DESC, p.post_parent, p.ID;

-- ============================================================================
-- INSTRUÇÕES PARA ADMINER:
-- ============================================================================
-- 1. Acesse seu Adminer: https://seu-site.com/adminer (ou localhost)
-- 2. Faça login com suas credenciais do WordPress
-- 3. Selecione o banco de dados do WordPress
-- 4. Clique em "SQL command" (ou "Comando SQL")
-- 5. Cole a query acima
-- 6. Clique em "Execute" (Executar)
-- 7. Aguarde o resultado aparecer (pode demorar alguns segundos)
-- 8. Clique em "Export" (Exportar) no topo da tabela de resultados
-- 9. Escolha:
--    - Format: CSV
--    - Output: save (salvar arquivo)
--    - Encoding: UTF-8 with BOM
-- 10. Baixe o arquivo
-- 11. Renomeie para: produtos-completo.csv
-- 12. Coloque em: C:\Users\eddua\a-rafa-criou\data\test\produtos-completo.csv
--
-- ============================================================================
-- VERIFICAÇÃO RÁPIDA:
-- ============================================================================
-- Antes de exportar, execute esta query para ver quantos produtos existem:

SELECT 
  post_type,
  COUNT(*) as total
FROM wp_posts
WHERE post_type IN ('product', 'product_variation')
  AND post_status = 'publish'
GROUP BY post_type;

-- Resultado esperado:
-- product           → Produtos principais (exemplo: 150)
-- product_variation → Variações (exemplo: 450)
-- ============================================================================
