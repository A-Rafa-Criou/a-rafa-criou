-- Tabela para armazenar chunks temporários de upload
CREATE TABLE IF NOT EXISTS upload_chunks (
  upload_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_data BYTEA NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (upload_id, chunk_index)
);

-- Índice para buscar todos os chunks de um upload
CREATE INDEX IF NOT EXISTS idx_upload_chunks_upload_id ON upload_chunks(upload_id);

-- Índice para limpar uploads antigos (mais de 1 hora)
CREATE INDEX IF NOT EXISTS idx_upload_chunks_created_at ON upload_chunks(created_at);

-- Comentários
COMMENT ON TABLE upload_chunks IS 'Armazena chunks temporários de PDFs durante upload fragmentado';
COMMENT ON COLUMN upload_chunks.upload_id IS 'ID único do upload (UUID gerado no cliente)';
COMMENT ON COLUMN upload_chunks.chunk_index IS 'Índice do chunk (0-based)';
COMMENT ON COLUMN upload_chunks.chunk_data IS 'Dados binários do chunk (até 2MB)';
COMMENT ON COLUMN upload_chunks.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN upload_chunks.file_type IS 'MIME type do arquivo';
COMMENT ON COLUMN upload_chunks.total_chunks IS 'Número total de chunks esperados';
COMMENT ON COLUMN upload_chunks.file_size IS 'Tamanho total do arquivo em bytes';
COMMENT ON COLUMN upload_chunks.created_at IS 'Data de criação (para limpeza automática)';
