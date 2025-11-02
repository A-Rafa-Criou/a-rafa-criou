-- Migration: Add PayPal Order ID to orders table
-- Similar to stripePaymentIntentId for idempotency

ALTER TABLE "orders" ADD COLUMN "paypal_order_id" varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_paypal_order_id_unique" ON "orders" ("paypal_order_id");
