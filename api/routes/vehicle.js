const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');
router.use(authenticate);

// GET /api/vehicle — list fleet
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM vehicles WHERE company_id = $1 ORDER BY name', [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vehicle/bookings
router.get('/bookings', async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, project_id } = req.query;
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT vb.*, v.name AS vehicle_name, v.plate_number,
             u.first_name || ' ' || u.last_name AS booked_by_name,
             p.code AS project_code
             FROM vehicle_bookings vb
             JOIN vehicles v ON vb.vehicle_id = v.id
             LEFT JOIN users u ON vb.booked_by = u.id
             LEFT JOIN projects p ON vb.project_id = p.id
             WHERE v.company_id = $1`;
    const params = [req.user.company_id];
    if (projectIds !== null) { params.push(projectIds); params.push(req.user.id); q += ` AND (vb.project_id = ANY($${params.length - 1}) OR vb.booked_by = $${params.length})`; }
    if (vehicle_id) { params.push(vehicle_id); q += ` AND vb.vehicle_id = $${params.length}`; }
    if (start_date) { params.push(start_date); q += ` AND vb.end_date >= $${params.length}`; }
    if (end_date) { params.push(end_date); q += ` AND vb.start_date <= $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND vb.project_id = $${params.length}`; }
    q += ' ORDER BY vb.start_date';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/bookings — check conflict + book
router.post('/bookings', async (req, res) => {
  try {
    const { vehicle_id, project_id, start_date, end_date, purpose, passengers } = req.body;
    // Conflict check
    const { rows: conflicts } = await db.query(
      `SELECT * FROM vehicle_bookings WHERE vehicle_id = $1
       AND status NOT IN ('rejected','cancelled')
       AND start_date <= $3 AND end_date >= $2`, [vehicle_id, start_date, end_date]);
    if (conflicts.length) return res.status(409).json({ error: 'Booking conflict', conflicts });

    const { rows: [booking] } = await db.query(
      `INSERT INTO vehicle_bookings (vehicle_id, project_id, start_date, end_date, purpose, passengers, booked_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [vehicle_id, project_id, start_date, end_date, purpose, passengers, req.user.id]);
    res.status(201).json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/bookings/:id/checkout
router.post('/bookings/:id/checkout', async (req, res) => {
  try {
    const { km_start, fuel_start } = req.body;
    const { rows } = await db.query(
      `UPDATE vehicle_bookings SET status='checked_out', km_start=$1, fuel_start=$2, checked_out_at=NOW()
       WHERE id=$3 RETURNING *`, [km_start, fuel_start, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/bookings/:id/checkin
router.post('/bookings/:id/checkin', async (req, res) => {
  try {
    const { km_end, fuel_end, condition_notes } = req.body;
    const { rows } = await db.query(
      `UPDATE vehicle_bookings SET status='checked_in', km_end=$1, fuel_end=$2, condition_notes=$3, checked_in_at=NOW()
       WHERE id=$4 RETURNING *`, [km_end, fuel_end, condition_notes, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
