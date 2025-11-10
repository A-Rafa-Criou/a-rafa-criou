-- Tabela de promoções
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"discount_type" varchar(20) NOT NULL, -- 'percentage' ou 'fixed'
	"discount_value" numeric(10, 2) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"applies_to" varchar(20) NOT NULL, -- 'all' ou 'specific'
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Tabela de junção: promoções aplicadas a produtos específicos
CREATE TABLE IF NOT EXISTS "promotion_products" (
	"promotion_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_products_promotion_id_product_id_pk" PRIMARY KEY("promotion_id","product_id")
);

-- Tabela de junção: promoções aplicadas a variações específicas
CREATE TABLE IF NOT EXISTS "promotion_variations" (
	"promotion_id" uuid NOT NULL,
	"variation_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_variations_promotion_id_variation_id_pk" PRIMARY KEY("promotion_id","variation_id")
);

-- Foreign keys
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "promotion_variations" ADD CONSTRAINT "promotion_variations_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "promotion_variations" ADD CONSTRAINT "promotion_variations_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "product_variations"("id") ON DELETE cascade ON UPDATE no action;

-- Indexes para performance
CREATE INDEX IF NOT EXISTS "promotions_is_active_idx" ON "promotions" ("is_active");
CREATE INDEX IF NOT EXISTS "promotions_dates_idx" ON "promotions" ("start_date", "end_date");
CREATE INDEX IF NOT EXISTS "promotion_products_product_id_idx" ON "promotion_products" ("product_id");
CREATE INDEX IF NOT EXISTS "promotion_variations_variation_id_idx" ON "promotion_variations" ("variation_id");
