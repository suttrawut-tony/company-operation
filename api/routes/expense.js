const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { project_id, status, expense_type } = req.query;
    let q = `SELECT e.*, u.first_name || ' ' || u.last_name AS requester_name
             FROM expenses e LEFT JOIN users u ON e.created_by = u.id WHERE e.company_id = $1`;
    const params = [req.user.company_id];
    const allowedProjects = await getUserProjectIds(req.user);
    if (allowedProjects !== null) { params.push(allowedProjects); q += ` AND (e.project_id = ANY($${params.length}) OR e.created_by = $${params.length + 1})`; params.push(req.user.id); }
    if (project_id) { params.push(project_id); q += ` AND e.project_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND e.status = $${params.length}`; }
    if (expense_type) { params.push(expense_type); q += ` AND e.expense_type = $${params.length}`; }
    q += ' ORDER BY e.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, expense_type, description, amount, sap_account, tax_code } = req.body;
    const prefix = expense_type === 'advance' ? 'ADV' : 'EXP';
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, $2, $2, to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id, prefix]);
    const docNumber = `${prefix}${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [exp] } = await db.query(
      `INSERT INTO expenses (company_id, project_id, doc_number, expense_type, description, amount, sap_account, tax_code, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, project_id, docNumber, expense_type || 'reimbursement', description, amount, sap_account, tax_code, req.user.id]);
    res.status(201).json(exp);
    req.broadcast('expense_created', { doc_number: exp.doc_number });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/expense/:id — Update expense
router.put('/:id', async (req, res) => {
  try {
    const { status, description, amount } = req.body;
    const { rows } = await db.query(
      'UPDATE expenses SET status=COALESCE($1,status), description=COALESCE($2,description), amount=COALESCE($3,amount), updated_at=NOW() WHERE id=$4 AND company_id=$5 RETURNING *',
      [status, description, amount, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE expenses SET status = 'pending_manager' WHERE id = $1 AND status = 'draft' AND company_id = $2 RETURNING *`, [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot submit' });
    res.json(rows[0]);
    req.broadcast('expense_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
  try {
    if (!['pm','finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to approve' });
    }
    const { rows: [exp] } = await db.query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    if (!exp) return res.status(404).json({ error: 'Not found' });
    const amount = parseFloat(exp.amount);
    let nextStatus;
    if (exp.status === 'pending_manager') nextStatus = amount > 10000 ? 'pending_finance' : 'approved';
    else if (exp.status === 'pending_finance') nextStatus = amount > 100000 ? 'pending_executive' : 'approved';
    else if (exp.status === 'pending_executive') nextStatus = 'approved';
    else return res.status(400).json({ error: 'Cannot approve' });
    const { rows } = await db.query('UPDATE expenses SET status = $1 WHERE id = $2 RETURNING *', [nextStatus, req.params.id]);
    res.json(rows[0]);
    req.broadcast('expense_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added GET /:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [exp] } = await db.query('SELECT * FROM expenses WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!exp) return res.status(404).json({ error: 'Not found' });
    res.json(exp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added DELETE /:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE expenses SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
