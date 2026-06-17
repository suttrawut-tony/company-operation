const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/guarantees
router.get('/', async (req, res) => {
  try {
    const { status, project_id, guarantee_type } = req.query;
    let q = `SELECT g.*, p.code AS project_code, p.name AS project_name,
      ct.contract_number,
      EXTRACT(DAY FROM g.expiry_date - NOW())::int AS days_until_expiry,
      CASE WHEN g.expiry_date IS NOT NULL AND g.expiry_date - NOW() < INTERVAL '30 days' THEN true ELSE false END AS is_expiring
      FROM guarantees g
      LEFT JOIN projects p ON g.project_id = p.id
      LEFT JOIN contracts ct ON g.contract_id = ct.id
      WHERE g.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND g.status = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND g.project_id = $${params.length}`; }
    if (guarantee_type) { params.push(guarantee_type); q += ` AND g.guarantee_type = $${params.length}`; }
    q += ' ORDER BY g.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/guarantees/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [guarantee] } = await db.query(
      `SELECT g.*, p.code AS project_code, p.name AS project_name, ct.contract_number,
        EXTRACT(DAY FROM g.expiry_date - NOW())::int AS days_until_expiry,
        CASE WHEN g.expiry_date IS NOT NULL AND g.expiry_date - NOW() < INTERVAL '30 days' THEN true ELSE false END AS is_expiring
       FROM guarantees g
       LEFT JOIN projects p ON g.project_id = p.id
       LEFT JOIN contracts ct ON g.contract_id = ct.id
       WHERE g.id = $1 AND g.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!guarantee) return res.status(404).json({ error: 'Not found' });
    res.json(guarantee);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/guarantees
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate GR number
    const now = new Date();
    const prefix = `GR${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows: [last] } = await db.query(
      `SELECT guarantee_number FROM guarantees WHERE guarantee_number LIKE $1 || '%' ORDER BY guarantee_number DESC LIMIT 1`, [prefix]);
    let seq = 1;
    if (last) { seq = parseInt(last.guarantee_number.slice(prefix.length)) + 1; }
    const guaranteeNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    const { rows: [guarantee] } = await db.query(
      `INSERT INTO guarantees (company_id, guarantee_number, project_id, contract_id,
        guarantee_type, bank_name, bank_branch, amount, issue_date, expiry_date,
        premium_amount, premium_rate, remarks, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [req.user.company_id, guaranteeNumber, b.project_id || null, b.contract_id || null,
       b.guarantee_type || null, b.bank_name || null, b.bank_branch || null,
       b.guarantee_amount || b.amount || 0, b.issue_date || null, b.expiry_date || null,
       b.premium_amount || 0, b.premium_rate || 0,
       b.remarks || null, b.status || 'pending', req.user.id]);
    res.status(201).json(guarantee);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/guarantees/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM guarantees WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    // Accept guarantee_amount as alias for amount (frontend sends guarantee_amount)
    if (req.body.guarantee_amount !== undefined && req.body.amount === undefined) {
      req.body.amount = req.body.guarantee_amount;
    }
    const allowed = ['project_id','contract_id','guarantee_type','bank_name','bank_branch',
      'amount','issue_date','expiry_date','premium_amount','premium_rate','remarks','status'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE guarantees SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/guarantees/:id (soft delete — pending only)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM guarantees WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'pending')
      return res.status(400).json({ error: 'Can only cancel pending guarantees' });
    const { rows } = await db.query(
      "UPDATE guarantees SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/guarantees/:id/release
router.post('/:id/release', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM guarantees WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { rows } = await db.query(
      "UPDATE guarantees SET status='released', release_date=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
