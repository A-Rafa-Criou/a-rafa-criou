-- Migration: Add allowed_emails to coupons table
-- Description: Adds email restriction functionality to coupons

ALTER TABLE "coupons" ADD COLUMN "allowed_emails" text[];
