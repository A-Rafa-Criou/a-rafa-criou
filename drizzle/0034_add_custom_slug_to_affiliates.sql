-- Migration: Add custom_slug to affiliates table
-- Allows affiliates to have personalized URL codes like ?ref=rafa-silva
-- @ts-nocheck
-- sqlfluff:noqa

-- Add custom_slug column
ALTER TABLE "affiliates" ADD COLUMN "custom_slug" VARCHAR(50);

-- Add unique constraint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_custom_slug_unique" UNIQUE("custom_slug");

-- Create index for faster lookups
CREATE INDEX "idx_affiliates_custom_slug" ON "affiliates"("custom_slug");
