-- Segmentacao de mensagens do mural por tipo de afiliado
ALTER TABLE affiliate_bulletin_board
ADD COLUMN IF NOT EXISTS affiliate_type VARCHAR(20) NOT NULL DEFAULT 'common';

-- Index para filtro por publico + status ativo
CREATE INDEX IF NOT EXISTS idx_bulletin_board_affiliate_type_active
ON affiliate_bulletin_board(affiliate_type, is_active, created_at DESC);
