-- 016: Petty Cash Module
-- Fund, disbursements, receipts, replenishment, cash count

-- Petty Cash Fund
CREATE TABLE IF NOT EXISTS petty_cash_funds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  project_id      UUID,
  fund_code       VARCHAR(20) NOT NULL,
  fund_name       VARCHAR(200) NOT NULL,
  fund_limit      DECIMAL(15,2) NOT NULL DEFAULT 5000,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  low_threshold   DECIMAL(5,2) NOT NULL DEFAULT 20,
  custodian_id    UUID,
  gl_account      VARCHAR(10) DEFAULT '111101',
  status          VARCHAR(20) DEFAULT 'active',
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Petty Cash Disbursements (เบิกจ่าย)
CREATE TABLE IF NOT EXISTS petty_cash_disbursements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id         UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL,
  doc_number      VARCHAR(30) UNIQUE,
  doc_date        DATE DEFAULT CURRENT_DATE,
  recipient       VARCHAR(200),
  description     TEXT NOT NULL,
  amount          DECIMAL(15,2) NOT NULL,
  category        VARCHAR(50) DEFAULT 'misc',
  receipt_status  VARCHAR(20) DEFAULT 'pending',
  receipt_url     TEXT,
  receipt_amount  DECIMAL(15,2),
  change_amount   DECIMAL(15,2) DEFAULT 0,
  status          VARCHAR(30) DEFAULT 'disbursed',
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  journal_id      UUID,
  remarks         TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Petty Cash Replenishment (เติมเงิน)
CREATE TABLE IF NOT EXISTS petty_cash_replenishments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id         UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL,
  doc_number      VARCHAR(30) UNIQUE,
  doc_date        DATE DEFAULT CURRENT_DATE,
  amount          DECIMAL(15,2) NOT NULL,
  bank_account_id UUID,
  reference       VARCHAR(100),
  status          VARCHAR(30) DEFAULT 'requested',
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  transferred_at  TIMESTAMPTZ,
  journal_id      UUID,
  remarks         TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Petty Cash Count (นับเงิน / ปิดงวด)
CREATE TABLE IF NOT EXISTS petty_cash_counts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id         UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL,
  count_date      DATE DEFAULT CURRENT_DATE,
  system_balance  DECIMAL(15,2) NOT NULL,
  actual_balance  DECIMAL(15,2) NOT NULL,
  difference      DECIMAL(15,2) NOT NULL DEFAULT 0,
  difference_type VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'counted',
  journal_id      UUID,
  remarks         TEXT,
  counted_by      UUID,
  approved_by     UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pc_fund_company ON petty_cash_funds(company_id);
CREATE INDEX IF NOT EXISTS idx_pc_disb_fund ON petty_cash_disbursements(fund_id);
CREATE INDEX IF NOT EXISTS idx_pc_repl_fund ON petty_cash_replenishments(fund_id);
CREATE INDEX IF NOT EXISTS idx_pc_count_fund ON petty_cash_counts(fund_id);
