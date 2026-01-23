-- Script para verificar as transações recorrentes no banco
-- Execute este script no seu cliente PostgreSQL

SELECT 
    id,
    description,
    recurrence,
    date,
    amount,
    created_at
FROM financial_transactions
WHERE recurrence IN ('QUARTERLY', 'SEMIANNUAL')
ORDER BY created_at DESC
LIMIT 20;

-- Verificar TODAS as recorrências
SELECT 
    recurrence,
    COUNT(*) as count
FROM financial_transactions
WHERE recurrence IS NOT NULL
GROUP BY recurrence
ORDER BY count DESC;
