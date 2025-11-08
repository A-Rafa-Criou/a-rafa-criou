-- Índices para otimizar performance do admin

-- Pedidos: buscar por status e data
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Order Items: buscar por pedido
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Usuários: buscar por role e data
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Download Permissions: buscar por usuário e produto
CREATE INDEX IF NOT EXISTS idx_download_permissions_user_id ON download_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_download_permissions_product_id ON download_permissions(product_id);

-- Produtos: buscar por featured e categoria
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Composite indexes para queries comuns
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured_created ON products(is_featured, created_at DESC);
