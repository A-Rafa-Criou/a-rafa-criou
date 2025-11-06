-- Remove price column from products table
-- Price should only exist in product_variations
ALTER TABLE "products" DROP COLUMN IF EXISTS "price";
