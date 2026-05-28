-- ═══════════════════════════════════════════════════════════
-- Migration 007: Retention Guarantee (เงินประกันผลงาน)
-- 5% of contract value, held until guarantee period expires
-- ═══════════════════════════════════════════════════════════

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS retention_rate    DECIMAL(5,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS retention_amount  DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retention_due_date DATE,
  ADD COLUMN IF NOT EXISTS retention_status  VARCHAR(20) DEFAULT 'none';
  -- retention_status: none | holding | released | partial

-- Update existing projects: calculate 5% retention from tor_amount
-- Set retention_due_date = end_date + 1 year (typical guarantee period)
UPDATE projects
SET retention_rate = 5.00,
    retention_amount = ROUND(tor_amount * 0.05, 2),
    retention_due_date = end_date + INTERVAL '1 year',
    retention_status = CASE
      WHEN status = 'completed' THEN 'holding'
      WHEN status = 'active' AND progress >= 50 THEN 'holding'
      ELSE 'none'
    END
WHERE retention_amount = 0 AND tor_amount > 0;
