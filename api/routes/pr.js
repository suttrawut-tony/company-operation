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

// PUT /api/pr/:id — Update PR (draft: full edit, other: status/remarks only)
router.put('/:id', async (req, res) => {
  try {
    const { rows: [pr] } = await db.query('SELECT * FROM purchase_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!pr) return res.status(404).json({ error: 'Not found' });
    const isDraft = pr.status === 'draft';
    const fields = isDraft
      ? ['vendor_code','vendor_name','remarks','project_id','total_amount','tax_code','tax_amount']
      : ['remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE purchase_requests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
    req.broadcast('pr_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/pr/:id — Cancel PR (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [pr] } = await db.query('SELECT * FROM purchase_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!pr) return res.status(404).json({ error: 'Not found' });
    if (!['draft','pending_manager'].includes(pr.status) && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'ยกเลิกได้เฉพาะสถานะ draft/pending' });
    }
    const { rows } = await db.query(
      "UPDATE purchase_requests SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json({ cancelled: true, ...rows[0] });
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
          `INSERT INTO pr_lines (pr_id, line_num, item_code, item_name, quantity, uom, unit_price, total_price, sap_account, tax_code, vendor_quotes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [pr.id, i + 1, line.item_code, line.item_name || line.description, line.quantity, line.uom || 'EA', line.unit_price, line.total_price, line.sap_account, line.tax_code, JSON.stringify(line.vendor_quotes || [])]
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
    const { rows: [pr] } = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND status = $2 AND company_id = $3', [req.params.id, 'draft', req.user.company_id]);
    if (!pr) return res.status(400).json({ error: 'Cannot submit' });

    // PR ไม่เช็คงบ — เช็คเฉพาะตอน PO submit
    const { rows } = await db.query(
      `UPDATE purchase_requests SET status = 'pending_manager' WHERE id = $1 RETURNING *`, [req.params.id]);
    res.json(rows[0]);
    req.broadcast('pr_updated', { id: req.params.id, status: 'pending_manager' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
  try {
    if (!['pm','finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to approve' });
    }
    const { rows: [pr] } = await db.query('SELECT * FROM purchase_requests WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
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

// GET /api/pr/open — list approved PRs with open (un-copied) lines
router.get('/open', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.first_name || ' ' || u.last_name AS requester_name,
              p.code AS project_code, p.name AS project_name,
              (SELECT COUNT(*) FROM pr_lines pl WHERE pl.pr_id = pr.id AND pl.quantity - COALESCE(pl.copied_qty,0) > 0) AS open_line_count
       FROM purchase_requests pr
       LEFT JOIN users u ON pr.created_by = u.id
       LEFT JOIN projects p ON pr.project_id = p.id
       WHERE pr.company_id = $1 AND pr.status = 'approved'
       HAVING (SELECT COUNT(*) FROM pr_lines pl WHERE pl.pr_id = pr.id AND pl.quantity - COALESCE(pl.copied_qty,0) > 0) > 0
       ORDER BY pr.doc_date DESC`,
      [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/pr/:id/open-lines — lines with open qty > 0 including vendor_quotes
router.get('/:id/open-lines', async (req, res) => {
  try {
    const { rows: [pr] } = await db.query(
      'SELECT * FROM purchase_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!pr) return res.status(404).json({ error: 'Not found' });
    const { rows: lines } = await db.query(
      `SELECT *, quantity - COALESCE(copied_qty, 0) AS open_qty
       FROM pr_lines WHERE pr_id = $1 AND quantity - COALESCE(copied_qty, 0) > 0
       ORDER BY line_num`, [req.params.id]);
    res.json({ pr, lines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
