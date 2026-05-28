-- ═══════════════════════════════════════════════════════════
-- Migration 011: Advance Full Loop
-- Request → Payment → Settlement (with lines) → Return/Reimburse
-- ═══════════════════════════════════════════════════════════

-- 1. Advance Requests (replaces using expenses table for advance)
CREATE TABLE IF NOT EXISTS advance_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  project_id      UUID REFERENCES projects(id),
  doc_number      VARCHAR(30) UNIQUE NOT NULL,
  doc_date        DATE DEFAULT CURRENT_DATE,
  employee_id     UUID NOT NULL REFERENCES users(id),
  description     TEXT,
  amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
  purpose         VARCHAR(200),
  travel_id       UUID REFERENCES travel_requests(id),
  status          VARCHAR(30) DEFAULT 'draft',
  -- draft → pending_manager → pending_finance → approved → paid → settling → settled → closed
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  remarks         TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Advance Payments (Finance records actual payment)
CREATE TABLE IF NOT EXISTS advance_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advance_id      UUID NOT NULL REFERENCES advance_requests(id) ON DELETE CASCADE,
  payment_date    DATE DEFAULT CURRENT_DATE,
  payment_method  VARCHAR(30) DEFAULT 'transfer', -- transfer, cash, cheque
  bank_account    VARCHAR(50),
  reference       VARCHAR(100),
  amount          DECIMAL(15,2) NOT NULL,
  remarks         TEXT,
  paid_by         UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Advance Settlements (employee submits clearing)
CREATE TABLE IF NOT EXISTS advance_settlements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advance_id      UUID NOT NULL REFERENCES advance_requests(id) ON DELETE CASCADE,
  doc_number      VARCHAR(30) UNIQUE NOT NULL,
  doc_date        DATE DEFAULT CURRENT_DATE,
  total_expense   DECIMAL(15,2) DEFAULT 0,
  advance_amount  DECIMAL(15,2) DEFAULT 0,  -- original advance
  difference      DECIMAL(15,2) DEFAULT 0,  -- positive = company owes employee, negative = employee owes company
  settlement_type VARCHAR(20) DEFAULT 'exact', -- exact, return, reimburse
  status          VARCHAR(30) DEFAULT 'draft',
  -- draft → pending_manager → pending_finance → approved → closed
  remarks         TEXT,
  submitted_by    UUID REFERENCES users(id),
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Settlement Line Items (each expense item in the clearing)
CREATE TABLE IF NOT EXISTS settlement_lines (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id   UUID NOT NULL REFERENCES advance_settlements(id) ON DELETE CASCADE,
  description     VARCHAR(300) NOT NULL,
  category        VARCHAR(50),  -- travel, food, accommodation, transport, material, misc
  amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
  receipt_date    DATE,
  receipt_number  VARCHAR(50),
  has_receipt     BOOLEAN DEFAULT false,
  sap_account     VARCHAR(10),
  tax_code        VARCHAR(10),
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add advance balance tracking
ALTER TABLE advance_requests
  ADD COLUMN IF NOT EXISTS paid_amount      DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settled_amount   DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance          DECIMAL(15,2) DEFAULT 0;
  -- balance = paid_amount - settled_amount (positive = employee owes, negative = company owes)

-- Index
CREATE INDEX IF NOT EXISTS idx_advance_company ON advance_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_advance_project ON advance_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_advance_employee ON advance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_settlement_advance ON advance_settlements(advance_id);
