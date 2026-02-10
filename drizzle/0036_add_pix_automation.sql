-- Migration: Adicionar suporte para pagamentos PIX automáticos
-- Data: 04/02/2026
-- Objetivo: Substituir Stripe Connect por pagamentos PIX automáticos via Mercado Pago

-- ⚠️ REGRA CRÍTICA: NUNCA APAGAR DADOS - apenas adicionar colunas

-- Configurações de pagamento automático para afiliados
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS pix_auto_transfer_enabled boolean DEFAULT true;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS minimum_payout decimal(10, 2) DEFAULT 50.00;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS last_payout_at timestamp;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS total_paid_out decimal(10, 2) DEFAULT 0;

-- Rastreamento de transferências PIX nas comissões
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS pix_transfer_id varchar(255);
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_error text;
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS transfer_attempt_count integer DEFAULT 0;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliates_pix_enabled ON affiliates(pix_auto_transfer_enabled) WHERE pix_auto_transfer_enabled = true;
CREATE INDEX IF NOT EXISTS idx_commissions_to_pay ON affiliate_commissions(status, created_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_commissions_by_affiliate ON affiliate_commissions(affiliate_id, status);

-- Comentários para documentação
COMMENT ON COLUMN affiliates.pix_auto_transfer_enabled IS 'Se true, afiliado recebe pagamentos automáticos via PIX';
COMMENT ON COLUMN affiliates.minimum_payout IS 'Valor mínimo para pagamento automático (padrão R$ 50)';
COMMENT ON COLUMN affiliates.last_payout_at IS 'Data do último pagamento automático realizado';
COMMENT ON COLUMN affiliates.total_paid_out IS 'Total já pago automaticamente para este afiliado';
COMMENT ON COLUMN affiliate_commissions.pix_transfer_id IS 'ID da transferência PIX no Mercado Pago/Asaas';
COMMENT ON COLUMN affiliate_commissions.transfer_error IS 'Mensagem de erro caso transferência falhe';
COMMENT ON COLUMN affiliate_commissions.transfer_attempt_count IS 'Número de tentativas de transferência';
