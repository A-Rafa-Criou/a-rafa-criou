-- Adicionar índices para otimizar busca de arquivos por productId e variationId
-- Isso acelera o carregamento de detalhes do pedido

CREATE INDEX IF NOT EXISTS "files_product_id_idx" ON "files" ("product_id");
CREATE INDEX IF NOT EXISTS "files_variation_id_idx" ON "files" ("variation_id");
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "downloads_order_id_idx" ON "downloads" ("order_id");
