-- Migration: Remover valor mínimo de pagamento (Split Payment Instantâneo)
-- Data: 06/02/2026
-- Objetivo: Pagamentos instantâneos sem acúmulo - afiliado recebe a cada venda

-- ⚠️ REGRA CRÍTICA: NUNCA APAGAR DADOS - apenas alterar defaults

-- Atualizar valor mínimo para R$ 0,01 (praticamente sem mínimo)
ALTER TABLE affiliates ALTER COLUMN minimum_payout SET DEFAULT 0.01;
ALTER TABLE affiliates ALTER COLUMN minimum_payout_amount SET DEFAULT 0.01;

-- Atualizar afiliados existentes para receberem pagamento instantâneo
UPDATE affiliates 
SET 
    minimum_payout = 0.01,
    minimum_payout_amount = 0.01,
    pix_auto_transfer_enabled = true,
    updated_at = NOW()
WHERE 
    minimum_payout > 0.01 
    OR minimum_payout_amount > 0.01
    OR pix_auto_transfer_enabled = false;

-- Comentários para documentação
COMMENT ON COLUMN affiliates.minimum_payout IS 'Valor mínimo para pagamento (R$ 0,01 - split instantâneo)';
COMMENT ON COLUMN affiliates.minimum_payout_amount IS 'Valor mínimo para pagamento (R$ 0,01 - split instantâneo)';
COMMENT ON COLUMN affiliates.pix_auto_transfer_enabled IS 'Pagamento automático via PIX (true = split instantâneo a cada venda)';

-- Adicionar índice para consultas de pagamento instantâneo
CREATE INDEX IF NOT EXISTS idx_affiliates_instant_payout 
ON affiliates(pix_auto_transfer_enabled, pix_key) 
WHERE pix_auto_transfer_enabled = true AND pix_key IS NOT NULL;

-- Log da migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 0037: Valor mínimo atualizado para R$ 0,01 (split payment instantâneo)';
    RAISE NOTICE 'Afiliados atualizados: %', (SELECT COUNT(*) FROM affiliates WHERE minimum_payout = 0.01);
END $$;
