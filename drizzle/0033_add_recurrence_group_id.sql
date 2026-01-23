-- Adiciona campo recurrence_group_id para identificar transações da mesma série recorrente
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS recurrence_group_id UUID;

-- Criar índice para melhor performance nas queries por grupo
CREATE INDEX IF NOT EXISTS idx_financial_transactions_recurrence_group 
ON financial_transactions(recurrence_group_id) 
WHERE recurrence_group_id IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN financial_transactions.recurrence_group_id IS 'UUID único para agrupar transações recorrentes da mesma série. Todas as ocorrências (mensal, trimestral, etc) compartilham o mesmo group_id';
