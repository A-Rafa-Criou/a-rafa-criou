-- Add canceledAt field to financial_transactions
ALTER TABLE financial_transactions
ADD COLUMN canceled_at TIMESTAMP;

COMMENT ON COLUMN financial_transactions.canceled_at IS 'Data de cancelamento de recorrência';
