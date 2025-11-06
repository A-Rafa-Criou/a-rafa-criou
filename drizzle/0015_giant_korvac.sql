ALTER TABLE "users" ADD COLUMN "legacy_password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legacy_password_type" varchar(50);