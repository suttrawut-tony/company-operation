-- 032: Add 'revised' status to budget workflow + revisions table safety

-- Add revised to budget_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'revised'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'budget_status')
  ) THEN
    ALTER TYPE budget_status ADD VALUE 'revised';
  END IF;
END $$;

-- Ensure budget_revisions table exists (may already exist from 008)
CREATE TABLE IF NOT EXISTS budget_revisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  reason TEXT,
  old_total_budget NUMERIC(18,2),
  new_total_budget NUMERIC(18,2),
  changes JSONB,
  revision_data JSONB,
  revised_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_revisions_budget ON budget_revisions(budget_id);
