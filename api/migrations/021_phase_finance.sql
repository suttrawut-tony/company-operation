-- 021: Phase Finance — Payment Schedule + Phase Costs + Finance Dashboard

-- ═══ Phase columns ═══
ALTER TABLE phases ADD COLUMN IF NOT EXISTS planned_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE phases ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE phases ADD COLUMN IF NOT EXISTS cost_variance DECIMAL(15,2) DEFAULT 0;

-- ═══ Phase Payment Schedule (Revenue) ═══
CREATE TABLE IF NOT EXISTS phase_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  payment_term VARCHAR(50),
  description TEXT,
  percentage DECIMAL(5,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  retention_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) DEFAULT 0,
  due_conditions TEXT,
  expected_date DATE,
  invoice_number VARCHAR(50),
  invoice_date DATE,
  received_date DATE,
  received_amount DECIMAL(15,2) DEFAULT 0,
  wht_amount DECIMAL(15,2) DEFAULT 0,
  actual_net DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(30),
  bank_reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_phase_payments_project ON phase_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_payments_phase ON phase_payments(phase_id);

-- ═══ Phase Costs (Expenses) ═══
CREATE TABLE IF NOT EXISTS phase_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  cost_type VARCHAR(30) DEFAULT 'misc',
  description VARCHAR(300),
  planned_amount DECIMAL(15,2) DEFAULT 0,
  actual_amount DECIMAL(15,2) DEFAULT 0,
  pr_id UUID REFERENCES purchase_requests(id),
  po_id UUID REFERENCES purchase_orders(id),
  expense_id UUID REFERENCES expenses(id),
  advance_id UUID REFERENCES advance_requests(id),
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_phase_costs_project ON phase_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_costs_phase ON phase_costs(phase_id);
