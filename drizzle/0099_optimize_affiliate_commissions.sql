-- Otimização: Índice para queries de comissões pagas
-- Problema: Query usa Seq Scan + Sort + Limit
-- Solução: Índice multi-coluna (status, created_at DESC) para acesso direto

-- Criar índice para melhorar performance de queries de comissões por status
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status_created_desc 
ON affiliate_commissions(status DESC NULLS LAST, created_at DESC)
WHERE status IS NOT NULL;

-- Também criar índice para queries de comissões aguardando pagamento (pendentes)
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_pending_affiliate
ON affiliate_commissions(status, affiliate_id, created_at DESC)
WHERE status NOT IN ('paid', 'failed', 'cancelled');

-- Índice para rastreamento de transferências por afiliado
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_transfer
ON affiliate_commissions(affiliate_id, transfer_status, created_at DESC)
WHERE transfer_status IS NOT NULL;

-- Comentário para rastreamento
COMMENT ON INDEX idx_affiliate_commissions_status_created_desc IS 
'Otimiza queries que filtram por status e ordenam por created_at DESC. Reduz Seq Scan + Sort.';
