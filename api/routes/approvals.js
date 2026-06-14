const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
router.use(authenticate);

// GET /api/approvals/pending — docs pending my approval
router.get('/pending', async (req, res) => {
  try {
    const role = req.user.role;
    const results = [];

    // Budgets
    const budgetStatus = role === 'executive' ? 'pending_executive' : role === 'pm' ? 'pending_manager' : null;
    if (budgetStatus) {
      const { rows } = await db.query(
        `SELECT id, code AS doc_number, 'budget' AS doc_type, total_budget AS amount, status, created_at
         FROM budgets WHERE company_id = $1 AND status = $2`, [req.user.company_id, budgetStatus]);
      results.push(...rows);
    }

    // PRs
    const prStatuses = [];
    if (role === 'pm') prStatuses.push('pending_manager');
    if (role === 'finance') prStatuses.push('pending_finance');
    if (role === 'executive') prStatuses.push('pending_executive');
    if (prStatuses.length) {
      const { rows } = await db.query(
        `SELECT id, doc_number, 'pr' AS doc_type, total_amount AS amount, status, created_at
         FROM purchase_requests WHERE company_id = $1 AND status = ANY($2)`,
        [req.user.company_id, prStatuses]);
      results.push(...rows);
    }

    // Expenses
    const expStatuses = [];
    if (role === 'pm') expStatuses.push('pending_manager');
    if (role === 'finance') expStatuses.push('pending_finance');
    if (role === 'executive') expStatuses.push('pending_executive');
    if (expStatuses.length) {
      const { rows } = await db.query(
        `SELECT id, doc_number, 'expense' AS doc_type, amount, status, created_at
         FROM expenses WHERE company_id = $1 AND status = ANY($2)`,
        [req.user.company_id, expStatuses]);
      results.push(...rows);
    }

    // OT
    const otStatus = role === 'executive' ? 'pending_executive' : role === 'pm' ? 'pending_manager' : null;
    if (otStatus) {
      const { rows } = await db.query(
        `SELECT id, doc_number, 'ot' AS doc_type, compensation AS amount, status, created_at
         FROM ot_requests WHERE company_id = $1 AND status = $2`, [req.user.company_id, otStatus]);
      results.push(...rows);
    }

    results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json({ total: results.length, items: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// Approval Templates CRUD
// ═══════════════════════════════════════

const VALID_DOC_TYPES = ['pr', 'po', 'expense', 'budget', 'travel', 'ot', 'vehicle', 'advance', 'petty_cash'];
const VALID_ROLES = ['pm', 'finance', 'executive', 'accounting', 'procurement', 'admin'];

// GET /api/approvals/templates — list all templates for company
router.get('/templates', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, doc_type, min_amount, max_amount, steps, is_active, created_at
       FROM approval_templates
       WHERE company_id = $1
       ORDER BY doc_type, min_amount`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/approvals/templates — create new template
router.post('/templates', requireRole('executive', 'admin', 'finance'), async (req, res) => {
  try {
    const { doc_type, min_amount, max_amount, steps } = req.body;
    if (!doc_type || !VALID_DOC_TYPES.includes(doc_type)) {
      return res.status(400).json({ error: `Invalid doc_type. Must be one of: ${VALID_DOC_TYPES.join(', ')}` });
    }
    if (min_amount == null || max_amount == null || Number(min_amount) > Number(max_amount)) {
      return res.status(400).json({ error: 'Invalid amount range' });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'steps must be a non-empty array' });
    }
    for (const s of steps) {
      if (!s.role || !VALID_ROLES.includes(s.role)) {
        return res.status(400).json({ error: `Invalid role "${s.role}" in steps` });
      }
    }

    // Check overlap
    const { rows: overlap } = await db.query(
      `SELECT id FROM approval_templates
       WHERE company_id = $1 AND doc_type = $2 AND is_active = true
         AND min_amount < $4 AND max_amount > $3`,
      [req.user.company_id, doc_type, min_amount, max_amount]
    );
    if (overlap.length > 0) {
      return res.status(409).json({ error: 'Amount range overlaps with existing template' });
    }

    const { rows } = await db.query(
      `INSERT INTO approval_templates (company_id, doc_type, min_amount, max_amount, steps)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.company_id, doc_type, min_amount, max_amount, JSON.stringify(steps)]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/approvals/templates/:id — update template
router.put('/templates/:id', requireRole('executive', 'admin', 'finance'), async (req, res) => {
  try {
    const { min_amount, max_amount, steps, is_active } = req.body;

    const { rows: [existing] } = await db.query(
      `SELECT * FROM approval_templates WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const newMin = min_amount != null ? min_amount : existing.min_amount;
    const newMax = max_amount != null ? max_amount : existing.max_amount;
    const newSteps = steps || existing.steps;
    const newActive = is_active != null ? is_active : existing.is_active;

    if (Number(newMin) > Number(newMax)) {
      return res.status(400).json({ error: 'Invalid amount range' });
    }
    if (Array.isArray(steps)) {
      if (steps.length === 0) return res.status(400).json({ error: 'steps must be non-empty' });
      for (const s of steps) {
        if (!s.role || !VALID_ROLES.includes(s.role)) {
          return res.status(400).json({ error: `Invalid role "${s.role}" in steps` });
        }
      }
    }

    // Check overlap (exclude self)
    const { rows: overlap } = await db.query(
      `SELECT id FROM approval_templates
       WHERE company_id = $1 AND doc_type = $2 AND is_active = true AND id != $5
         AND min_amount < $4 AND max_amount > $3`,
      [req.user.company_id, existing.doc_type, newMin, newMax, req.params.id]
    );
    if (overlap.length > 0) {
      return res.status(409).json({ error: 'Amount range overlaps with existing template' });
    }

    const { rows } = await db.query(
      `UPDATE approval_templates
       SET min_amount = $1, max_amount = $2, steps = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [newMin, newMax, JSON.stringify(newSteps), newActive, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/approvals/templates/:id
router.delete('/templates/:id', requireRole('executive', 'admin', 'finance'), async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM approval_templates WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
