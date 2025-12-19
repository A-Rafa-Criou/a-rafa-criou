-- Criação das tabelas do sistema financeiro

-- Categorias financeiras
CREATE TABLE IF NOT EXISTS financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('STORE', 'PERSONAL', 'BOTH')),
  color VARCHAR(20),
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Transações financeiras
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('STORE', 'PERSONAL')),
  recurrence VARCHAR(20) CHECK (recurrence IN ('ONE_OFF', 'MONTHLY', 'ANNUAL')),
  expense_kind VARCHAR(20) CHECK (expense_kind IN ('FIXED', 'VARIABLE', 'DAILY')),
  category_id UUID REFERENCES financial_categories(id),
  description TEXT NOT NULL,
  payment_method VARCHAR(50),
  installments_total INTEGER,
  installment_number INTEGER,
  amount_total DECIMAL(12, 2),
  amount_monthly DECIMAL(12, 2),
  amount DECIMAL(12, 2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE NOT NULL,
  paid_at TIMESTAMP,
  order_id UUID REFERENCES orders(id),
  affiliate_commission_id UUID REFERENCES affiliate_commissions(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Saldo mensal
CREATE TABLE IF NOT EXISTS monthly_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL UNIQUE,
  opening_balance DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  closing_balance_locked DECIMAL(12, 2),
  locked BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Fundos (contas anuais e investimentos)
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_type VARCHAR(20) NOT NULL CHECK (fund_type IN ('ANNUAL_BILL', 'INVESTMENT')),
  category_id UUID REFERENCES financial_categories(id),
  title VARCHAR(200) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  total_amount DECIMAL(12, 2) NOT NULL,
  monthly_amount DECIMAL(12, 2) NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Contribuições de fundos
CREATE TABLE IF NOT EXISTS fund_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  expected_amount DECIMAL(12, 2) NOT NULL,
  saved BOOLEAN DEFAULT FALSE NOT NULL,
  saved_amount DECIMAL(12, 2) DEFAULT 0,
  saved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(fund_id, month)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_scope ON financial_transactions(scope);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_paid ON financial_transactions(paid);
CREATE INDEX IF NOT EXISTS idx_fund_contributions_fund ON fund_contributions(fund_id);
CREATE INDEX IF NOT EXISTS idx_fund_contributions_month ON fund_contributions(month);

-- Inserir categorias padrão
INSERT INTO financial_categories (name, type, scope, color, icon, display_order) VALUES
-- Receitas Loja
('Vendas Online', 'INCOME', 'STORE', '#4CAF50', 'ShoppingCart', 1),
('Comissões Recebidas', 'INCOME', 'STORE', '#8BC34A', 'TrendingUp', 2),

-- Despesas Loja
('Hospedagem', 'EXPENSE', 'STORE', '#FD9555', 'Server', 10),
('Domínios', 'EXPENSE', 'STORE', '#FD9555', 'Globe', 11),
('Ferramentas', 'EXPENSE', 'STORE', '#FF9800', 'Tool', 12),
('Marketing', 'EXPENSE', 'STORE', '#FF5722', 'Megaphone', 13),
('Comissões Pagas', 'EXPENSE', 'STORE', '#E91E63', 'Users', 14),
('Taxas Pagamento', 'EXPENSE', 'STORE', '#9C27B0', 'CreditCard', 15),

-- Despesas Pessoais
('Alimentação', 'EXPENSE', 'PERSONAL', '#FED466', 'Utensils', 20),
('Transporte', 'EXPENSE', 'PERSONAL', '#2196F3', 'Car', 21),
('Moradia', 'EXPENSE', 'PERSONAL', '#00BCD4', 'Home', 22),
('Saúde', 'EXPENSE', 'PERSONAL', '#009688', 'Heart', 23),
('Educação', 'EXPENSE', 'PERSONAL', '#3F51B5', 'BookOpen', 24),
('Lazer', 'EXPENSE', 'PERSONAL', '#9C27B0', 'Smile', 25)

ON CONFLICT DO NOTHING;
