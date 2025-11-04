ALTER TABLE "products" ADD COLUMN "wp_product_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "wp_image_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_wp_product_id_unique" UNIQUE("wp_product_id");