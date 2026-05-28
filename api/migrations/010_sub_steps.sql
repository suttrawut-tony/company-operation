-- ═══════════════════════════════════════════════════════════
-- Migration 010: Sub-steps (sub-tasks under phase_steps)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS step_subtasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id     UUID NOT NULL REFERENCES phase_steps(id) ON DELETE CASCADE,
  name        VARCHAR(300) NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  status      VARCHAR(20) DEFAULT 'pending',  -- pending, active, done
  assigned_to UUID REFERENCES users(id),
  due_date    DATE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
