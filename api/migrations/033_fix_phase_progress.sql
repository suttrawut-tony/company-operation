-- 033: Recalculate all phase progress/status from steps

WITH step_stats AS (
  SELECT
    s.phase_id,
    COUNT(*) AS total_steps,
    COUNT(*) FILTER (WHERE s.status = 'done') AS done_steps,
    BOOL_AND(s.status = 'done') AS all_done,
    BOOL_OR(s.status IN ('done','active')) AS any_active
  FROM phase_steps s
  GROUP BY s.phase_id
)
UPDATE phases p SET
  progress = CASE
    WHEN ss.total_steps > 0
    THEN ROUND(ss.done_steps::numeric / ss.total_steps * 100)
    ELSE p.progress
  END,
  status = CASE
    WHEN ss.all_done THEN 'completed'
    WHEN ss.any_active THEN 'active'
    ELSE 'upcoming'
  END
FROM step_stats ss
WHERE p.id = ss.phase_id;
