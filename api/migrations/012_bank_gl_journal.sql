-- ═══════════════════════════════════════════════════════════
-- Migration 012: Bank Accounts + GL Journal Entries
-- ═══════════════════════════════════════════════════════════

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  code        VARCHAR(20) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  bank_name   VARCHAR(100),
  account_number VARCHAR(30),
  branch      VARCHAR(100),
  currency    VARCHAR(3) DEFAULT 'THB',
  gl_account  VARCHAR(10),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed bank accounts
INSERT INTO bank_accounts (company_id, code, name, bank_name, account_number, branch, gl_account) VALUES
('11111111-1111-1111-1111-111111111111', 'BA01', 'SCB Main Account', 'SCB', '123-4-56789-0', 'Silom', '111201'),
('11111111-1111-1111-1111-111111111111', 'BA02', 'KBank Payroll', 'KBank', '987-6-54321-0', 'Sathorn', '111202'),
('11111111-1111-1111-1111-111111111111', 'CASH', 'Petty Cash', 'Cash', '-', '-', '111101')
ON CONFLICT DO NOTHING;

-- GL Journal Entries
CREATE TABLE IF NOT EXISTS gl_journals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  doc_type      VARCHAR(20) NOT NULL, -- advance_pay, advance_settle, expense, pr, po
  doc_id        UUID,
  doc_number    VARCHAR(30),
  posting_date  DATE DEFAULT CURRENT_DATE,
  remarks       TEXT,
  total_debit   DECIMAL(15,2) DEFAULT 0,
  total_credit  DECIMAL(15,2) DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'posted', -- draft, posted, reversed
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gl_journal_lines (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id    UUID NOT NULL REFERENCES gl_journals(id) ON DELETE CASCADE,
  line_num      INTEGER DEFAULT 1,
  gl_account    VARCHAR(10) NOT NULL,
  account_name  VARCHAR(200),
  debit         DECIMAL(15,2) DEFAULT 0,
  credit        DECIMAL(15,2) DEFAULT 0,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add bank_account_id to advance_payments
ALTER TABLE advance_payments
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);

-- Add GL reference to settlements
ALTER TABLE advance_settlements
  ADD COLUMN IF NOT EXISTS journal_id UUID REFERENCES gl_journals(id);

-- Add GL reference to payments
ALTER TABLE advance_payments
  ADD COLUMN IF NOT EXISTS journal_id UUID REFERENCES gl_journals(id);
