-- MIGRATION: Alterar coluna chunk_data de text para bytea
-- Se houver dados existentes em Base64, converte automaticamente
-- Se a tabela estiver vazia, apenas altera o tipo
DO $$
BEGIN
  -- Tenta converter Base64 para bytea se houver dados
  ALTER TABLE upload_chunks ALTER COLUMN chunk_data TYPE BYTEA 
    USING CASE 
      WHEN chunk_data IS NOT NULL AND chunk_data != '' 
      THEN decode(chunk_data, 'base64')
      ELSE NULL::BYTEA
    END;
EXCEPTION
  WHEN OTHERS THEN
    -- Se falhar, apenas altera o tipo (tabela vazia ou sem Base64)
    ALTER TABLE upload_chunks ALTER COLUMN chunk_data TYPE BYTEA;
END $$;
