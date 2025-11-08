-- Índices adicionais para performance máxima
-- Data: 08/11/2025

-- ============================================================================
-- ÍNDICES PARA QUERIES DE PRODUTOS (mais usado no e-commerce)
-- ============================================================================

-- Busca de produtos ativos (usado em listagens públicas)
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = true;

-- Produtos por categoria + ativos (filtro mais comum)
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active) WHERE is_active = true;

-- Busca de produtos por slug (páginas de detalhes)
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- ============================================================================
-- ÍNDICES PARA VARIAÇÕES DE PRODUTOS
-- ============================================================================

-- Variações por produto (JOIN comum)
CREATE INDEX IF NOT EXISTS idx_variations_product_id ON product_variations(product_id);

-- Variações ativas por produto
CREATE INDEX IF NOT EXISTS idx_variations_product_active ON product_variations(product_id, is_active) WHERE is_active = true;

-- ============================================================================
-- ÍNDICES PARA IMAGENS
-- ============================================================================

-- Imagens por produto (listagens)
CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id);

-- Imagem principal por produto (usado no card)
CREATE INDEX IF NOT EXISTS idx_images_product_main ON product_images(product_id, is_main) WHERE is_main = true;

-- Imagens por variação
CREATE INDEX IF NOT EXISTS idx_images_variation_id ON product_images(variation_id);

-- ============================================================================
-- ÍNDICES PARA FILES (downloads)
-- ============================================================================

-- Files por produto
CREATE INDEX IF NOT EXISTS idx_files_product_id ON files(product_id);

-- Files por variação (mais comum)
CREATE INDEX IF NOT EXISTS idx_files_variation_id ON files(variation_id);

-- ============================================================================
-- ÍNDICES PARA CATEGORIAS
-- ============================================================================

-- Categorias ativas (navegação)
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active) WHERE is_active = true;

-- Categorias por slug (páginas de categoria)
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================================================
-- ÍNDICES PARA SESSIONS (autenticação)
-- ============================================================================

-- Sessions por usuário (logout, validação)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Sessions por token (validação rápida)
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Sessions expiradas (limpeza)
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

-- ============================================================================
-- ÍNDICES PARA CART (carrinho)
-- ============================================================================

-- Carrinho por usuário (listagem)
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);

-- Carrinho por sessão (guest users)
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON cart(session_id);

-- ============================================================================
-- ANÁLISE: Verificar uso dos índices
-- ============================================================================

-- Após aplicar, executar no PostgreSQL:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;
