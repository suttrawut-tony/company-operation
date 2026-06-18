const router = require('express').Router();
const db = require('../db');
const { authenticate, projectAccessFilter, requireProjectAccess, requireRole } = require('../middleware/auth');

router.use(authenticate);

// === Auto-recalc phase progress + status from steps/subtasks ===
async function recalcStepStatus(stepId) {
  const { rows: subs } = await db.query('SELECT status FROM step_subtasks WHERE step_id=$1', [stepId]);
  if (!subs.length) return null;
  var allDone = subs.every(function(s) { return s.status === 'done'; });
  var anyActive = subs.some(function(s) { return s.status === 'done' || s.status === 'active'; });
  var stepStatus = allDone ? 'done' : anyActive ? 'active' : 'pending';
  await db.query(
    "UPDATE phase_steps SET status=$1, completed_at=CASE WHEN $1='done' THEN NOW() ELSE NULL END WHERE id=$2",
    [stepStatus, stepId]);
  return stepStatus;
}

async function recalcPhaseProgress(phaseId) {
  const { rows: steps } = await db.query('SELECT id, status FROM phase_steps WHERE phase_id=$1', [phaseId]);
  if (!steps.length) return;
  var totalProgress = 0;
  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    var { rows: subs } = await db.query('SELECT status FROM step_subtasks WHERE step_id=$1', [step.id]);
    var stepProg;
    if (subs.length > 0) {
      var subDone = subs.filter(function(s) { return s.status === 'done'; }).length;
      stepProg = Math.round(subDone / subs.length * 100);
    } else {
      stepProg = step.status === 'done' ? 100 : step.status === 'active' ? 50 : 0;
    }
    totalProgress += stepProg;
  }
  var phaseProgress = Math.round(totalProgress / steps.length);
  var allDone = steps.every(function(s) { return s.status === 'done'; });
  var anyActive = steps.some(function(s) { return s.status === 'done' || s.status === 'active'; });
  var phaseStatus = allDone ? 'completed' : anyActive ? 'active' : 'upcoming';
  await db.query('UPDATE phases SET progress=$1, status=$2::phase_status WHERE id=$3', [phaseProgress, phaseStatus, phaseId]);
}

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
    const { code, name, description, start_date, end_date, pm_user_id, tor_amount, status } = req.body;
    const { rows } = await db.query(
      `INSERT INTO projects (company_id, code, name, description, start_date, end_date, pm_user_id, tor_amount, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::project_status,'planning'),$10) RETURNING *`,
      [req.user.company_id, code, name, description, start_date, end_date, pm_user_id, tor_amount || 0, status || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'รหัสโปรเจกต์ "' + code + '" ซ้ำ กรุณาใช้รหัสอื่น' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = ['code','name','description','status','start_date','end_date','progress','pm_user_id','tor_amount','budget_amount','retention_rate','retention_due_date','retention_status'];
    const sets = []; const params = []; let idx = 1;
    let retRateParamIdx = null;
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); if (f === 'retention_rate') retRateParamIdx = idx - 1; }
    }
    // Auto-calc retention_amount if retention_rate changed
    if (req.body.retention_rate !== undefined) {
      sets.push(`retention_amount = ROUND(tor_amount * $${retRateParamIdx} / 100, 2)`);
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id); params.push(req.user.company_id);
    const { rows } = await db.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx++} AND company_id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
    req.broadcast('project_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id — Cancel project (soft delete, executive only)
router.delete('/:id', async (req, res) => {
  try {
    if (!['executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'PERMISSION_DENIED', message: 'เฉพาะ executive เท่านั้น' });
    }
    const { rows } = await db.query(
      "UPDATE projects SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING id, code, name, status",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ cancelled: true, ...rows[0] });
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
      `SELECT t.*, u.first_name, u.last_name, u.first_name_th,
       jo.job_order_number, jo.title AS jo_title
       FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN job_orders jo ON t.job_order_id = jo.id
       WHERE t.project_id = $1 ORDER BY t.sort_order, t.status, t.due_date`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/tasks — Create task
router.post('/:id/tasks', requireProjectAccess, async (req, res) => {
  try {
    const { title, description, priority, assigned_to, due_date, start_date, phase_id,
            start_time, end_time, estimated_hours, job_order_id, booking_id, location, task_type } = req.body;
    const { rows } = await db.query(
      `INSERT INTO tasks (project_id, title, description, priority, assigned_to, due_date, start_date, phase_id,
        start_time, end_time, estimated_hours, job_order_id, booking_id, location, task_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [req.params.id, title, description||null, priority||'medium',
       assigned_to||null, due_date||null, start_date||null, phase_id||null,
       start_time||null, end_time||null, estimated_hours||null,
       job_order_id||null, booking_id||null, location||null, task_type||'general', req.user.id]
    );
    res.status(201).json(rows[0]);
    req.broadcast('task_created', { project_id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/:id/tasks/:taskId — Update task
router.put('/:id/tasks/:taskId', requireProjectAccess, async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, due_date, start_date,
            start_time, end_time, estimated_hours, actual_hours, location, task_type } = req.body;
    const { rows } = await db.query(
      `UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description),
       status=COALESCE($3,status), priority=COALESCE($4,priority),
       assigned_to=COALESCE($5,assigned_to), due_date=COALESCE($6,due_date),
       start_date=COALESCE($7,start_date),
       start_time=COALESCE($8,start_time), end_time=COALESCE($9,end_time),
       estimated_hours=COALESCE($10,estimated_hours), actual_hours=COALESCE($11,actual_hours),
       location=COALESCE($12,location), task_type=COALESCE($13,task_type),
       completed_at=CASE WHEN $3='done' THEN NOW() ELSE completed_at END,
       updated_at=NOW()
       WHERE id=$14 AND project_id=$15 RETURNING *`,
      [title, description, status, priority, assigned_to, due_date, start_date,
       start_time, end_time, estimated_hours, actual_hours, location, task_type,
       req.params.taskId, req.params.id]
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
    recalcPhaseProgress(req.params.phaseId).catch(e => console.error('recalc error:', e));
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
    // Recalc phase progress after step update
    recalcPhaseProgress(req.params.phaseId).catch(e => console.error('recalc error:', e));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id/phases/:phaseId/steps/:stepId
router.delete('/:id/phases/:phaseId/steps/:stepId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM phase_steps WHERE id = $1 AND phase_id = $2', [req.params.stepId, req.params.phaseId]);
    if (!rowCount) return res.status(404).json({ error: 'Step not found' });
    res.json({ success: true });
    recalcPhaseProgress(req.params.phaseId).catch(e => console.error('recalc error:', e));
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
    // Recalc step → phase
    recalcStepStatus(step_id).then(function() {
      return db.query('SELECT phase_id FROM phase_steps WHERE id=$1', [step_id]);
    }).then(function(r) { if (r.rows[0]) recalcPhaseProgress(r.rows[0].phase_id); }).catch(function(e) { console.error('recalc error:', e); });
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
    // Recalc step → phase
    var sub = rows[0];
    recalcStepStatus(sub.step_id).then(function() {
      return db.query('SELECT phase_id FROM phase_steps WHERE id=$1', [sub.step_id]);
    }).then(function(r) { if (r.rows[0]) recalcPhaseProgress(r.rows[0].phase_id); }).catch(function(e) { console.error('recalc error:', e); });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:id/subtasks/:subId — Delete subtask
router.delete('/:id/subtasks/:subId', requireProjectAccess, requireRole('pm','executive'), async (req, res) => {
  try {
    // Get step_id before deleting
    const { rows: [subInfo] } = await db.query('SELECT step_id FROM step_subtasks WHERE id=$1', [req.params.subId]);
    const { rowCount } = await db.query('DELETE FROM step_subtasks WHERE id=$1', [req.params.subId]);
    if (!rowCount) return res.status(404).json({ error: 'Subtask not found' });
    res.json({ success: true });
    // Recalc step → phase
    if (subInfo) {
      recalcStepStatus(subInfo.step_id).then(function() {
        return db.query('SELECT phase_id FROM phase_steps WHERE id=$1', [subInfo.step_id]);
      }).then(function(r) { if (r.rows[0]) recalcPhaseProgress(r.rows[0].phase_id); }).catch(function(e) { console.error('recalc error:', e); });
    }
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

// ═══════════════════════════════════════════════════════════
// Phase Finance: Payment Schedule + Phase Costs + Dashboard
// ═══════════════════════════════════════════════════════════

// ═══ Payment Schedule (Revenue) ═══

// GET /api/projects/:id/payment-schedule
router.get('/:id/payment-schedule', async (req, res) => {
  try {
    const { rows: payments } = await db.query(
      `SELECT pp.*, ph.name AS phase_name,
              pp.is_final, pp.inspection_status, pp.inspection_date, pp.inspection_notes
       FROM phase_payments pp LEFT JOIN phases ph ON pp.phase_id = ph.id
       WHERE pp.project_id = $1 ORDER BY pp.sort_order, pp.created_at`, [req.params.id]);
    const { rows: [proj] } = await db.query('SELECT tor_amount, retention_rate FROM projects WHERE id=$1', [req.params.id]);
    const total = parseFloat(proj?.tor_amount || 0);
    const invoiced = payments.filter(p => ['invoiced','partially_paid','paid'].includes(p.status)).reduce((s,p) => s + parseFloat(p.amount||0), 0);
    const received = payments.reduce((s,p) => s + parseFloat(p.received_amount||0), 0);
    const retention = payments.reduce((s,p) => s + parseFloat(p.retention_amount||0), 0);
    res.json({ payments, summary: { total_contract: total, total_invoiced: invoiced, total_received: received, total_outstanding: total - received, total_retention: retention } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/payment-schedule
router.post('/:id/payment-schedule', async (req, res) => {
  try {
    const { phase_id, payment_term, description, percentage, due_conditions, expected_date, remarks, sort_order, is_final } = req.body;
    const { rows: [proj] } = await db.query('SELECT tor_amount, retention_rate FROM projects WHERE id=$1', [req.params.id]);
    const tor = parseFloat(proj?.tor_amount || 0);
    const retRate = parseFloat(proj?.retention_rate || 0);
    const pct = parseFloat(percentage || 0);
    const amount = tor * pct / 100;
    const retAmt = amount * retRate / 100;
    const net = amount - retAmt;
    const { rows: [p] } = await db.query(
      `INSERT INTO phase_payments (project_id, phase_id, payment_term, description, percentage, amount, retention_amount, net_amount, due_conditions, expected_date, remarks, sort_order, is_final, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.params.id, phase_id||null, payment_term, description, pct, amount, retAmt, net, due_conditions, expected_date||null, remarks, sort_order||0, is_final||false, req.user.id]);
    res.status(201).json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/payment-schedule/:paymentId
router.put('/payment-schedule/:paymentId', async (req, res) => {
  try {
    const fields = ['payment_term','description','percentage','due_conditions','expected_date','invoice_number','invoice_date','received_date','received_amount','wht_amount','actual_net','payment_method','bank_reference','status','remarks','sort_order','phase_id','is_final','inspection_status','inspection_date','inspection_notes'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    // Recalculate amount if percentage changed
    if (req.body.percentage !== undefined) {
      const { rows: [pp] } = await db.query('SELECT project_id FROM phase_payments WHERE id=$1', [req.params.paymentId]);
      if (pp) {
        const { rows: [proj] } = await db.query('SELECT tor_amount, retention_rate FROM projects WHERE id=$1', [pp.project_id]);
        const tor = parseFloat(proj?.tor_amount||0);
        const retRate = parseFloat(proj?.retention_rate||0);
        const pct = parseFloat(req.body.percentage);
        const amount = tor * pct / 100;
        const retAmt = amount * retRate / 100;
        sets.push(`amount = $${idx++}`); params.push(amount);
        sets.push(`retention_amount = $${idx++}`); params.push(retAmt);
        sets.push(`net_amount = $${idx++}`); params.push(amount - retAmt);
      }
    }
    // Auto-set status to invoiced when invoice_number provided
    if (req.body.invoice_number && !req.body.status) { sets.push(`status = $${idx++}`); params.push('invoiced'); }
    // Auto-set status to paid when received_amount >= amount
    if (req.body.received_amount !== undefined && !req.body.status) {
      const { rows: [pp] } = await db.query('SELECT amount FROM phase_payments WHERE id=$1', [req.params.paymentId]);
      if (pp && parseFloat(req.body.received_amount) >= parseFloat(pp.amount)) { sets.push(`status = $${idx++}`); params.push('paid'); }
      else if (parseFloat(req.body.received_amount) > 0) { sets.push(`status = $${idx++}`); params.push('partially_paid'); }
    }

    // ═══ Final Payment Inspection Guard ═══
    // If updating status to 'released' or 'paid', check if this is the final payment
    // and whether inspection is completed
    const targetStatus = req.body.status;
    if (targetStatus === 'released' || targetStatus === 'paid') {
      const { rows: [current] } = await db.query(
        'SELECT is_final, inspection_status, project_id, sort_order FROM phase_payments WHERE id=$1',
        [req.params.paymentId]);
      if (current) {
        // Determine if this is the final milestone: explicitly marked OR highest sort_order
        let isFinal = current.is_final;
        if (!isFinal) {
          const { rows: [maxSort] } = await db.query(
            'SELECT MAX(sort_order) AS max_sort FROM phase_payments WHERE project_id=$1',
            [current.project_id]);
          if (maxSort && current.sort_order === maxSort.max_sort) isFinal = true;
        }
        if (isFinal) {
          // Use the incoming inspection_status if provided, otherwise use the stored one
          const effectiveInspection = req.body.inspection_status || current.inspection_status;
          if (effectiveInspection !== 'completed') {
            return res.status(400).json({
              error: 'INSPECTION_REQUIRED',
              message: 'งวดสุดท้ายต้องตรวจรับเรียบร้อยก่อนจึงจะ release/paid ได้ (inspection_status must be "completed")'
            });
          }
        }
      }
    }

    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.paymentId);
    const { rows } = await db.query(`UPDATE phase_payments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/payment-schedule/:paymentId
router.delete('/payment-schedule/:paymentId', async (req, res) => {
  try {
    const { rows } = await db.query("DELETE FROM phase_payments WHERE id=$1 AND status IN ('pending','invoiced') RETURNING id", [req.params.paymentId]);
    if (!rows.length) return res.status(400).json({ error: 'Can only delete pending or invoiced payments (not paid)' });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/payment-schedule/generate — Auto-generate from phases
router.post('/:id/payment-schedule/generate', async (req, res) => {
  try {
    const { rows: phases } = await db.query('SELECT * FROM phases WHERE project_id=$1 ORDER BY sort_order', [req.params.id]);
    if (!phases.length) return res.status(400).json({ error: 'No phases found' });
    const { rows: [proj] } = await db.query('SELECT tor_amount, retention_rate FROM projects WHERE id=$1', [req.params.id]);
    const tor = parseFloat(proj?.tor_amount || 0);
    const retRate = parseFloat(proj?.retention_rate || 0);
    const pctEach = Math.round(10000 / phases.length) / 100; // Equal split rounded
    const created = [];
    for (let i = 0; i < phases.length; i++) {
      const pct = i === phases.length - 1 ? (100 - pctEach * (phases.length - 1)) : pctEach; // Last phase gets remainder
      const amount = tor * pct / 100;
      const retAmt = amount * retRate / 100;
      const isFinal = (i === phases.length - 1);
      const { rows: [p] } = await db.query(
        `INSERT INTO phase_payments (project_id, phase_id, payment_term, description, percentage, amount, retention_amount, net_amount, expected_date, sort_order, is_final, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [req.params.id, phases[i].id, `งวดที่ ${i+1}`, `ส่งมอบ ${phases[i].name}`, pct, amount, retAmt, amount-retAmt, phases[i].end_date, i+1, isFinal, req.user.id]);
      created.push(p);
    }
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Phase Costs (Expenses) ═══

// GET /api/projects/:id/phase-costs
router.get('/:id/phase-costs', async (req, res) => {
  try {
    const { rows: phases } = await db.query('SELECT id, name, sort_order, planned_cost, actual_cost, cost_variance FROM phases WHERE project_id=$1 ORDER BY sort_order', [req.params.id]);
    for (const ph of phases) {
      const { rows: costs } = await db.query('SELECT cost_type, SUM(planned_amount) AS planned, SUM(actual_amount) AS actual FROM phase_costs WHERE phase_id=$1 GROUP BY cost_type', [ph.id]);
      ph.costs_by_type = {};
      costs.forEach(c => { ph.costs_by_type[c.cost_type] = { planned: parseFloat(c.planned||0), actual: parseFloat(c.actual||0) }; });
    }
    res.json(phases);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/phases/:phaseId/costs
router.get('/:id/phases/:phaseId/costs', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pc.*, pr.doc_number AS pr_number, po.doc_number AS po_number
       FROM phase_costs pc
       LEFT JOIN purchase_requests pr ON pc.pr_id = pr.id
       LEFT JOIN purchase_orders po ON pc.po_id = po.id
       WHERE pc.phase_id = $1 ORDER BY pc.created_at`, [req.params.phaseId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:id/phases/:phaseId/costs
router.post('/:id/phases/:phaseId/costs', async (req, res) => {
  try {
    const { cost_type, description, planned_amount, actual_amount, pr_id, po_id, expense_id, advance_id, remarks } = req.body;
    const { rows: [c] } = await db.query(
      `INSERT INTO phase_costs (project_id, phase_id, cost_type, description, planned_amount, actual_amount, pr_id, po_id, expense_id, advance_id, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.params.id, req.params.phaseId, cost_type||'misc', description, planned_amount||0, actual_amount||0, pr_id||null, po_id||null, expense_id||null, advance_id||null, remarks, req.user.id]);
    // Update phase actual_cost
    await db.query(
      `UPDATE phases SET actual_cost = (SELECT COALESCE(SUM(actual_amount),0) FROM phase_costs WHERE phase_id=$1),
       cost_variance = planned_cost - (SELECT COALESCE(SUM(actual_amount),0) FROM phase_costs WHERE phase_id=$1)
       WHERE id = $1`, [req.params.phaseId]);
    res.status(201).json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/projects/phase-costs/:costId
router.put('/phase-costs/:costId', async (req, res) => {
  try {
    const fields = ['cost_type','description','planned_amount','actual_amount','pr_id','po_id','expense_id','advance_id','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.costId);
    const { rows } = await db.query(`UPDATE phase_costs SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    // Update phase actual_cost
    await db.query(
      `UPDATE phases SET actual_cost = (SELECT COALESCE(SUM(actual_amount),0) FROM phase_costs WHERE phase_id=$1),
       cost_variance = planned_cost - (SELECT COALESCE(SUM(actual_amount),0) FROM phase_costs WHERE phase_id=$1)
       WHERE id = $1`, [rows[0].phase_id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/phase-costs/:costId
router.delete('/phase-costs/:costId', async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM phase_costs WHERE id=$1 RETURNING phase_id', [req.params.costId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await db.query(
      `UPDATE phases SET actual_cost = (SELECT COALESCE(SUM(actual_amount),0) FROM phase_costs WHERE phase_id=$1),
       cost_variance = planned_cost - (SELECT COALESCE(SUM(actual_amount),0) FROM phase_costs WHERE phase_id=$1)
       WHERE id = $1`, [rows[0].phase_id]);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/cost-summary
router.get('/:id/cost-summary', async (req, res) => {
  try {
    const { rows: phases } = await db.query(
      `SELECT p.id, p.name, p.planned_cost, p.actual_cost, p.cost_variance,
       CASE WHEN p.planned_cost > 0 THEN ROUND(p.actual_cost / p.planned_cost * 100) ELSE 0 END AS pct_used
       FROM phases p WHERE p.project_id = $1 ORDER BY p.sort_order`, [req.params.id]);
    const totalPlanned = phases.reduce((s,p) => s + parseFloat(p.planned_cost||0), 0);
    const totalActual = phases.reduce((s,p) => s + parseFloat(p.actual_cost||0), 0);
    res.json({ phases, total_planned: totalPlanned, total_actual: totalActual, total_variance: totalPlanned - totalActual });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Finance Dashboard ═══

// GET /api/projects/:id/finance-summary
router.get('/:id/finance-summary', async (req, res) => {
  try {
    const { rows: [proj] } = await db.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (!proj) return res.status(404).json({ error: 'Not found' });
    const tor = parseFloat(proj.tor_amount || 0);

    // Revenue
    const { rows: payments } = await db.query('SELECT * FROM phase_payments WHERE project_id=$1 ORDER BY sort_order', [req.params.id]);
    const totalReceived = payments.reduce((s,p) => s + parseFloat(p.received_amount||0), 0);
    const totalRetention = payments.reduce((s,p) => s + parseFloat(p.retention_amount||0), 0);

    // Costs
    const { rows: phases } = await db.query(
      `SELECT p.id, p.name, p.status, p.planned_cost, p.actual_cost, p.cost_variance FROM phases p WHERE p.project_id=$1 ORDER BY p.sort_order`, [req.params.id]);
    const totalCost = phases.reduce((s,p) => s + parseFloat(p.actual_cost||0), 0);
    const grossProfit = totalReceived - totalCost;

    // Phase detail
    const phaseDetail = phases.map(ph => {
      const pmt = payments.find(p => p.phase_id === ph.id);
      return {
        phase_id: ph.id, phase_name: ph.name, status: ph.status,
        revenue: { amount: parseFloat(pmt?.amount||0), received: parseFloat(pmt?.received_amount||0), outstanding: parseFloat(pmt?.amount||0) - parseFloat(pmt?.received_amount||0), retention: parseFloat(pmt?.retention_amount||0) },
        cost: { planned: parseFloat(ph.planned_cost||0), actual: parseFloat(ph.actual_cost||0), variance: parseFloat(ph.cost_variance||0) },
        profit: parseFloat(pmt?.received_amount||0) - parseFloat(ph.actual_cost||0),
        margin_pct: parseFloat(pmt?.received_amount||0) > 0 ? Math.round((parseFloat(pmt?.received_amount||0) - parseFloat(ph.actual_cost||0)) / parseFloat(pmt?.received_amount||0) * 100) : 0
      };
    });

    // Cash flow (monthly)
    const { rows: cashIn } = await db.query(
      `SELECT to_char(received_date, 'YYYY-MM') AS month, SUM(received_amount) AS inflow
       FROM phase_payments WHERE project_id=$1 AND received_date IS NOT NULL GROUP BY 1 ORDER BY 1`, [req.params.id]);
    const { rows: cashOut } = await db.query(
      `SELECT to_char(pc.created_at, 'YYYY-MM') AS month, SUM(pc.actual_amount) AS outflow
       FROM phase_costs pc WHERE pc.project_id=$1 GROUP BY 1 ORDER BY 1`, [req.params.id]);
    const months = [...new Set([...cashIn.map(r=>r.month), ...cashOut.map(r=>r.month)])].sort();
    let cumulative = 0;
    const cashFlow = months.map(m => {
      const inf = parseFloat(cashIn.find(r=>r.month===m)?.inflow || 0);
      const outf = parseFloat(cashOut.find(r=>r.month===m)?.outflow || 0);
      cumulative += inf - outf;
      return { month: m, inflow: inf, outflow: outf, net: inf - outf, cumulative };
    });

    res.json({
      contract_value: tor,
      total_received: totalReceived,
      total_outstanding: tor - totalReceived,
      total_retention: totalRetention,
      total_cost: totalCost,
      gross_profit: grossProfit,
      gross_margin_pct: tor > 0 ? Math.round(grossProfit / tor * 100) : 0,
      phases: phaseDetail,
      cash_flow: cashFlow
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
