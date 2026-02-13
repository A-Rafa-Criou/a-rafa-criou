-- Mural de Notícias dos Afiliados
CREATE TABLE IF NOT EXISTS affiliate_bulletin_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index para busca de mensagens ativas
CREATE INDEX IF NOT EXISTS idx_bulletin_board_active ON affiliate_bulletin_board(is_active, created_at DESC);
