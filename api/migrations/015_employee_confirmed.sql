-- 015: Add employee_confirmed fields to advance_requests
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS employee_confirmed BOOLEAN DEFAULT false;
ALTER TABLE advance_requests ADD COLUMN IF NOT EXISTS employee_confirmed_at TIMESTAMPTZ;
