const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const params = [req.user.company_id];
    let where = 'WHERE o.company_id = $1';

    const allowedProjectIds = await getUserProjectIds(req.user);
    if (allowedProjectIds !== null) {
      params.push(allowedProjectIds);
      params.push(req.user.id);
      where += ` AND (o.project_id = ANY($${params.length - 1}) OR o.created_by = $${params.length})`;
    }

    if (req.query.project_id) {
      params.push(req.query.project_id);
      where += ` AND o.project_id = $${params.length}`;
    }
    const { rows } = await db.query(
      `SELECT o.*, u.first_name || ' ' || u.last_name AS user_name,
              p.code AS project_code
       FROM ot_requests o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN projects p ON o.project_id = p.id
       ${where} ORDER BY o.ot_date DESC`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, ot_date, ot_type, hours, base_rate, reason } = req.body;
    // Flat rate: holiday/special = 500, normal = 400 (ignore multiplier)
    const flatRate = (ot_type === 'holiday' || ot_type === 'special') ? 500 : 400;
    const effectiveRate = base_rate || flatRate;
    const multiplier = 1.0;
    const compensation = effectiveRate * hours;

    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'OT', 'OT', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `OT${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [ot] } = await db.query(
      `INSERT INTO ot_requests (company_id, project_id, doc_number, user_id, ot_date, ot_type, hours, base_rate, multiplier, compensation, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$4) RETURNING *`,
      [req.user.company_id, project_id, docNumber, req.user.id, ot_date, ot_type || 'normal', hours, effectiveRate, multiplier, compensation, reason]);
    res.status(201).json(ot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE ot_requests SET status = 'pending_manager' WHERE id = $1 AND company_id = $2 AND status = 'draft' RETURNING *`, [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot submit' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { rows: [ot] } = await db.query('SELECT * FROM ot_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!ot) return res.status(404).json({ error: 'Not found' });
    if (ot.status !== 'draft') return res.status(400).json({ error: 'Can only edit draft requests' });
    const role = req.user.role || '';
    if (ot.created_by !== req.user.id && !['pm','manager','executive','admin'].includes(role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { project_id, ot_date, ot_type, hours, base_rate, reason, status } = req.body;
    const newType = ot_type || ot.ot_type;
    const newHours = hours != null ? hours : ot.hours;
    // Flat rate: holiday/special = 500, normal = 400 (ignore multiplier)
    const flatRate = (newType === 'holiday' || newType === 'special') ? 500 : 400;
    const newRate = base_rate != null ? base_rate : flatRate;
    const multiplier = 1.0;
    const compensation = parseFloat(newRate) * parseFloat(newHours);
    const { rows } = await db.query(
      `UPDATE ot_requests SET project_id=COALESCE($1,project_id), ot_date=COALESCE($2,ot_date),
       ot_type=COALESCE($3,ot_type), hours=COALESCE($4,hours), base_rate=COALESCE($5,base_rate),
       multiplier=$6, compensation=$7, reason=COALESCE($8,reason), status=COALESCE($9,status),
       updated_at=NOW() WHERE id=$10 RETURNING *`,
      [project_id, ot_date, ot_type, hours, base_rate, multiplier, compensation, reason, status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const { rows: current } = await db.query('SELECT * FROM ot_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!current[0]) return res.status(404).json({ error: 'Not found' });
    const ot = current[0];
    const role = req.user.role || '';
    let newStatus;
    if (ot.status === 'pending_manager') {
      if (!['pm','finance','executive','admin'].includes(role))
        return res.status(403).json({ error: 'Not authorized to approve at this stage' });
      newStatus = 'pending_executive';
    } else if (ot.status === 'pending_executive') {
      if (!['executive','admin'].includes(role))
        return res.status(403).json({ error: 'Not authorized to approve at this stage' });
      newStatus = 'approved';
    } else {
      return res.status(400).json({ error: 'Cannot approve from status: ' + ot.status });
    }
    const { rows } = await db.query('UPDATE ot_requests SET status=$1 WHERE id=$2 RETURNING *', [newStatus, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/ot/:id — cancel OT request (soft delete, draft/pending only)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [ot] } = await db.query('SELECT * FROM ot_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!ot) return res.status(404).json({ error: 'Not found' });
    if (!['draft','pending_manager','pending_executive'].includes(ot.status)) {
      return res.status(400).json({ error: 'Can only cancel draft or pending requests' });
    }
    const role = req.user.role || '';
    if (ot.created_by !== req.user.id && !['pm','manager','executive','admin'].includes(role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await db.query('UPDATE ot_requests SET status=$1, updated_at=NOW() WHERE id=$2', ['cancelled', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added GET /:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [ot] } = await db.query('SELECT * FROM ot_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!ot) return res.status(404).json({ error: 'Not found' });
    res.json(ot);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added POST /:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const role = req.user.role || '';
    if (!['pm','finance','executive','admin'].includes(role))
      return res.status(403).json({ error: 'Not authorized to reject' });
    const { rows } = await db.query(
      "UPDATE ot_requests SET status='rejected', updated_at=NOW() WHERE id=$1 AND company_id=$2 AND status LIKE 'pending_%' RETURNING *",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot reject' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
