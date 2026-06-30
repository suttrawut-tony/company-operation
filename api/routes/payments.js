const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { project_id, status, payment_type, date_from, date_to } = req.query;
    let q = `SELECT py.*, p.code AS project_code, p.name AS project_name,
      u.first_name || ' ' || u.last_name AS created_by_name
      FROM payments py
      LEFT JOIN projects p ON py.project_id = p.id
      LEFT JOIN users u ON py.created_by = u.id
      WHERE py.company_id = $1`;
    const params = [req.user.company_id];
    if (project_id) { params.push(project_id); q += ` AND py.project_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND py.status = $${params.length}`; }
    if (payment_type) { params.push(payment_type); q += ` AND py.payment_type = $${params.length}`; }
    if (date_from) { params.push(date_from); q += ` AND py.payment_date >= $${params.length}`; }
    if (date_to) { params.push(date_to); q += ` AND py.payment_date <= $${params.length}`; }
    q += ' ORDER BY py.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [payment] } = await db.query(
      `SELECT py.*, p.code AS project_code, p.name AS project_name
       FROM payments py LEFT JOIN projects p ON py.project_id = p.id
       WHERE py.id = $1 AND py.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!payment) return res.status(404).json({ error: 'Not found' });
    res.json(payment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate RV number
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'RV', 'RV', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const paymentNumber = `RV${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [payment] } = await db.query(
      `INSERT INTO payments (company_id, payment_number, project_id, quotation_id, customer_name,
        payment_type, status, amount, vat_amount, total_amount, payment_method,
        payment_date, reference_no, receipt_number, bank_account, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [req.user.company_id, paymentNumber, b.project_id || null, b.quotation_id || null,
       b.customer_name || null, b.payment_type || 'deposit', b.status || 'pending',
       b.amount || 0, b.vat_amount || 0, b.total_amount || 0,
       b.payment_method || null, b.payment_date || null, b.reference_no || null,
       b.receipt_number || null, b.bank_account || null, b.remarks || null, req.user.id]);
    res.status(201).json(payment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/payments/:id — update (pending only)
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM payments WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'pending') return res.status(400).json({ error: 'Only pending payments can be edited' });

    const allowed = ['project_id','quotation_id','customer_name','payment_type','amount',
      'vat_amount','total_amount','payment_method','payment_date','reference_no',
      'receipt_number','bank_account','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE payments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/payments/:id — soft delete (status='cancelled')
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM payments WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'pending') return res.status(400).json({ error: 'Only pending payments can be cancelled' });
    const { rows } = await db.query(
      "UPDATE payments SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payments/:id/receive — mark as received
router.post('/:id/receive', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM payments WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'pending') return res.status(400).json({ error: 'Only pending payments can be received' });
    const { rows } = await db.query(
      "UPDATE payments SET status='received', payment_date=NOW(), updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
