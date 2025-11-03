-- Tabela de traduções de atributos
CREATE TABLE IF NOT EXISTS "attribute_i18n" (
	"attribute_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_i18n_attribute_id_locale_pk" PRIMARY KEY("attribute_id","locale")
);

-- Tabela de traduções de valores de atributos
CREATE TABLE IF NOT EXISTS "attribute_value_i18n" (
	"value_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"value" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attribute_value_i18n_value_id_locale_pk" PRIMARY KEY("value_id","locale")
);

-- Foreign keys
DO $$ BEGIN
 ALTER TABLE "attribute_i18n" ADD CONSTRAINT "attribute_i18n_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "attribute_value_i18n" ADD CONSTRAINT "attribute_value_i18n_value_id_attribute_values_id_fk" FOREIGN KEY ("value_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS "attribute_i18n_locale_idx" ON "attribute_i18n" ("locale");
CREATE INDEX IF NOT EXISTS "attribute_i18n_slug_idx" ON "attribute_i18n" ("slug");
CREATE INDEX IF NOT EXISTS "attribute_value_i18n_locale_idx" ON "attribute_value_i18n" ("locale");
CREATE INDEX IF NOT EXISTS "attribute_value_i18n_slug_idx" ON "attribute_value_i18n" ("slug");
