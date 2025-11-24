-- Migration: Add wp_item_id to order_items table
-- Purpose: Track WordPress original item_id to prevent duplicates and maintain data integrity

ALTER TABLE "order_items" ADD COLUMN "wp_item_id" integer;

-- Create index for faster lookups during imports
CREATE INDEX IF NOT EXISTS "order_items_wp_item_id_idx" ON "order_items"("wp_item_id");

-- Add comment for documentation
COMMENT ON COLUMN "order_items"."wp_item_id" IS 'Original WordPress item ID from WooCommerce migration';
