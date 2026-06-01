const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');

router.use(authenticate);

// GET /api/budget?project_id=
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    const projectIds = await getUserProjectIds(req.user);
    let q = 'SELECT * FROM budgets WHERE company_id = $1';
    const params = [req.user.company_id];
    if (project_id) { q += ` AND project_id = $${params.length + 1}`; params.push(project_id); }
    if (projectIds !== null) { params.push(projectIds); params.push(req.user.id); q += ` AND (project_id = ANY($${params.length - 1}) OR created_by = $${params.length})`; }
    q += ' ORDER BY created_at DESC';
    const { rows } = await db.query(q, params);
    // Enrich with total_committed from budget_lines
    for (const b of rows) {
      try {
        const { rows: [agg] } = await db.query(
          'SELECT COALESCE(SUM(committed_amount), 0) AS total_committed FROM budget_lines WHERE budget_id = $1', [b.id]);
        b.total_committed = agg.total_committed;
      } catch(_) { b.total_committed = 0; }
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/budget/:id (with lines)
router.get('/:id', async (req, res) => {
  try {
    const { rows: [budget] } = await db.query('SELECT * FROM budgets WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    const { rows: lines } = await db.query('SELECT * FROM budget_lines WHERE budget_id = $1 ORDER BY sort_order', [req.params.id]);
    res.json({ ...budget, lines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/budget
router.post('/', async (req, res) => {
  try {
    const { project_id, code, name, fiscal_year, lines } = req.body;
    const totalTor = (lines || []).reduce((s, l) => s + (l.tor_amount || 0), 0);
    const totalBudget = (lines || []).reduce((s, l) => s + (l.budget_amount || 0), 0);

    const { rows: [budget] } = await db.query(
      `INSERT INTO budgets (company_id, project_id, code, name, fiscal_year, total_tor, total_budget, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.company_id, project_id, code, name, fiscal_year || 2026, totalTor, totalBudget, req.user.id]
    );

    if (lines && lines.length) {
      for (const line of lines) {
        await db.query(
          `INSERT INTO budget_lines (budget_id, name, category, tor_amount, budget_amount, sap_account, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [budget.id, line.name, line.category, line.tor_amount || 0, line.budget_amount || 0, line.sap_account, line.sort_order || 0]
        );
      }
    }
    res.status(201).json(budget);
    req.broadcast('budget_created', { code: budget.code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/budget/:id/submit
router.post('/:id/submit', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE budgets SET status = 'pending_manager' WHERE id = $1 AND status = 'draft' RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Cannot submit — not in draft status' });
    res.json(rows[0]);
    req.broadcast('budget_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/budget/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const { rows: [budget] } = await db.query('SELECT * FROM budgets WHERE id = $1', [req.params.id]);
    if (!budget) return res.status(404).json({ error: 'Not found' });

    let nextStatus;
    if (budget.status === 'pending_manager' && ['pm', 'executive'].includes(req.user.role)) {
      nextStatus = 'pending_executive';
    } else if (budget.status === 'pending_executive' && req.user.role === 'executive') {
      nextStatus = 'approved';
    } else {
      return res.status(403).json({ error: 'Not authorized to approve at this step' });
    }

    const { rows } = await db.query(
      `UPDATE budgets SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3 RETURNING *`,
      [nextStatus, req.user.id, req.params.id]
    );
    res.json(rows[0]);
    req.broadcast('budget_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/budget/:id/reject — Reject with reason
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows: [budget] } = await db.query('SELECT * FROM budgets WHERE id = $1', [req.params.id]);
    if (!budget) return res.status(404).json({ error: 'Not found' });
    if (!budget.status.includes('pending')) return res.status(400).json({ error: 'Can only reject pending budgets' });

    const { rows } = await db.query(
      `UPDATE budgets SET status = 'draft', rejected_by = $1, rejected_at = NOW(), reject_reason = $2 WHERE id = $3 RETURNING *`,
      [req.user.id, reason || 'No reason provided', req.params.id]
    );
    res.json(rows[0]);
    req.broadcast('budget_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/budget/:id/revise — Create revision of approved budget
router.post('/:id/revise', async (req, res) => {
  try {
    const { lines, reason } = req.body;
    const { rows: [budget] } = await db.query('SELECT * FROM budgets WHERE id = $1', [req.params.id]);
    if (!budget) return res.status(404).json({ error: 'Not found' });

    // Save revision history
    const { rows: oldLines } = await db.query('SELECT * FROM budget_lines WHERE budget_id = $1 ORDER BY sort_order', [req.params.id]);
    const newVersion = (budget.revision || 0) + 1;
    const newTotalBudget = (lines || []).reduce((s, l) => s + (parseFloat(l.budget_amount) || 0), 0);

    await db.query(
      `INSERT INTO budget_revisions (budget_id, version, reason, old_total_budget, new_total_budget, changes, revised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.params.id, newVersion, reason || '', parseFloat(budget.total_budget), newTotalBudget,
       JSON.stringify(oldLines.map(l => ({ name: l.name, old_budget: l.budget_amount, old_tor: l.tor_amount }))),
       req.user.id]
    );

    // Update lines
    if (lines && lines.length) {
      for (const l of lines) {
        if (l.id) {
          await db.query('UPDATE budget_lines SET budget_amount=$1, tor_amount=$2 WHERE id=$3', [l.budget_amount, l.tor_amount, l.id]);
        }
      }
    }

    // Update budget totals
    const { rows: updatedLines } = await db.query('SELECT * FROM budget_lines WHERE budget_id = $1', [req.params.id]);
    const totTor = updatedLines.reduce((s, l) => s + parseFloat(l.tor_amount || 0), 0);
    const totBud = updatedLines.reduce((s, l) => s + parseFloat(l.budget_amount || 0), 0);

    const { rows } = await db.query(
      'UPDATE budgets SET total_tor=$1, total_budget=$2, revision=$3 WHERE id=$4 RETURNING *',
      [totTor, totBud, newVersion, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/budget/:id/revisions — Get revision history
router.get('/:id/revisions', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.first_name || ' ' || u.last_name AS revised_by_name
       FROM budget_revisions r LEFT JOIN users u ON r.revised_by = u.id
       WHERE r.budget_id = $1 ORDER BY r.version DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/budget/:id/transfer — Transfer budget between lines
router.post('/:id/transfer', async (req, res) => {
  try {
    const { from_line_id, to_line_id, amount, reason } = req.body;
    if (!from_line_id || !to_line_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid transfer: need from_line_id, to_line_id, amount > 0' });
    }

    // Validate lines belong to this budget
    const { rows: fromLine } = await db.query('SELECT * FROM budget_lines WHERE id=$1 AND budget_id=$2', [from_line_id, req.params.id]);
    const { rows: toLine } = await db.query('SELECT * FROM budget_lines WHERE id=$1 AND budget_id=$2', [to_line_id, req.params.id]);
    if (!fromLine[0] || !toLine[0]) return res.status(404).json({ error: 'Line not found in this budget' });

    const available = parseFloat(fromLine[0].budget_amount) - parseFloat(fromLine[0].actual_amount) - parseFloat(fromLine[0].committed_amount || 0);
    if (amount > available) return res.status(400).json({ error: `Insufficient budget. Available: ${available}` });

    // Execute transfer
    await db.query('UPDATE budget_lines SET budget_amount = budget_amount - $1 WHERE id = $2', [amount, from_line_id]);
    await db.query('UPDATE budget_lines SET budget_amount = budget_amount + $1 WHERE id = $2', [amount, to_line_id]);

    // Log transfer
    await db.query(
      'INSERT INTO budget_transfers (budget_id, from_line_id, to_line_id, amount, reason, transferred_by) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.id, from_line_id, to_line_id, amount, reason || '', req.user.id]
    );

    res.json({ success: true, from: from_line_id, to: to_line_id, amount });
    req.broadcast('budget_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/budget/:id/transfers — Get transfer history
router.get('/:id/transfers', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.first_name || ' ' || u.last_name AS transferred_by_name,
              fl.name AS from_line_name, tl.name AS to_line_name
       FROM budget_transfers t
       LEFT JOIN users u ON t.transferred_by = u.id
       LEFT JOIN budget_lines fl ON t.from_line_id = fl.id
       LEFT JOIN budget_lines tl ON t.to_line_id = tl.id
       WHERE t.budget_id = $1 ORDER BY t.created_at DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/budget/check — Budget control check (called when creating PR/Expense)
router.get('/check/:projectId', async (req, res) => {
  try {
    const { rows: budgets } = await db.query(
      "SELECT * FROM budgets WHERE project_id = $1 AND status = 'approved'", [req.params.projectId]);
    if (!budgets.length) return res.json({ allowed: true, message: 'No approved budget found' });

    const budget = budgets[0];
    const { rows: lines } = await db.query('SELECT * FROM budget_lines WHERE budget_id = $1', [budget.id]);

    const totalBudget = lines.reduce((s, l) => s + parseFloat(l.budget_amount || 0), 0);
    const totalUsed = lines.reduce((s, l) => s + parseFloat(l.actual_amount || 0) + parseFloat(l.committed_amount || 0), 0);
    const pctUsed = totalBudget > 0 ? (totalUsed / totalBudget * 100) : 0;
    const remaining = totalBudget - totalUsed;

    const warn = budget.warn_threshold || 80;
    const block = budget.block_threshold || 100;
    const mode = budget.control_mode || 'warn';

    let status = 'ok';
    let message = `Budget remaining: ฿${remaining.toLocaleString()}`;
    if (pctUsed >= block && mode === 'block') {
      status = 'blocked';
      message = `Budget exceeded! ${pctUsed.toFixed(0)}% used. Cannot proceed.`;
    } else if (pctUsed >= warn) {
      status = 'warning';
      message = `Budget warning: ${pctUsed.toFixed(0)}% used (฿${remaining.toLocaleString()} remaining)`;
    }

    res.json({
      allowed: status !== 'blocked',
      status,
      message,
      pct_used: Math.round(pctUsed),
      remaining,
      total_budget: totalBudget,
      total_used: totalUsed,
      warn_threshold: warn,
      block_threshold: block,
      control_mode: mode
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ CRUD: Edit + Delete ═══

// PUT /api/budget/:id — Edit budget (draft only)
router.put('/:id', async (req, res) => {
  try {
    const { rows: [b] } = await db.query('SELECT * FROM budgets WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    if (b.status !== 'draft' && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'แก้ไขได้เฉพาะสถานะ draft' });
    }
    const fields = ['name','fiscal_year','notes','warn_threshold','block_threshold','control_mode'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE budgets SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/budget/:id — Cancel budget (draft only, soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [b] } = await db.query('SELECT * FROM budgets WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    if (b.status !== 'draft' && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'ลบได้เฉพาะสถานะ draft' });
    }
    const { rows } = await db.query(
      "UPDATE budgets SET status='rejected', reject_reason='Cancelled', updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/budget/lines/:lineId — Edit budget line
router.put('/lines/:lineId', async (req, res) => {
  try {
    const fields = ['name','category','tor_amount','budget_amount','sap_account'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    params.push(req.params.lineId);
    const { rows } = await db.query(`UPDATE budget_lines SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/budget/lines/:lineId — Delete budget line
router.delete('/lines/:lineId', async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM budget_lines WHERE id=$1 RETURNING id', [req.params.lineId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
