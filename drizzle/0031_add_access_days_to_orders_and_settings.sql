-- Migration: Add accessDays to orders and site_settings
-- Para controle de dias de acesso aos produtos digitais

-- Adicionar campo accessDays à tabela site_settings (configuração global)
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "access_days" integer DEFAULT 30 NOT NULL;

-- Adicionar campo accessDays à tabela orders (controle individual por pedido)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "access_days" integer DEFAULT 30;

-- Comentários para documentação
COMMENT ON COLUMN "site_settings"."access_days" IS 'Número de dias padrão de acesso aos produtos após a compra (configuração global)';
COMMENT ON COLUMN "orders"."access_days" IS 'Número de dias de acesso específico para este pedido (sobrescreve configuração global se definido)';
