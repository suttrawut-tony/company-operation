-- 036_perf_indexes.sql
-- Performance: add the missing child-FK indexes that back the hot read paths
-- and the N+1 inner-loop lookups. Index-only, idempotent (IF NOT EXISTS),
-- no data / no schema-logic changes. Mirrors the existing indexing convention
-- where every other child table already indexes its parent FK.
--
-- Evidence (EXPLAIN ANALYZE on local DB): each of the columns below is filtered
-- with `WHERE <fk> = $1` and currently does a Seq Scan. At today's tiny row
-- counts the planner stays on Seq Scan; these indexes pay off as the tables
-- grow (and let the planner switch to Index Scan once seqscan is no longer the
-- cheaper plan). They never change query RESULTS, only access paths.

-- phase_steps.phase_id
--   routes/projects.js  recalcPhaseProgress() + GET /:id/phases inner loop
--   (SELECT ... FROM phase_steps WHERE phase_id = $1) — runs once per phase.
CREATE INDEX IF NOT EXISTS idx_phase_steps_phase ON phase_steps (phase_id);

-- step_subtasks.step_id
--   routes/projects.js  recalcStepStatus()/recalcPhaseProgress() + GET /:id/phases
--   innermost loop (SELECT ... FROM step_subtasks WHERE step_id = $1) —
--   runs once per step.
CREATE INDEX IF NOT EXISTS idx_step_subtasks_step ON step_subtasks (step_id);

-- settlement_lines.settlement_id
--   routes/advance.js  GET /:id inner loop + settle/approve flows
--   (SELECT ... FROM settlement_lines WHERE settlement_id = $1) — runs once
--   per settlement.
CREATE INDEX IF NOT EXISTS idx_settlement_lines_settlement ON settlement_lines (settlement_id);

-- phases.project_id
--   routes/projects.js  GET /:id/phases, /:id/phase-costs, /:id/cost-summary,
--   /:id/finance-summary, payment-schedule/generate — all filter
--   (SELECT ... FROM phases WHERE project_id = $1). Highest-traffic gap.
CREATE INDEX IF NOT EXISTS idx_phases_project ON phases (project_id);
