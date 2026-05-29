-- 019: Advance module overhaul
-- Part 1: advance_type (advance vs reimburse)
-- Part 2: due_date for 7-day clearing
-- Part 3: overdue tracking columns

-- ═══ New columns ═══
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS advance_type VARCHAR(20) DEFAULT 'advance';
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS warning_notified_at TIMESTAMPTZ;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

-- ═══ Backfill due_date for existing paid/settling advances ═══
UPDATE advance_requests SET due_date = sub.dd
FROM (
  SELECT a.id, MIN(p.payment_date) + INTERVAL '7 days' AS dd
  FROM advance_requests a
  JOIN advance_payments p ON p.advance_id = a.id
  WHERE a.status IN ('paid','settling') AND a.due_date IS NULL
  GROUP BY a.id
) sub
WHERE advance_requests.id = sub.id;

-- ═══ Mark old paid advances (past due_date) as overdue ═══
UPDATE advance_requests
SET status = 'overdue', overdue_notified_at = NOW(), updated_at = NOW()
WHERE status = 'paid'
  AND due_date IS NOT NULL
  AND due_date < CURRENT_DATE;
