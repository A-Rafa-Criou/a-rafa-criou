ALTER TABLE "products" DROP CONSTRAINT "products_wp_product_id_unique";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "wp_order_id";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "wp_product_id";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "wp_image_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "legacy_password_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "legacy_password_type";