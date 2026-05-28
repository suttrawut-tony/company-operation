const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT tr.*,
              u.first_name || ' ' || u.last_name AS lead_name,
              p.code AS project_code, p.name AS project_name,
              vb.start_date AS vb_start, vb.end_date AS vb_end, vb.status AS vb_status,
              v.name AS vehicle_name, v.plate_number AS vehicle_plate,
              ae.doc_number AS advance_doc_number, ae.amount AS advance_doc_amount, ae.status AS advance_status
       FROM travel_requests tr
       LEFT JOIN users u ON tr.lead_user_id = u.id
       LEFT JOIN projects p ON tr.project_id = p.id
       LEFT JOIN vehicle_bookings vb ON tr.vehicle_booking_id = vb.id
       LEFT JOIN vehicles v ON vb.vehicle_id = v.id
       LEFT JOIN expenses ae ON tr.advance_expense_id = ae.id
       WHERE tr.company_id = $1`;
    const params = [req.user.company_id];
    if (projectIds !== null) { params.push(projectIds); params.push(req.user.id); q += ` AND (tr.project_id = ANY($${params.length - 1}) OR tr.created_by = $${params.length})`; }
    q += ' ORDER BY tr.start_date DESC';
    const { rows } = await db.query(q, params);
    // Attach members for each travel
    for (const tr of rows) {
      const { rows: members } = await db.query(
        `SELECT tm.*, u.first_name || ' ' || u.last_name AS name, u.first_name_th
         FROM travel_members tm JOIN users u ON tm.user_id = u.id
         WHERE tm.travel_id = $1`, [tr.id]);
      tr.members = members;
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: [travel] } = await db.query('SELECT * FROM travel_requests WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (!travel) return res.status(404).json({ error: 'Not found' });
    const { rows: members } = await db.query(
      `SELECT tm.*, u.first_name, u.last_name FROM travel_members tm
       JOIN users u ON tm.user_id = u.id WHERE tm.travel_id = $1`, [req.params.id]);
    res.json({ ...travel, members });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, destination, purpose, start_date, end_date, estimated_cost, advance_amount, members } = req.body;
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'TRV', 'TRV', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `TRV${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [travel] } = await db.query(
      `INSERT INTO travel_requests (company_id, project_id, doc_number, destination, purpose, start_date, end_date, estimated_cost, advance_amount, lead_user_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [req.user.company_id, project_id, docNumber, destination, purpose, start_date, end_date, estimated_cost || 0, advance_amount || 0, req.user.id]);

    if (members) {
      for (const m of members) {
        await db.query('INSERT INTO travel_members (travel_id, user_id, is_lead) VALUES ($1,$2,$3)',
          [travel.id, m.user_id, m.is_lead || false]);
      }
    }
    res.status(201).json(travel);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/travel/:id/submit — submit draft for approval
router.post('/:id/submit', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE travel_requests SET status = 'pending_manager' WHERE id = $1 AND status = 'draft' RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot submit' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/travel/:id/approve — approve travel request
router.post('/:id/approve', async (req, res) => {
  try {
    const { rows: [travel] } = await db.query('SELECT * FROM travel_requests WHERE id = $1', [req.params.id]);
    if (!travel) return res.status(404).json({ error: 'Not found' });
    const cost = parseFloat(travel.estimated_cost) || 0;
    let nextStatus;
    if (travel.status === 'pending_manager') nextStatus = cost > 50000 ? 'pending_executive' : 'approved';
    else if (travel.status === 'pending_executive') nextStatus = 'approved';
    else return res.status(400).json({ error: 'Cannot approve from status: ' + travel.status });
    const { rows } = await db.query(
      `UPDATE travel_requests SET status = $1 WHERE id = $2 RETURNING *`, [nextStatus, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/travel/:id/confirm — team member confirms
router.post('/:id/confirm', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE travel_members SET confirmed = true, confirmed_at = NOW()
       WHERE travel_id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not a member of this travel' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
