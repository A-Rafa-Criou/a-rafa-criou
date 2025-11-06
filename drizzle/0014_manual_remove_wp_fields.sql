-- Migration manual: Remover campos WordPress
-- Executar diretamente no banco de dados

-- 1. Remover constraint unique
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_wp_product_id_unique";

-- 2. Remover colunas
ALTER TABLE "orders" DROP COLUMN IF EXISTS "wp_order_id";
ALTER TABLE "products" DROP COLUMN IF EXISTS "wp_product_id";
ALTER TABLE "products" DROP COLUMN IF EXISTS "wp_image_url";
ALTER TABLE "users" DROP COLUMN IF EXISTS "legacy_password_hash";
ALTER TABLE "users" DROP COLUMN IF EXISTS "legacy_password_type";

-- Sucesso!
SELECT 'Migration concluída com sucesso!' as status;
