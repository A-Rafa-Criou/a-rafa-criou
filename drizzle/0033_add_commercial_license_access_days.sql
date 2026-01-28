-- Adicionar campo para dias de acesso de licença comercial nas configurações
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "commercial_license_access_days" integer DEFAULT 5 NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN "site_settings"."commercial_license_access_days" IS 'Dias de acesso temporário aos arquivos para afiliados com licença comercial';
