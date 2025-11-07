-- Migration: Add icon field to categories table
ALTER TABLE "categories" ADD COLUMN "icon" varchar(500);
