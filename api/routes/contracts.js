const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/contracts
router.get('/', async (req, res) => {
  try {
    const { status, project_id, contract_type } = req.query;
    let q = `SELECT c.*, p.code AS project_code, p.name AS project_name
      FROM contracts c
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND c.status = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND c.project_id = $${params.length}`; }
    if (contract_type) { params.push(contract_type); q += ` AND c.contract_type = $${params.length}`; }
    q += ' ORDER BY c.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/contracts/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [contract] } = await db.query(
      `SELECT c.*, p.code AS project_code, p.name AS project_name
       FROM contracts c LEFT JOIN projects p ON c.project_id = p.id
       WHERE c.id = $1 AND c.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!contract) return res.status(404).json({ error: 'Not found' });
    const { rows: amendments } = await db.query(
      'SELECT * FROM contract_amendments WHERE contract_id = $1 ORDER BY amendment_number', [contract.id]);
    res.json({ ...contract, amendments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/contracts
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate CT number
    const now = new Date();
    const prefix = `CT${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows: [last] } = await db.query(
      `SELECT contract_number FROM contracts WHERE contract_number LIKE $1 || '%' ORDER BY contract_number DESC LIMIT 1`, [prefix]);
    let seq = 1;
    if (last) { seq = parseInt(last.contract_number.slice(prefix.length)) + 1; }
    const contractNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    const { rows: [contract] } = await db.query(
      `INSERT INTO contracts (company_id, contract_number, project_id, tender_id, contract_type,
        counterparty_code, counterparty_name, contract_amount, start_date, end_date,
        signing_date, remarks, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [req.user.company_id, contractNumber, b.project_id || null, b.tender_id || null,
       b.contract_type || null, b.counterparty_code || null, b.counterparty_name || null,
       b.contract_amount || 0, b.start_date || null, b.end_date || null,
       b.signing_date || null, b.remarks || null, b.status || 'draft', req.user.id]);
    res.status(201).json(contract);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/contracts/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM contracts WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!['draft', 'pending_review'].includes(existing.status))
      return res.status(400).json({ error: 'Can only update draft or pending_review contracts' });

    const allowed = ['project_id','tender_id','contract_type','counterparty_code','counterparty_name',
      'contract_amount','start_date','end_date','signing_date','remarks','status'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE contracts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/contracts/:id (soft delete — draft only)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM contracts WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'draft')
      return res.status(400).json({ error: 'Can only delete draft contracts' });
    const { rows } = await db.query(
      "UPDATE contracts SET status='terminated', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    res.json({ terminated: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/contracts/:id/activate
router.post('/:id/activate', async (req, res) => {
  try {
    const { rows: [contract] } = await db.query(
      'SELECT * FROM contracts WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!contract) return res.status(404).json({ error: 'Not found' });
    if (!contract.start_date || !contract.end_date)
      return res.status(400).json({ error: 'start_date and end_date are required to activate' });
    const { rows } = await db.query(
      "UPDATE contracts SET status='active', updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/contracts/:id/amend
router.post('/:id/amend', async (req, res) => {
  try {
    const { rows: [contract] } = await db.query(
      'SELECT * FROM contracts WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!contract) return res.status(404).json({ error: 'Not found' });

    const b = req.body;
    const amendmentNumber = (contract.amendment_count || 0) + 1;

    // Insert amendment record
    const { rows: [amendment] } = await db.query(
      `INSERT INTO contract_amendments (contract_id, amendment_number, description,
        previous_amount, new_amount, previous_end_date, new_end_date, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [contract.id, amendmentNumber, b.description || null,
       contract.contract_amount, b.new_amount || contract.contract_amount,
       contract.end_date, b.new_end_date || contract.end_date,
       b.reason || null, req.user.id]);

    // Update contract with new values
    const { rows } = await db.query(
      `UPDATE contracts SET contract_amount = $1, end_date = $2,
        amendment_count = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [b.new_amount || contract.contract_amount, b.new_end_date || contract.end_date,
       amendmentNumber, contract.id]);
    res.json({ ...rows[0], latest_amendment: amendment });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
