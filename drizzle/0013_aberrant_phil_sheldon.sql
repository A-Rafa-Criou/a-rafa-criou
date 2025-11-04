CREATE TABLE "download_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" text,
	"order_item_id" uuid NOT NULL,
	"downloads_remaining" integer,
	"access_granted_at" timestamp DEFAULT now() NOT NULL,
	"access_expires_at" timestamp,
	"wp_order_id" integer,
	"wp_product_id" integer,
	"wp_download_key" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "permission_id" uuid;--> statement-breakpoint
ALTER TABLE "download_permissions" ADD CONSTRAINT "download_permissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_permissions" ADD CONSTRAINT "download_permissions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_permissions" ADD CONSTRAINT "download_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_permissions" ADD CONSTRAINT "download_permissions_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_permission_id_download_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."download_permissions"("id") ON DELETE no action ON UPDATE no action;