CREATE TABLE "affiliate_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"link_id" uuid,
	"ip" varchar(45),
	"user_agent" text,
	"referer" text,
	"country" varchar(2),
	"device_type" varchar(20),
	"converted" boolean DEFAULT false NOT NULL,
	"order_id" uuid,
	"clicked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_display_order" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"display_order" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "allowed_emails" text[];--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "wp_item_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "affiliate_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "affiliate_link_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "file_type" varchar(50) DEFAULT 'pdf' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "affiliate_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "affiliate_default_commission" numeric(10, 2) DEFAULT '10.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "affiliate_min_payout" numeric(10, 2) DEFAULT '50.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "affiliate_cookie_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_link_id_affiliate_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_display_order" ADD CONSTRAINT "product_display_order_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_affiliate_link_id_affiliate_links_id_fk" FOREIGN KEY ("affiliate_link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE no action ON UPDATE no action;