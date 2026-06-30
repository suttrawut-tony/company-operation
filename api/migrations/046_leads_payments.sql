-- ═══════════════════════════════════════════════════════════
-- Migration 046: Leads + Payments + Warranty support
-- ═══════════════════════════════════════════════════════════

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  lead_number VARCHAR(20),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  customer_address TEXT,
  source VARCHAR(30) DEFAULT 'phone',  -- phone, line, website, walk_in, referral
  interest_type VARCHAR(50),           -- on_grid, off_grid, hybrid, survey, other
  estimated_kwp DECIMAL(10,2),
  monthly_bill DECIMAL(12,2),
  roof_type VARCHAR(30),
  location TEXT,
  status VARCHAR(20) DEFAULT 'new',    -- new, contacted, qualified, quoted, won, lost
  assigned_to INTEGER,
  lost_reason TEXT,
  notes TEXT,
  project_id INTEGER,
  quotation_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  payment_number VARCHAR(20),
  project_id INTEGER,
  quotation_id INTEGER,
  customer_name VARCHAR(255),
  payment_type VARCHAR(20) NOT NULL DEFAULT 'deposit',  -- deposit, installment, final, full
  status VARCHAR(20) DEFAULT 'pending',                  -- pending, received, cancelled
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(18,2) DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  payment_method VARCHAR(20),                            -- cash, transfer, cheque, credit_card
  payment_date DATE,
  reference_no VARCHAR(100),
  receipt_number VARCHAR(50),
  bank_account VARCHAR(100),
  remarks TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);

-- Add warranty fields to guarantees
ALTER TABLE guarantees ADD COLUMN IF NOT EXISTS warranty_start_date DATE;
ALTER TABLE guarantees ADD COLUMN IF NOT EXISTS warranty_scope TEXT;
ALTER TABLE guarantees ADD COLUMN IF NOT EXISTS customer_selected_date BOOLEAN DEFAULT false;
-- guarantee_type is VARCHAR so 'warranty' value works without ALTER
