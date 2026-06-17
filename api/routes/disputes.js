const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/disputes
router.get('/', async (req, res) => {
  try {
    const { status, project_id, priority, dispute_type } = req.query;
    let q = `SELECT d.*, p.code AS project_code, p.name AS project_name
      FROM disputes d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND d.status = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND d.project_id = $${params.length}`; }
    if (priority) { params.push(priority); q += ` AND d.priority = $${params.length}`; }
    if (dispute_type) { params.push(dispute_type); q += ` AND d.dispute_type = $${params.length}`; }
    q += ' ORDER BY d.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/disputes/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [dispute] } = await db.query(
      `SELECT d.*, p.code AS project_code, p.name AS project_name
       FROM disputes d LEFT JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1 AND d.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!dispute) return res.status(404).json({ error: 'Not found' });
    const { rows: activities } = await db.query(
      'SELECT * FROM dispute_activities WHERE dispute_id = $1 ORDER BY created_at DESC', [dispute.id]);
    res.json({ ...dispute, activities });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/disputes
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate DP number
    const now = new Date();
    const prefix = `DP${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows: [last] } = await db.query(
      `SELECT dispute_number FROM disputes WHERE dispute_number LIKE $1 || '%' ORDER BY dispute_number DESC LIMIT 1`, [prefix]);
    let seq = 1;
    if (last) { seq = parseInt(last.dispute_number.slice(prefix.length)) + 1; }
    const disputeNumber = `${prefix}${String(seq).padStart(4, '0')}`;

    const { rows: [dispute] } = await db.query(
      `INSERT INTO disputes (company_id, dispute_number, project_id, contract_id,
        dispute_type, priority, subject, description, claimed_amount,
        counterparty_name, remarks, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [req.user.company_id, disputeNumber, b.project_id || null, b.contract_id || null,
       b.dispute_type || null, b.priority || 'medium', b.subject || null,
       b.description || null, b.claimed_amount || 0,
       b.counterparty_name || null, b.remarks || null,
       b.status || 'open', req.user.id]);

    // Auto-insert opening activity
    await db.query(
      `INSERT INTO dispute_activities (dispute_id, action, description, created_by)
       VALUES ($1, $2, $3, $4)`,
      [dispute.id, 'opened', 'Dispute opened', req.user.id]);

    res.status(201).json(dispute);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/disputes/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM disputes WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!['open', 'investigating'].includes(existing.status))
      return res.status(400).json({ error: 'Can only update open or investigating disputes' });

    const allowed = ['project_id','contract_id','dispute_type','priority','subject',
      'description','claimed_amount','counterparty_name','remarks','status'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE disputes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/disputes/:id/resolve
router.post('/:id/resolve', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM disputes WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const b = req.body;
    const { rows } = await db.query(
      `UPDATE disputes SET status='resolved', resolved_date=NOW(), amount_settled=$1,
        updated_at=NOW() WHERE id=$2 RETURNING *`,
      [b.amount_settled || 0, req.params.id]);

    // Auto-insert resolution activity
    await db.query(
      `INSERT INTO dispute_activities (dispute_id, action, description, created_by)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, 'resolved', `Dispute resolved. Amount settled: ${b.amount_settled || 0}`, req.user.id]);

    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/disputes/:id/activity
router.post('/:id/activity', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM disputes WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const b = req.body;
    const { rows: [activity] } = await db.query(
      `INSERT INTO dispute_activities (dispute_id, action, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, b.action || 'note', b.description || null, req.user.id]);

    // Optional status change
    if (b.status) {
      await db.query(
        'UPDATE disputes SET status=$1, updated_at=NOW() WHERE id=$2',
        [b.status, req.params.id]);
    }

    res.status(201).json(activity);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
