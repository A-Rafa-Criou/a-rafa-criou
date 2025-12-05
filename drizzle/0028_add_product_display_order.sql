-- Tabela para ordem customizada de produtos
CREATE TABLE IF NOT EXISTS "product_display_order" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"display_order" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Foreign key para produtos
ALTER TABLE "product_display_order" ADD CONSTRAINT "product_display_order_product_id_products_id_fk" 
FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
