-- Aplicar apenas os campos access_days (sem constraints complexas)
-- Migration segura sem alterar dados existentes

-- 1. Adicionar campo accessDays à tabela site_settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_settings' AND column_name = 'access_days'
    ) THEN
        ALTER TABLE "site_settings" ADD COLUMN "access_days" integer DEFAULT 30 NOT NULL;
        RAISE NOTICE 'Coluna access_days adicionada à tabela site_settings';
    ELSE
        RAISE NOTICE 'Coluna access_days já existe na tabela site_settings';
    END IF;
END $$;

-- 2. Adicionar campo accessDays à tabela orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'access_days'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "access_days" integer DEFAULT 30;
        RAISE NOTICE 'Coluna access_days adicionada à tabela orders';
    ELSE
        RAISE NOTICE 'Coluna access_days já existe na tabela orders';
    END IF;
END $$;

-- Verificação final
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('site_settings', 'orders') 
  AND column_name = 'access_days'
ORDER BY table_name;
