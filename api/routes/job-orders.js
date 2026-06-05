const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/job-orders
router.get('/', async (req, res) => {
  try {
    const { status, project_id, start_date, end_date } = req.query;
    let q = `SELECT jo.*,
      p.code AS project_code, p.name AS project_name,
      u.first_name || ' ' || u.last_name AS created_by_name
      FROM job_orders jo
      LEFT JOIN projects p ON jo.project_id = p.id
      LEFT JOIN users u ON jo.created_by = u.id
      WHERE jo.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND jo.status = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND jo.project_id = $${params.length}`; }
    if (start_date) { params.push(start_date); q += ` AND jo.planned_end >= $${params.length}`; }
    if (end_date) { params.push(end_date); q += ` AND jo.planned_start <= $${params.length}`; }
    q += ' ORDER BY jo.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/job-orders/approved
router.get('/approved', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT jo.id, jo.job_order_number, jo.title, jo.job_type, jo.site_name,
        jo.location, jo.description, jo.priority, jo.planned_start, jo.planned_end,
        jo.project_id, jo.needs_vehicle, jo.needs_technician, jo.needs_flight, jo.status,
        p.code AS project_code, p.name AS project_name,
        COALESCE(bc.booking_count, 0) AS booking_count
      FROM job_orders jo
      LEFT JOIN projects p ON jo.project_id = p.id
      LEFT JOIN (
        SELECT job_order_id, COUNT(*) AS booking_count
        FROM bookings WHERE status NOT IN ('cancelled','rejected')
        GROUP BY job_order_id
      ) bc ON bc.job_order_id = jo.id
      WHERE jo.company_id = $1 AND jo.status IN ('approved','in_progress')
      ORDER BY jo.created_at DESC`, [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/job-orders
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.title) return res.status(400).json({ error: 'title required' });
    if (!b.planned_start || !b.planned_end) return res.status(400).json({ error: 'planned_start and planned_end required' });

    // Auto-generate job_order_number
    const now = new Date();
    const prefix = `JO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows: [last] } = await db.query(
      `SELECT job_order_number FROM job_orders
       WHERE job_order_number LIKE $1 || '%'
       ORDER BY job_order_number DESC LIMIT 1`, [prefix]);
    let seq = 1;
    if (last) {
      const parts = last.job_order_number.split('-');
      seq = parseInt(parts[2] || '0') + 1;
    }
    const jobOrderNumber = `${prefix}-${String(seq).padStart(3, '0')}`;

    const { rows: [jo] } = await db.query(
      `INSERT INTO job_orders (company_id, job_order_number, project_id, title, description,
        job_type, site_name, location, priority, planned_start, planned_end,
        needs_vehicle, needs_technician, needs_flight, status, created_by,
        latitude, longitude, required_tools)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [req.user.company_id, jobOrderNumber, b.project_id || null, b.title, b.description || null,
       b.job_type || null, b.site_name || null, b.location || null, b.priority || 'normal',
       b.planned_start, b.planned_end,
       b.needs_vehicle || false, b.needs_technician || false, b.needs_flight || false,
       b.status || 'draft', req.user.id,
       b.latitude || null, b.longitude || null, b.required_tools || null]);

    res.status(201).json(jo);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/job-orders/:id/approve — approve a draft/submitted JO
router.post('/:id/approve', async (req, res) => {
  try {
    // Only manager/executive can approve
    if (!['executive','manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only manager or executive can approve job orders' });
    }
    const { rows } = await db.query(
      `UPDATE job_orders SET status='approved', updated_at=NOW()
       WHERE id=$1 AND company_id=$2 AND status IN ('draft','submitted') RETURNING *`,
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot approve — JO not found or already approved' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/job-orders/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    if (!['executive','manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only manager or executive can reject job orders' });
    }
    const { rows } = await db.query(
      `UPDATE job_orders SET status='rejected', updated_at=NOW()
       WHERE id=$1 AND company_id=$2 AND status IN ('draft','submitted') RETURNING *`,
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot reject' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/job-orders/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM job_orders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const allowed = ['title', 'description', 'job_type', 'site_name', 'location', 'priority',
      'planned_start', 'planned_end', 'needs_vehicle', 'needs_technician', 'needs_flight',
      'project_id', 'status', 'latitude', 'longitude', 'required_tools'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE job_orders SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/job-orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE job_orders SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
