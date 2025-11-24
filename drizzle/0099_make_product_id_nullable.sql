-- Migration: Tornar product_id nullable em order_items
-- Permite items históricos do WordPress sem produto correspondente no banco atual

-- Remover constraint NOT NULL do product_id
ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL;

-- Criar índice para melhorar performance de queries com product_id null
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items" ("product_id") WHERE "product_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "order_items_wp_item_id_idx" ON "order_items" ("wp_item_id") WHERE "wp_item_id" IS NOT NULL;
