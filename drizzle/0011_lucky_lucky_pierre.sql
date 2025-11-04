CREATE TABLE "attribute_i18n" (
	"attribute_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_i18n_attribute_id_locale_pk" PRIMARY KEY("attribute_id","locale")
);
--> statement-breakpoint
CREATE TABLE "attribute_value_i18n" (
	"value_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"value" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_value_i18n_value_id_locale_pk" PRIMARY KEY("value_id","locale")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "wp_order_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legacy_password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legacy_password_type" varchar(50);--> statement-breakpoint
ALTER TABLE "attribute_i18n" ADD CONSTRAINT "attribute_i18n_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_value_i18n" ADD CONSTRAINT "attribute_value_i18n_value_id_attribute_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;