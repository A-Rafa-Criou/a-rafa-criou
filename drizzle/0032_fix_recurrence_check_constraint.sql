-- Remove o CHECK constraint antigo que só permite ONE_OFF, MONTHLY, ANNUAL
-- e adiciona novo que inclui QUARTERLY e SEMIANNUAL

-- Primeiro, precisamos descobrir o nome do constraint existente
-- Vamos dropar todos os constraints na coluna recurrence
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Busca todos os constraints da coluna recurrence
    FOR constraint_name IN 
        SELECT con.conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'financial_transactions' 
        AND att.attname = 'recurrence'
        AND con.contype = 'c'  -- check constraint
    LOOP
        EXECUTE format('ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

-- Adiciona o novo CHECK constraint com todos os valores possíveis
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_recurrence_check 
CHECK (recurrence IN ('ONE_OFF', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'));
