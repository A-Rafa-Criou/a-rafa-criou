-- Adicionar campo file_type à tabela products
ALTER TABLE products 
ADD COLUMN file_type VARCHAR(50) NOT NULL DEFAULT 'pdf';

-- Comentário explicativo
COMMENT ON COLUMN products.file_type IS 'Tipo de arquivo digital: pdf (Impressão) ou png (ZIP)';
