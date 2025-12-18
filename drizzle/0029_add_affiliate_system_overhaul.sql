-- Migration: Add affiliate system overhaul with two types
-- This migration is ADDITIVE ONLY - no existing data or columns are removed

-- Add new columns to affiliates table
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "affiliate_type" VARCHAR(20) DEFAULT 'common' CHECK ("affiliate_type" IN ('common', 'commercial_license'));
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "terms_accepted" BOOLEAN DEFAULT FALSE;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "terms_ip" VARCHAR(45);
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "contract_signed" BOOLEAN DEFAULT FALSE;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "contract_signed_at" TIMESTAMP;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "contract_signature_data" TEXT;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "contract_document_url" TEXT;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "pix_verification_status" VARCHAR(20) DEFAULT 'pending' CHECK ("pix_verification_status" IN ('pending', 'verified', 'failed'));
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "auto_approved" BOOLEAN DEFAULT FALSE;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "materials_sent" BOOLEAN DEFAULT FALSE;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "materials_sent_at" TIMESTAMP;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "last_access_at" TIMESTAMP;
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Create affiliate_materials table for storing downloadable materials
CREATE TABLE IF NOT EXISTS "affiliate_materials" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "file_url" TEXT NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_type" VARCHAR(100),
  "file_size" INTEGER,
  "affiliate_type" VARCHAR(20) NOT NULL CHECK ("affiliate_type" IN ('common', 'commercial_license', 'both')),
  "is_active" BOOLEAN DEFAULT TRUE,
  "display_order" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "created_by" UUID REFERENCES "users"("id")
);

-- Create affiliate_material_downloads table for tracking material downloads
CREATE TABLE IF NOT EXISTS "affiliate_material_downloads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliate_id" UUID NOT NULL REFERENCES "affiliates"("id") ON DELETE CASCADE,
  "material_id" UUID NOT NULL REFERENCES "affiliate_materials"("id") ON DELETE CASCADE,
  "downloaded_at" TIMESTAMP DEFAULT NOW(),
  "ip_address" VARCHAR(45),
  "user_agent" TEXT
);

-- Create affiliate_file_access table for temporary file access (commercial license)
CREATE TABLE IF NOT EXISTS "affiliate_file_access" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliate_id" UUID NOT NULL REFERENCES "affiliates"("id") ON DELETE CASCADE,
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "file_url" TEXT NOT NULL,
  "granted_at" TIMESTAMP DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  "view_count" INTEGER DEFAULT 0,
  "print_count" INTEGER DEFAULT 0,
  "last_accessed_at" TIMESTAMP,
  "buyer_name" VARCHAR(255),
  "buyer_email" VARCHAR(255),
  "buyer_phone" VARCHAR(50),
  "is_active" BOOLEAN DEFAULT TRUE,
  "notes" TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_affiliates_type" ON "affiliates"("affiliate_type");
CREATE INDEX IF NOT EXISTS "idx_affiliates_status_type" ON "affiliates"("status", "affiliate_type");
CREATE INDEX IF NOT EXISTS "idx_affiliates_terms_accepted" ON "affiliates"("terms_accepted");
CREATE INDEX IF NOT EXISTS "idx_affiliates_contract_signed" ON "affiliates"("contract_signed");
CREATE INDEX IF NOT EXISTS "idx_affiliates_materials_sent" ON "affiliates"("materials_sent");

CREATE INDEX IF NOT EXISTS "idx_affiliate_materials_type" ON "affiliate_materials"("affiliate_type");
CREATE INDEX IF NOT EXISTS "idx_affiliate_materials_active" ON "affiliate_materials"("is_active");
CREATE INDEX IF NOT EXISTS "idx_affiliate_materials_display_order" ON "affiliate_materials"("display_order");

CREATE INDEX IF NOT EXISTS "idx_affiliate_material_downloads_affiliate" ON "affiliate_material_downloads"("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_material_downloads_material" ON "affiliate_material_downloads"("material_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_material_downloads_date" ON "affiliate_material_downloads"("downloaded_at");

CREATE INDEX IF NOT EXISTS "idx_affiliate_file_access_affiliate" ON "affiliate_file_access"("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_file_access_order" ON "affiliate_file_access"("order_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_file_access_product" ON "affiliate_file_access"("product_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_file_access_expires" ON "affiliate_file_access"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_affiliate_file_access_active" ON "affiliate_file_access"("is_active");

-- Update existing affiliates to have default type 'common'
UPDATE "affiliates" SET "affiliate_type" = 'common' WHERE "affiliate_type" IS NULL;

-- Comments for documentation
COMMENT ON COLUMN "affiliates"."affiliate_type" IS 'Type of affiliate: common (commission-based, auto-approved) or commercial_license (no commission, manual approval, temporary file access)';
COMMENT ON COLUMN "affiliates"."terms_accepted" IS 'Whether affiliate accepted terms and conditions';
COMMENT ON COLUMN "affiliates"."terms_ip" IS 'IP address when terms were accepted';
COMMENT ON COLUMN "affiliates"."contract_signed" IS 'Whether commercial license contract was digitally signed';
COMMENT ON COLUMN "affiliates"."contract_signature_data" IS 'Canvas signature data for contract';
COMMENT ON COLUMN "affiliates"."pix_verification_status" IS 'Status of PIX key verification for common affiliates';
COMMENT ON COLUMN "affiliates"."auto_approved" IS 'Whether affiliate was auto-approved (common type only)';
COMMENT ON COLUMN "affiliates"."materials_sent" IS 'Whether materials package was sent to affiliate';

COMMENT ON TABLE "affiliate_materials" IS 'Downloadable materials for affiliates (PDFs, ZIPs, images)';
COMMENT ON TABLE "affiliate_material_downloads" IS 'Track when affiliates download materials';
COMMENT ON TABLE "affiliate_file_access" IS 'Temporary file access for commercial license affiliates (5 days after sale)';
