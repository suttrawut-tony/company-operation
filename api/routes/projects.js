const router = require('express').Router();
const db = require('../db');
const { authenticate, projectAccessFilter, requireProjectAccess, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /api/projects
// Filtered by role: executive/finance/accounting see all, others see only their projects
router.get('/', async (req, res) => {
  try {
    const filter = projectAccessFilter(req.user, 'p', 1);
    const { rows } = await db.query(
      `SELECT p.*,
              u.first_name || ' ' || u.last_name AS pm_name,
              COALESCE(u.first_name_th, '') || ' ' || COALESCE(u.last_name_th, '') AS pm_name_th
       FROM projects p LEFT JOIN users u ON p.pm_user_id = u.id
       WHERE ${filter.clause} ORDER BY p.code ASC`,
      filter.params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id
router.get('/:id', requireProjectAccess, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.first_name || ' ' || u.last_name AS pm_name,
              COALESCE(u.first_name_th,'') || ' ' || COALESCE(u.last_name_th,'') AS pm_name_th
       FROM projects p LEFT JOIN users u ON p.pm_user_id = u.id
       WHERE p.id = $1 AND p.company_id = $2`,
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { code, name, description, start_date, end_date, pm_user_id, tor_amount } = req.body;
    const { rows } = await db.query(
      `INSERT INTO projects (company_id, code, name, description, start_date, end_date, pm_user_id, tor_amount, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, code, name, description, start_date, end_date, pm_user_id, tor_amount || 0, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, status, start_date, end_date, progress,
            retention_rate, retention_due_date, retention_status } = req.body;
    const { rows } = await db.query(
      `UPDATE projects SET name=COALESCE($1,name), description=COALESCE($2,description),
       status=COALESCE($3,status), start_date=COALESCE($4,start_date), end_date=COALESCE($5,end_date),
       progress=COALESCE($6,progress),
       retention_rate=COALESCE($9,retention_rate),
       retention_due_date=COALESCE($10,retention_due_date),
       retention_status=COALESCE($11,retention_status),
       retention_amount=CASE WHEN $9 IS NOT NULL THEN ROUND(tor_amount * $9 / 100, 2) ELSE retention_amount END
       WHERE id=$7 AND company_id=$8 RETURNING *`,
      [name, description, status, start_date, end_date, progress, req.params.id, req.user.company_id,
       retention_rate || null, retention_due_date || null, retention_status || null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
    req.broadcast('project_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/members
router.get('/:id/members', requireProjectAccess, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pm.*, u.first_name, u.last_name, u.first_name_th, u.last_name_th, u.role, u.position
       FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = $1`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/members — Add member
router.post('/:id/members', requireProjectAccess, requireRole('pm','executive','admin'), async (req, res) => {
  try {
    const { user_id, role } = req.body;
    const { rows: existing } = await db.query('SELECT id FROM project_members WHERE project_id=$1 AND user_id=$2', [req.params.id, user_id]);
    if (existing.length) return res.status(400).json({ error: 'Already a member' });
    const { rows } = await db.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, user_id, role || 'member']);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id/members/:userId — Remove member
router.delete('/:id/members/:userId', requireProjectAccess, requireRole('pm','executive','admin'), async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM project_members WHERE project_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
    if (!rowCount) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/tasks
router.get('/:id/tasks', requireProjectAccess, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.first_name, u.last_name, u.first_name_th
       FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.project_id = $1 ORDER BY t.status, t.due_date`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/tasks — Create task
router.post('/:id/tasks', requireProjectAccess, async (req, res) => {
  try {
    const { title, description, priority, assigned_to, due_date, phase_id } = req.body;
    const { rows } = await db.query(
      `INSERT INTO tasks (project_id, title, description, priority, assigned_to, due_date, phase_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, title, description || null, priority || 'medium',
       assigned_to || null, due_date || null, phase_id || null, req.user.id]
    );
    res.status(201).json(rows[0]);
    req.broadcast('task_created', { project_id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:id/tasks/:taskId — Update task
router.put('/:id/tasks/:taskId', requireProjectAccess, async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, due_date } = req.body;
    const { rows } = await db.query(
      `UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description),
       status=COALESCE($3,status), priority=COALESCE($4,priority),
       assigned_to=COALESCE($5,assigned_to), due_date=COALESCE($6,due_date),
       completed_at=CASE WHEN $3='done' THEN NOW() ELSE completed_at END,
       updated_at=NOW()
       WHERE id=$7 AND project_id=$8 RETURNING *`,
      [title, description, status, priority, assigned_to, due_date, req.params.taskId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
    req.broadcast('task_updated', { project_id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id/tasks/:taskId
router.delete('/:id/tasks/:taskId', requireProjectAccess, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND project_id = $2', [req.params.taskId, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/phases
router.get('/:id/phases', requireProjectAccess, async (req, res) => {
  try {
    const { rows: phases } = await db.query(
      'SELECT * FROM phases WHERE project_id = $1 ORDER BY sort_order', [req.params.id]);
    for (const ph of phases) {
      const { rows: steps } = await db.query(
        `SELECT s.*, u.first_name, u.first_name_th FROM phase_steps s
         LEFT JOIN users u ON s.assigned_to = u.id WHERE s.phase_id = $1 ORDER BY s.sort_order`, [ph.id]);
      for (const step of steps) {
        const { rows: subs } = await db.query(
          `SELECT st.*, u.first_name, u.first_name_th FROM step_subtasks st
           LEFT JOIN users u ON st.assigned_to = u.id WHERE st.step_id = $1 ORDER BY st.sort_order`, [step.id]);
        step.subtasks = subs;
      }
      ph.steps = steps;
    }
    res.json(phases);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/phases — Create a new phase
router.post('/:id/phases', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { name, description, start_date, end_date, steps } = req.body;
    // Get max sort_order
    const { rows: maxRows } = await db.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM phases WHERE project_id = $1', [req.params.id]);
    const sortOrder = maxRows[0].next;

    const { rows } = await db.query(
      `INSERT INTO phases (project_id, name, description, sort_order, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, name, description || null, sortOrder, start_date || null, end_date || null]
    );
    const phase = rows[0];

    // Insert steps if provided
    if (steps && steps.length) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await db.query(
          `INSERT INTO phase_steps (phase_id, name, sort_order, assigned_to, start_date, end_date)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [phase.id, s.name, i + 1, s.assigned_to || null, s.start_date || null, s.end_date || null]
        );
      }
    }

    // Return phase with steps
    const { rows: stepsRows } = await db.query(
      `SELECT s.*, u.first_name, u.first_name_th FROM phase_steps s
       LEFT JOIN users u ON s.assigned_to = u.id WHERE s.phase_id = $1 ORDER BY s.sort_order`, [phase.id]);
    phase.steps = stepsRows;
    res.status(201).json(phase);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:projectId/phases/:phaseId — Update a phase
router.put('/:id/phases/:phaseId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { name, description, status, start_date, end_date, progress } = req.body;
    const { rows } = await db.query(
      `UPDATE phases SET name=COALESCE($1,name), description=COALESCE($2,description),
       status=COALESCE($3,status), start_date=COALESCE($4,start_date), end_date=COALESCE($5,end_date),
       progress=COALESCE($6,progress)
       WHERE id=$7 AND project_id=$8 RETURNING *`,
      [name, description, status, start_date, end_date, progress, req.params.phaseId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Phase not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:projectId/phases/:phaseId
router.delete('/:id/phases/:phaseId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM phases WHERE id = $1 AND project_id = $2', [req.params.phaseId, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Phase not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/phases/:phaseId/steps — Add step to phase
router.post('/:id/phases/:phaseId/steps', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { name, assigned_to, start_date, end_date } = req.body;
    const { rows: maxRows } = await db.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM phase_steps WHERE phase_id = $1', [req.params.phaseId]);
    const { rows } = await db.query(
      `INSERT INTO phase_steps (phase_id, name, sort_order, assigned_to, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.phaseId, name, maxRows[0].next, assigned_to || null, start_date || null, end_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:id/phases/:phaseId/steps/:stepId — Update step
router.put('/:id/phases/:phaseId/steps/:stepId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { name, status, assigned_to, start_date, end_date } = req.body;
    const completedAt = status === 'done' ? 'NOW()' : 'NULL';
    const { rows } = await db.query(
      `UPDATE phase_steps SET name=COALESCE($1,name), status=COALESCE($2,status),
       assigned_to=COALESCE($3,assigned_to), start_date=COALESCE($4,start_date), end_date=COALESCE($5,end_date),
       completed_at=CASE WHEN $2='done' THEN NOW() ELSE completed_at END
       WHERE id=$6 AND phase_id=$7 RETURNING *`,
      [name, status, assigned_to, start_date, end_date, req.params.stepId, req.params.phaseId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Step not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id/phases/:phaseId/steps/:stepId
router.delete('/:id/phases/:phaseId/steps/:stepId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM phase_steps WHERE id = $1 AND phase_id = $2', [req.params.stepId, req.params.phaseId]);
    if (!rowCount) return res.status(404).json({ error: 'Step not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Sub-tasks (under steps) ═══

// POST /api/projects/:id/subtasks — Create subtask
router.post('/:id/subtasks', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { step_id, name, assigned_to, due_date } = req.body;
    const { rows: maxRows } = await db.query(
      'SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM step_subtasks WHERE step_id=$1', [step_id]);
    const { rows } = await db.query(
      'INSERT INTO step_subtasks (step_id, name, sort_order, assigned_to, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [step_id, name, maxRows[0].next, assigned_to || null, due_date || null]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:id/subtasks/:subId — Update subtask
router.put('/:id/subtasks/:subId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { name, status, assigned_to, due_date } = req.body;
    const { rows } = await db.query(
      `UPDATE step_subtasks SET name=COALESCE($1,name), status=COALESCE($2,status),
       assigned_to=COALESCE($3,assigned_to), due_date=COALESCE($4,due_date),
       completed_at=CASE WHEN $2='done' THEN NOW() ELSE completed_at END
       WHERE id=$5 RETURNING *`,
      [name, status, assigned_to, due_date, req.params.subId]);
    if (!rows[0]) return res.status(404).json({ error: 'Subtask not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id/subtasks/:subId — Delete subtask
router.delete('/:id/subtasks/:subId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM step_subtasks WHERE id=$1', [req.params.subId]);
    if (!rowCount) return res.status(404).json({ error: 'Subtask not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/activity
router.get('/:id/activity', requireProjectAccess, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.first_name, u.first_name_th FROM activity_log a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.project_id = $1 ORDER BY a.created_at DESC LIMIT 10`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ═══ Discussion Threads (Pantip-style) ═══

// GET /api/projects/:id/threads — List threads
router.get('/:id/threads', requireProjectAccess, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.first_name, u.first_name_th, u.last_name, u.role,
       (SELECT COUNT(*) FROM discussions d WHERE d.thread_id = t.id) AS reply_count
       FROM discussion_threads t
       JOIN users u ON t.user_id = u.id
       WHERE t.project_id = $1
       ORDER BY t.is_pinned DESC, COALESCE(t.last_reply_at, t.created_at) DESC`,
      [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/threads — Create thread
router.post('/:id/threads', requireProjectAccess, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title required' });
    const { rows } = await db.query(
      `INSERT INTO discussion_threads (project_id, title, body, user_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, title.trim(), body || '', req.user.id]);
    res.status(201).json(rows[0]);
    req.broadcast('discussion_posted', { project_id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/threads/:threadId — Get thread with replies
router.get('/:id/threads/:threadId', requireProjectAccess, async (req, res) => {
  try {
    const { rows: [thread] } = await db.query(
      `SELECT t.*, u.first_name, u.first_name_th, u.last_name, u.role
       FROM discussion_threads t JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`, [req.params.threadId]);
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    const { rows: replies } = await db.query(
      `SELECT d.*, u.first_name, u.first_name_th, u.last_name, u.role
       FROM discussions d JOIN users u ON d.user_id = u.id
       WHERE d.thread_id = $1 ORDER BY d.created_at ASC`, [req.params.threadId]);
    res.json({ ...thread, replies });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/threads/:threadId/reply — Reply to thread
router.post('/:id/threads/:threadId/reply', requireProjectAccess, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
    const { rows } = await db.query(
      `INSERT INTO discussions (project_id, thread_id, user_id, message)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.params.threadId, req.user.id, message.trim()]);
    // Update thread
    await db.query(
      'UPDATE discussion_threads SET last_reply_at=NOW(), reply_count=reply_count+1 WHERE id=$1',
      [req.params.threadId]);
    res.status(201).json(rows[0]);
    req.broadcast('discussion_posted', { project_id: req.params.id, thread_id: req.params.threadId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/discussions — Post comment (legacy)
router.post('/:id/discussions', requireProjectAccess, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
    const { rows } = await db.query(
      `INSERT INTO discussions (project_id, user_id, message) VALUES ($1,$2,$3)
       RETURNING *, (SELECT first_name FROM users WHERE id=$2) AS first_name,
       (SELECT first_name_th FROM users WHERE id=$2) AS first_name_th,
       (SELECT last_name FROM users WHERE id=$2) AS last_name`,
      [req.params.id, req.user.id, message.trim()]);
    res.status(201).json(rows[0]);
    req.broadcast('discussion_posted', { project_id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/discussions (updated - no limit, ASC order)
router.get('/:id/discussions', requireProjectAccess, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT d.*, u.first_name, u.first_name_th, u.last_name, u.role FROM discussions d
       JOIN users u ON d.user_id = u.id
       WHERE d.project_id = $1 ORDER BY d.created_at ASC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
