const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { project_id, status } = req.query;
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT pr.*, u.first_name || ' ' || u.last_name AS requester_name
             FROM purchase_requests pr LEFT JOIN users u ON pr.created_by = u.id
             WHERE pr.company_id = $1`;
    const params = [req.user.company_id];
    if (projectIds !== null) { params.push(projectIds); params.push(req.user.id); q += ` AND (pr.project_id = ANY($${params.length - 1}) OR pr.created_by = $${params.length})`; }
    if (project_id) { params.push(project_id); q += ` AND pr.project_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND pr.status = $${params.length}`; }
    q += ' ORDER BY pr.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pr/wht/:code — Get WHT rate
router.get('/wht/:code', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM wht_codes WHERE code = $1 AND company_id = $2',
      [req.params.code, req.user.company_id]);
    if (!rows[0]) return res.json({ rate: 0 });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pr/wht — List all WHT codes
router.get('/wht', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM wht_codes WHERE company_id = $1 AND is_active = true ORDER BY code',
      [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const projectIds = await getUserProjectIds(req.user);
    let q = 'SELECT * FROM purchase_requests WHERE id = $1';
    const params = [req.params.id];
    if (projectIds !== null) { params.push(projectIds); q += ` AND project_id = ANY($${params.length})`; }
    const { rows: [pr] } = await db.query(q, params);
    if (!pr) return res.status(404).json({ error: 'PR not found' });
    const { rows: lines } = await db.query('SELECT * FROM pr_lines WHERE pr_id = $1 ORDER BY line_num', [req.params.id]);

    // Document chain: find related PO, GRPO, AP Invoice
    const chain = {};
    const { rows: pos } = await db.query('SELECT id, doc_number, status, total_amount FROM purchase_orders WHERE pr_id = $1', [pr.id]);
    if (pos.length) {
      chain.po = pos[0];
      const { rows: grpos } = await db.query('SELECT id, doc_number, status FROM goods_receipts WHERE po_id = $1', [pos[0].id]);
      if (grpos.length) {
        chain.grpo = grpos[0];
        const { rows: invs } = await db.query('SELECT id, doc_number, status, total_amount FROM ap_invoices WHERE grpo_id = $1 OR po_id = $1', [grpos[0].id, pos[0].id]);
        if (invs.length) chain.invoice = invs[0];
      }
    }

    res.json({ ...pr, lines, chain });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/pr/:id — Update PR status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      'UPDATE purchase_requests SET status=COALESCE($1,status), updated_at=NOW() WHERE id=$2 AND company_id=$3 RETURNING *',
      [status, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
    req.broadcast('pr_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, vendor_code, vendor_name, remarks, lines } = req.body;
    // Generate doc number
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'PR', 'PR', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `PR${series.year_month}${String(series.current_number).padStart(4, '0')}`;
    const totalAmount = (lines || []).reduce((s, l) => s + (l.total_price || 0), 0);

    const { rows: [pr] } = await db.query(
      `INSERT INTO purchase_requests (company_id, project_id, doc_number, vendor_code, vendor_name, total_amount, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.company_id, project_id, docNumber, vendor_code, vendor_name, totalAmount, remarks, req.user.id]
    );
    if (lines) {
      for (const [i, line] of lines.entries()) {
        await db.query(
          `INSERT INTO pr_lines (pr_id, line_num, item_code, item_name, quantity, uom, unit_price, total_price, sap_account, tax_code)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [pr.id, i + 1, line.item_code, line.item_name, line.quantity, line.uom || 'EA', line.unit_price, line.total_price, line.sap_account, line.tax_code]
        );
      }
    }
    res.status(201).json(pr);
    req.broadcast('pr_created', { doc_number: pr.doc_number });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/submit', async (req, res) => {
  try {
    // Fetch the PR to get project_id and total_amount
    const { rows: [pr] } = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND status = $2', [req.params.id, 'draft']);
    if (!pr) return res.status(400).json({ error: 'Cannot submit' });

    // Budget validation
    let budgetWarning = null;
    const { rows: budgets } = await db.query(
      'SELECT * FROM budgets WHERE project_id = $1 AND status = $2', [pr.project_id, 'approved']);
    if (budgets.length) {
      const budget = budgets[0];
      const approvedBudget = parseFloat(budget.total_amount);
      // Calculate total used: actual + committed from budget_lines
      const { rows: [usage] } = await db.query(
        `SELECT COALESCE(SUM(actual_amount), 0) AS total_actual,
                COALESCE(SUM(committed_amount), 0) AS total_committed
         FROM budget_lines WHERE budget_id = $1`, [budget.id]);
      const totalUsed = parseFloat(usage.total_actual) + parseFloat(usage.total_committed) + parseFloat(pr.total_amount);
      const usagePercent = approvedBudget > 0 ? (totalUsed / approvedBudget) * 100 : 0;

      const blockThreshold = parseFloat(budget.block_threshold || 100);
      const warnThreshold = parseFloat(budget.warn_threshold || 80);
      const controlMode = budget.control_mode || 'warn';

      if (controlMode === 'block' && usagePercent >= blockThreshold) {
        return res.status(400).json({
          error: 'Budget exceeded',
          detail: `This PR would bring usage to ${usagePercent.toFixed(1)}% of the approved budget (block threshold: ${blockThreshold}%). Submission blocked.`
        });
      }
      if (usagePercent >= warnThreshold) {
        budgetWarning = `Budget warning: this PR would bring usage to ${usagePercent.toFixed(1)}% of the approved budget (warn threshold: ${warnThreshold}%).`;
      }
    }

    const { rows } = await db.query(
      `UPDATE purchase_requests SET status = 'pending_manager' WHERE id = $1 RETURNING *`, [req.params.id]);
    const result = rows[0];
    if (budgetWarning) result.budget_warning = budgetWarning;
    res.json(result);
    req.broadcast('pr_updated', { id: req.params.id, status: 'pending_manager' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
  try {
    if (!['pm','finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to approve' });
    }
    const { rows: [pr] } = await db.query('SELECT * FROM purchase_requests WHERE id = $1', [req.params.id]);
    if (!pr) return res.status(404).json({ error: 'Not found' });
    // Determine next status based on amount tiers
    const amount = parseFloat(pr.total_amount);
    let nextStatus;
    if (pr.status === 'pending_manager') {
      nextStatus = amount > 10000 ? 'pending_finance' : 'approved';
    } else if (pr.status === 'pending_finance') {
      nextStatus = amount > 100000 ? 'pending_executive' : 'approved';
    } else if (pr.status === 'pending_executive') {
      nextStatus = 'approved';
    } else {
      return res.status(400).json({ error: 'Cannot approve at this step' });
    }
    const { rows } = await db.query(
      `UPDATE purchase_requests SET status = $1 WHERE id = $2 RETURNING *`, [nextStatus, req.params.id]);

    // When PR is approved, update budget_lines.committed_amount
    if (nextStatus === 'approved' && pr.project_id) {
      const { rows: budgets } = await db.query(
        'SELECT id FROM budgets WHERE project_id = $1 AND status = $2', [pr.project_id, 'approved']);
      if (budgets.length) {
        // Add PR total to committed_amount on the first budget line (general)
        await db.query(
          `UPDATE budget_lines SET committed_amount = COALESCE(committed_amount, 0) + $1
           WHERE budget_id = $2 AND id = (SELECT id FROM budget_lines WHERE budget_id = $2 ORDER BY line_num LIMIT 1)`,
          [pr.total_amount, budgets[0].id]);
      }
    }

    res.json(rows[0]);
    req.broadcast('pr_updated', { id: req.params.id, status: nextStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
