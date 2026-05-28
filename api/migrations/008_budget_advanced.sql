-- ═══════════════════════════════════════════════════════════
-- Migration 008: Advanced Budget Features
-- Commitment, Controls, Revisions, Transfers, Monthly Distribution, Reject
-- ═══════════════════════════════════════════════════════════

-- 1. Budget Commitment: track committed (PR/PO reserved) vs actual (paid)
ALTER TABLE budget_lines
  ADD COLUMN IF NOT EXISTS committed_amount DECIMAL(15,2) DEFAULT 0;

-- 2. Budget Controls: warning/blocking thresholds per budget
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS warn_threshold  INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS block_threshold INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS control_mode    VARCHAR(10) DEFAULT 'warn';
  -- control_mode: none | warn | block

-- 3. Budget Revisions: track amendment history
CREATE TABLE IF NOT EXISTS budget_revisions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL DEFAULT 1,
  reason      TEXT,
  old_total_budget DECIMAL(15,2),
  new_total_budget DECIMAL(15,2),
  changes     JSONB DEFAULT '[]',
  revised_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Budget Transfers: move budget between line items
CREATE TABLE IF NOT EXISTS budget_transfers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id       UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  from_line_id    UUID NOT NULL REFERENCES budget_lines(id),
  to_line_id      UUID NOT NULL REFERENCES budget_lines(id),
  amount          DECIMAL(15,2) NOT NULL,
  reason          TEXT,
  transferred_by  UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Monthly Distribution: period-based budgeting
CREATE TABLE IF NOT EXISTS budget_periods (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id     UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  line_id       UUID REFERENCES budget_lines(id),
  period_month  INTEGER NOT NULL,  -- 1-12
  budget_amount DECIMAL(15,2) DEFAULT 0,
  actual_amount DECIMAL(15,2) DEFAULT 0,
  UNIQUE(budget_id, line_id, period_month)
);

-- 6. Reject Workflow: add reject fields
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS rejected_by   UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- Add revision counter to budgets
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 0;

-- Update committed amounts from existing PRs (split evenly across lines)
UPDATE budget_lines bl SET committed_amount = COALESCE((
  SELECT SUM(pr.total_amount)
  FROM purchase_requests pr
  WHERE pr.project_id = (SELECT project_id FROM budgets WHERE id = bl.budget_id)
    AND pr.status IN ('approved', 'pending_manager', 'pending_finance', 'pending_executive', 'sent_to_sap')
), 0) / GREATEST((SELECT COUNT(*) FROM budget_lines bl2 WHERE bl2.budget_id = bl.budget_id), 1);
