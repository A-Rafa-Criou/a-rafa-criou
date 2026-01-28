-- Migration: Add custom_slug to affiliates table
-- Allows affiliates to have personalized URL codes like ?ref=rafa-silva

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(50) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_custom_slug ON affiliates(custom_slug);
