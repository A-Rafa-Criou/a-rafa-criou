ALTER TABLE "orders" ADD COLUMN "paypal_order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_paypal_order_id_unique" UNIQUE("paypal_order_id");