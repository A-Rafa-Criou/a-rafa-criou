-- Adicionar configurações de afiliados em site_settings
ALTER TABLE "site_settings" ADD COLUMN "affiliate_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "site_settings" ADD COLUMN "affiliate_default_commission" numeric(10, 2) DEFAULT '10.00' NOT NULL;
ALTER TABLE "site_settings" ADD COLUMN "affiliate_min_payout" numeric(10, 2) DEFAULT '50.00' NOT NULL;
ALTER TABLE "site_settings" ADD COLUMN "affiliate_cookie_days" integer DEFAULT 30 NOT NULL;

-- Adicionar índices para performance de afiliados
CREATE INDEX IF NOT EXISTS "idx_affiliates_status" ON "affiliates" ("status");
CREATE INDEX IF NOT EXISTS "idx_affiliates_code" ON "affiliates" ("code");
CREATE INDEX IF NOT EXISTS "idx_affiliates_user_id" ON "affiliates" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_affiliate_links_affiliate_id" ON "affiliate_links" ("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_links_product_id" ON "affiliate_links" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_links_short_code" ON "affiliate_links" ("short_code");

CREATE INDEX IF NOT EXISTS "idx_affiliate_commissions_affiliate_id" ON "affiliate_commissions" ("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_commissions_order_id" ON "affiliate_commissions" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_commissions_status" ON "affiliate_commissions" ("status");
CREATE INDEX IF NOT EXISTS "idx_affiliate_commissions_created_at" ON "affiliate_commissions" ("created_at");

-- Adicionar campo para rastreamento de origem do pedido
ALTER TABLE "orders" ADD COLUMN "affiliate_id" uuid REFERENCES "affiliates"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD COLUMN "affiliate_link_id" uuid REFERENCES "affiliate_links"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_orders_affiliate_id" ON "orders" ("affiliate_id");

-- Adicionar tabela de cliques de afiliados (para detecção de fraude)
CREATE TABLE IF NOT EXISTS "affiliate_clicks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliate_id" uuid NOT NULL REFERENCES "affiliates"("id") ON DELETE CASCADE,
  "link_id" uuid REFERENCES "affiliate_links"("id") ON DELETE SET NULL,
  "ip" varchar(45),
  "user_agent" text,
  "referer" text,
  "country" varchar(2),
  "device_type" varchar(20), -- desktop, mobile, tablet
  "converted" boolean DEFAULT false NOT NULL,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
  "clicked_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_affiliate_id" ON "affiliate_clicks" ("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_ip" ON "affiliate_clicks" ("ip");
CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_clicked_at" ON "affiliate_clicks" ("clicked_at");
CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_converted" ON "affiliate_clicks" ("converted");
