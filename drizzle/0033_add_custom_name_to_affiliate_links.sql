-- Migration: Add custom_name to affiliate_links
-- Allows affiliates to organize links with custom names
-- Links remain permanent (no expiry)

ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);
