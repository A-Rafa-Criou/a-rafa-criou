-- Migration 0038: Sistema de Comissões Configurável via Admin
-- Data: 30/01/2026
-- Objetivo: Integrar sistema de afiliados com settings do admin
-- Mudanças:
--   1. Atualizar default de affiliate_min_payout de 50.00 para 0.01 (split instantâneo)
--   2. Garantir que site_settings existe com configurações de afiliados

-- ============================================================================
-- 1. ATUALIZAR DEFAULT DE MINIMUM PAYOUT (SPLIT INSTANTÂNEO)
-- ============================================================================

-- Alterar default do campo affiliate_min_payout na tabela site_settings
ALTER TABLE site_settings 
  ALTER COLUMN affiliate_min_payout SET DEFAULT '0.01';

-- NOTA: Não alteramos registros existentes para preservar configurações do admin
-- Se admin configurou R$50, mantemos. Apenas novos registros terão R$0,01.

-- ============================================================================
-- 2. VERIFICAR E INSERIR CONFIGURAÇÕES PADRÃO SE NÃO EXISTIR
-- ============================================================================

-- Inserir configurações padrão se a tabela estiver vazia
INSERT INTO site_settings (
  id,
  site_name,
  site_description,
  site_url,
  support_email,
  pix_enabled,
  stripe_enabled,
  maintenance_mode,
  allow_guest_checkout,
  max_downloads_per_product,
  download_link_expiration,
  access_days,
  enable_watermark,
  affiliate_enabled,
  affiliate_default_commission,
  affiliate_min_payout,
  affiliate_cookie_days,
  commercial_license_access_days,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'A Rafa Criou',
  'E-commerce de PDFs educacionais',
  'https://arafacriou.com.br',
  'contato@arafacriou.com.br',
  true,  -- pix_enabled
  true,  -- stripe_enabled
  false, -- maintenance_mode
  true,  -- allow_guest_checkout
  3,     -- max_downloads_per_product
  24,    -- download_link_expiration (horas)
  30,    -- access_days
  false, -- enable_watermark
  true,  -- affiliate_enabled (ativar por padrão)
  '10.00', -- affiliate_default_commission (10%)
  '0.01',  -- affiliate_min_payout (split instantâneo)
  30,      -- affiliate_cookie_days
  5,       -- commercial_license_access_days
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM site_settings LIMIT 1);

-- ============================================================================
-- 3. COMENTÁRIOS SOBRE CAMPOS DEPRECATED (NÃO REMOVEMOS AINDA)
-- ============================================================================

-- Os seguintes campos da tabela affiliates são deprecated mas mantidos para compatibilidade:
--   - stripe_account_id, stripe_onboarding_status, stripe_* (onboarding manual Stripe)
--   - mercadopago_account_id, mercadopago_split_status, mercadopago_* (onboarding manual MP)
--   - bank_name, bank_account (dados bancários antigos)
--   - preferred_payment_method (agora sempre PIX automático)
--   - payment_automation_enabled (substituído por pix_auto_transfer_enabled)
--   - minimum_payout_amount (duplicado de minimum_payout)
--
-- MOTIVO: Sistema migrou para split payment instantâneo via PIX direto (webhook)
-- REMOÇÃO: Planejada para versão futura após confirmar 100% sem uso

-- ============================================================================
-- VERIFICAÇÕES DE INTEGRIDADE
-- ============================================================================

-- Verificar que site_settings tem pelo menos 1 registro
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM site_settings LIMIT 1) THEN
    RAISE EXCEPTION 'site_settings está vazia após migration!';
  END IF;
END $$;

-- Verificar campos críticos de afiliados
DO $$
DECLARE
  missing_cols text[];
BEGIN
  SELECT array_agg(column_name)
  INTO missing_cols
  FROM (
    VALUES 
      ('affiliate_enabled'),
      ('affiliate_default_commission'),
      ('affiliate_min_payout'),
      ('affiliate_cookie_days')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = required.column_name
  );
  
  IF missing_cols IS NOT NULL THEN
    RAISE EXCEPTION 'Campos faltando em site_settings: %', array_to_string(missing_cols, ', ');
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (se necessário)
-- ============================================================================

-- Para reverter esta migration:
-- ALTER TABLE site_settings ALTER COLUMN affiliate_min_payout SET DEFAULT '50.00';
-- DELETE FROM site_settings WHERE created_at = updated_at AND affiliate_min_payout = '0.01';
