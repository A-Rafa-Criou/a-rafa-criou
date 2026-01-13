-- Script para verificar se as promoções estão configuradas corretamente

-- 1. Listar todas as promoções ativas
SELECT 
    p.id,
    p.name,
    p.discount_type,
    p.discount_value,
    p.applies_to,
    p.is_active,
    p.start_date,
    p.end_date
FROM promotions p
WHERE p.is_active = true
ORDER BY p.created_at DESC;

-- 2. Ver produtos associados a cada promoção
SELECT 
    p.name as promotion_name,
    pr.name as product_name,
    pp.product_id
FROM promotions p
INNER JOIN promotion_products pp ON p.id = pp.promotion_id
INNER JOIN products pr ON pp.product_id = pr.id
WHERE p.is_active = true
ORDER BY p.name;

-- 3. Ver variações associadas a cada promoção
SELECT 
    p.name as promotion_name,
    pv.name as variation_name,
    pv2.variation_id,
    pr.name as product_name
FROM promotions p
INNER JOIN promotion_variations pv2 ON p.id = pv2.promotion_id
INNER JOIN product_variations pv ON pv2.variation_id = pv.id
INNER JOIN products pr ON pv.product_id = pr.id
WHERE p.is_active = true
ORDER BY p.name, pr.name, pv.name;

-- 4. Verificar se há produtos selecionados mas sem variações associadas
SELECT 
    p.id,
    p.name as promotion_name,
    COUNT(DISTINCT pp.product_id) as num_products,
    COUNT(DISTINCT pv.variation_id) as num_variations
FROM promotions p
LEFT JOIN promotion_products pp ON p.id = pp.promotion_id
LEFT JOIN promotion_variations pv ON p.id = pv.promotion_id
WHERE p.is_active = true
  AND p.applies_to = 'specific'
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT pp.product_id) > 0 AND COUNT(DISTINCT pv.variation_id) = 0;

-- 5. Verificar preço das variações (para ver se precisam de promoção 100%)
SELECT 
    pr.name as product_name,
    pv.name as variation_name,
    pv.price,
    pv.id as variation_id
FROM product_variations pv
INNER JOIN products pr ON pv.product_id = pr.id
WHERE pv.is_active = true
ORDER BY pr.name, pv.name;
