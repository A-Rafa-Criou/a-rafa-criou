-- Criar tabela de junção para produtos e categorias (muitos-para-muitos)
CREATE TABLE IF NOT EXISTS "product_categories" (
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "is_primary" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("product_id", "category_id")
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "idx_product_categories_product" ON "product_categories"("product_id");
CREATE INDEX IF NOT EXISTS "idx_product_categories_category" ON "product_categories"("category_id");
CREATE INDEX IF NOT EXISTS "idx_product_categories_primary" ON "product_categories"("product_id", "is_primary");

-- Migrar dados existentes: copiar categoryId para a nova tabela
INSERT INTO "product_categories" ("product_id", "category_id", "is_primary", "created_at")
SELECT 
  "id",
  "category_id",
  true,
  now()
FROM "products"
WHERE "category_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- NOTA: NÃO vamos remover a coluna category_id ainda para manter compatibilidade
-- Ela será mantida como categoria principal para queries legadas
