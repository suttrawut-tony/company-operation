-- Migration 045: Pre-sales modules — Tender, Bid Preparation, Contract, Guarantee, Dispute
-- Adds 10 tables covering the full pre-sales / procurement lifecycle

-- ============================================================
-- Module 1: Tender
-- ============================================================

CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  tender_number VARCHAR(30) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  tender_type VARCHAR(30) DEFAULT 'bidding',       -- direct_purchase, price_comparison, bidding
  status VARCHAR(30) DEFAULT 'draft',              -- draft, published, closed, evaluating, awarded, cancelled
  publish_date DATE,
  close_date DATE,
  opening_date DATE,
  budget_amount DECIMAL(15,2) DEFAULT 0,
  evaluation_criteria JSONB DEFAULT '[]',
  awarded_vendor_code VARCHAR(30),
  awarded_vendor_name VARCHAR(200),
  awarded_amount DECIMAL(15,2),
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  line_num INTEGER,
  item_code VARCHAR(50),
  item_name VARCHAR(300) NOT NULL,
  quantity DECIMAL(15,2) DEFAULT 1,
  uom VARCHAR(20) DEFAULT 'EA',
  estimated_price DECIMAL(15,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tender_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  vendor_code VARCHAR(30),
  vendor_name VARCHAR(200) NOT NULL,
  invited_date DATE,
  submitted_date DATE,
  status VARCHAR(30) DEFAULT 'invited',            -- invited, submitted, qualified, disqualified, awarded
  total_price DECIMAL(15,2),
  evaluation_score DECIMAL(5,2),
  evaluation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Module 2: Bid Preparation
-- ============================================================

CREATE TABLE IF NOT EXISTS bid_preparations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  tender_id UUID REFERENCES tenders(id),
  bid_number VARCHAR(30) UNIQUE NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',              -- draft, submitted, won, lost
  cost_material DECIMAL(15,2) DEFAULT 0,
  cost_labor DECIMAL(15,2) DEFAULT 0,
  cost_overhead DECIMAL(15,2) DEFAULT 0,
  cost_other DECIMAL(15,2) DEFAULT 0,
  margin_percent DECIMAL(5,2) DEFAULT 0,
  margin_amount DECIMAL(15,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  bid_price DECIMAL(15,2) DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bid_cost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_id UUID NOT NULL REFERENCES bid_preparations(id) ON DELETE CASCADE,
  category VARCHAR(30) DEFAULT 'material',         -- material, labor, overhead, other
  description VARCHAR(500),
  quantity DECIMAL(15,2) DEFAULT 1,
  unit_cost DECIMAL(15,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  pr_line_id UUID,
  vendor_code VARCHAR(30),
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- Module 3: Contract
-- ============================================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  tender_id UUID REFERENCES tenders(id),
  contract_number VARCHAR(30) UNIQUE NOT NULL,
  contract_type VARCHAR(30) DEFAULT 'main_contract', -- main_contract, subcontract, purchase_agreement
  status VARCHAR(30) DEFAULT 'draft',              -- draft, pending_review, active, completed, terminated
  counterparty_code VARCHAR(30),
  counterparty_name VARCHAR(200),
  contract_amount DECIMAL(15,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  warranty_end_date DATE,
  signing_date DATE,
  amendment_count INTEGER DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  amendment_number INTEGER NOT NULL,
  description TEXT,
  old_amount DECIMAL(15,2),
  new_amount DECIMAL(15,2),
  old_end_date DATE,
  new_end_date DATE,
  reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Module 4: Guarantee
-- ============================================================

CREATE TABLE IF NOT EXISTS guarantees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  contract_id UUID REFERENCES contracts(id),
  guarantee_type VARCHAR(30) NOT NULL,             -- bid_bond, performance_bond, advance_payment, retention_bond
  status VARCHAR(30) DEFAULT 'pending',            -- pending, submitted, approved, active, expiring, released, claimed
  guarantee_number VARCHAR(50),
  bank_name VARCHAR(200),
  bank_branch VARCHAR(200),
  amount DECIMAL(15,2) NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  release_date DATE,
  premium_rate DECIMAL(5,2),
  premium_amount DECIMAL(15,2),
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Module 5: Dispute
-- ============================================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  tender_id UUID REFERENCES tenders(id),
  contract_id UUID REFERENCES contracts(id),
  dispute_number VARCHAR(30) UNIQUE NOT NULL,
  dispute_type VARCHAR(30) NOT NULL,               -- bid_protest, contract_dispute, payment_dispute, quality_dispute
  status VARCHAR(30) DEFAULT 'open',               -- open, investigating, resolved, escalated, closed
  priority VARCHAR(10) DEFAULT 'medium',           -- low, medium, high, critical
  title VARCHAR(500),
  description TEXT,
  raised_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  amount_claimed DECIMAL(15,2),
  amount_settled DECIMAL(15,2),
  deadline DATE,
  resolved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispute_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL,                     -- comment, status_change, document_added, assigned
  description TEXT,
  old_value VARCHAR(100),
  new_value VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes: company_id + project_id for each main table
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tenders_company_project
  ON tenders (company_id, project_id);

CREATE INDEX IF NOT EXISTS idx_bid_preparations_company_project
  ON bid_preparations (company_id, project_id);

CREATE INDEX IF NOT EXISTS idx_contracts_company_project
  ON contracts (company_id, project_id);

CREATE INDEX IF NOT EXISTS idx_guarantees_company_project
  ON guarantees (company_id, project_id);

CREATE INDEX IF NOT EXISTS idx_disputes_company_project
  ON disputes (company_id, project_id);

-- ============================================================
-- Seed number_series for new doc types
-- ============================================================

INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number) VALUES
('11111111-1111-1111-1111-111111111111', 'TD', 'TD', '2606', 0),
('11111111-1111-1111-1111-111111111111', 'BD', 'BD', '2606', 0),
('11111111-1111-1111-1111-111111111111', 'CT', 'CT', '2606', 0),
('11111111-1111-1111-1111-111111111111', 'GR', 'GR', '2606', 0),
('11111111-1111-1111-1111-111111111111', 'DP', 'DP', '2606', 0)
ON CONFLICT DO NOTHING;
