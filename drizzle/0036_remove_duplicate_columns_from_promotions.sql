-- Migration: Remove duplicate columns from promotions table
-- Date: 2026-01-30
-- Purpose: Remove columns that belong to coupons table, not promotions

-- These columns were added to promotions by mistake
-- They should only exist in coupons table

ALTER TABLE promotions DROP COLUMN IF EXISTS is_email_restricted;
ALTER TABLE promotions DROP COLUMN IF EXISTS allowed_emails;
ALTER TABLE promotions DROP COLUMN IF EXISTS max_uses_per_user;

-- The correct table for these columns is coupons
-- Verify they exist in coupons (they should already be there):
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'coupons' AND column_name IN ('allowed_emails', 'max_uses_per_user');
