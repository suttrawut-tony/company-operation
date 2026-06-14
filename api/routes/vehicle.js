const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds, checkPermission } = require('../middleware/auth');
router.use(authenticate);

// GET /api/vehicle — list fleet
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM vehicles WHERE company_id = $1 ORDER BY name', [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle — create new vehicle
router.post('/', async (req, res) => {
  try {
    const { name, plate_number, vehicle_type, seats, brand, model, year, color, vin_number, engine_number, registration_date, registration_expiry, ownership_type, lease_company, lease_start, lease_end, lease_monthly_cost, lease_contract_number } = req.body;
    if (!name || !plate_number) return res.status(400).json({ error: 'Name and plate number are required' });
    const { rows: [v] } = await db.query(
      `INSERT INTO vehicles (company_id, name, plate_number, vehicle_type, seats, brand, model, year, color, vin_number, engine_number, registration_date, registration_expiry, ownership_type, lease_company, lease_start, lease_end, lease_monthly_cost, lease_contract_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [req.user.company_id, name, plate_number, vehicle_type||'Sedan', seats||5, brand, model, year, color, vin_number, engine_number, registration_date||null, registration_expiry||null, ownership_type||'owned', lease_company, lease_start||null, lease_end||null, lease_monthly_cost, lease_contract_number]);
    res.status(201).json(v);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vehicle/bookings — reads from unified `bookings` table (booking_type='vehicle')
router.get('/bookings', async (req, res) => {
  try {
    const { vehicle_id, start_date, end_date, project_id } = req.query;
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT b.*, v.name AS vehicle_name, v.plate_number,
             u.first_name || ' ' || u.last_name AS booked_by_name,
             p.code AS project_code
             FROM bookings b
             LEFT JOIN vehicles v ON b.vehicle_id = v.id
             LEFT JOIN users u ON b.booked_by = u.id
             LEFT JOIN projects p ON b.project_id = p.id
             WHERE b.company_id = $1 AND b.booking_type = 'vehicle'`;
    const params = [req.user.company_id];
    if (projectIds !== null) { params.push(projectIds); params.push(req.user.id); q += ` AND (b.project_id = ANY($${params.length - 1}) OR b.booked_by = $${params.length})`; }
    if (vehicle_id) { params.push(vehicle_id); q += ` AND b.vehicle_id = $${params.length}`; }
    if (start_date) { params.push(start_date); q += ` AND b.end_date >= $${params.length}`; }
    if (end_date) { params.push(end_date); q += ` AND b.start_date <= $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND b.project_id = $${params.length}`; }
    q += ' ORDER BY b.start_date';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/bookings — check conflict + book (writes to unified `bookings` table)
router.post('/bookings', async (req, res) => {
  try {
    const { vehicle_id, project_id, start_date, end_date, purpose, passengers } = req.body;
    if (!vehicle_id) return res.status(400).json({ error: 'vehicle_id required' });
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date required' });
    // Conflict check against unified bookings table
    const { rows: conflicts } = await db.query(
      `SELECT b.id, b.start_date, b.end_date, b.title, b.purpose,
              v.name AS vehicle_name, v.plate_number,
              u.first_name || ' ' || u.last_name AS booked_by_name
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.booked_by = u.id
       WHERE b.vehicle_id = $1
       AND b.status NOT IN ('rejected','cancelled')
       AND b.start_date <= $3 AND b.end_date >= $2`, [vehicle_id, start_date, end_date]);
    if (conflicts.length) return res.status(409).json({ error: 'Booking conflict', conflicts });

    const { rows: [booking] } = await db.query(
      `INSERT INTO bookings (company_id, booking_type, vehicle_id, project_id, start_date, end_date, purpose, passengers, booked_by, all_day)
       VALUES ($1, 'vehicle', $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
      [req.user.company_id, vehicle_id, project_id || null, start_date, end_date, purpose, passengers, req.user.id]);
    res.status(201).json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/bookings/:id/checkout (unified bookings table + company_id check)
router.post('/bookings/:id/checkout', async (req, res) => {
  try {
    const { km_start, fuel_start } = req.body;
    const { rows } = await db.query(
      `UPDATE bookings SET status='checked_out', km_start=$1, fuel_start=$2, checked_out_at=NOW(), updated_at=NOW()
       WHERE id=$3 AND company_id=$4 AND booking_type='vehicle' RETURNING *`,
      [km_start, fuel_start, req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/bookings/:id/checkin (unified bookings table + company_id check)
router.post('/bookings/:id/checkin', async (req, res) => {
  try {
    const { km_end, fuel_end, condition_notes } = req.body;
    const { rows } = await db.query(
      `UPDATE bookings SET status='checked_in', km_end=$1, fuel_end=$2, condition_notes=$3, checked_in_at=NOW(), updated_at=NOW()
       WHERE id=$4 AND company_id=$5 AND booking_type='vehicle' RETURNING *`,
      [km_end, fuel_end, condition_notes, req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Availability & Schedule (must come before /:id) ═══

// GET /api/vehicle/availability?start_date=&end_date=
router.get('/availability', async (req, res) => {
  try {
    const startDate = req.query.start_date || new Date().toISOString().slice(0, 10);
    const days = parseInt(req.query.days) || 14;
    const { rows: vehicles } = await db.query('SELECT id, name, plate_number, status FROM vehicles WHERE company_id=$1 ORDER BY name', [req.user.company_id]);
    const { rows: bookings } = await db.query(
      `SELECT vehicle_id, start_date, end_date, status FROM bookings
       WHERE company_id=$1 AND booking_type='vehicle'
       AND status NOT IN ('rejected','cancelled')
       AND end_date >= $2 AND start_date <= ($2::date + ($3 || ' days')::interval)`, [req.user.company_id, startDate, days]);
    const { rows: maint } = await db.query(
      `SELECT vehicle_id, service_date, completed_date, status FROM vehicle_maintenance
       WHERE vehicle_id IN (SELECT id FROM vehicles WHERE company_id=$1)
       AND status IN ('scheduled','in_progress')
       AND service_date <= ($2::date + ($3 || ' days')::interval)
       AND COALESCE(completed_date, service_date + INTERVAL '3 days') >= $2`, [req.user.company_id, startDate, days]);

    const result = vehicles.map(v => {
      const dayList = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate); d.setDate(d.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        let dayStatus = v.status === 'retired' ? 'retired' : 'available';
        if (maint.some(m => m.vehicle_id === v.id && ds >= m.service_date?.toISOString().slice(0,10) && ds <= (m.completed_date || m.service_date)?.toISOString().slice(0,10))) dayStatus = 'maintenance';
        if (bookings.some(b => b.vehicle_id === v.id && ds >= b.start_date?.toISOString().slice(0,10) && ds <= b.end_date?.toISOString().slice(0,10))) dayStatus = 'booked';
        dayList.push({ date: ds, status: dayStatus });
      }
      return { ...v, days: dayList };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vehicle/alerts — all vehicle alerts
router.get('/alerts', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT va.*, v.plate_number, v.name AS vehicle_name
       FROM vehicle_alerts va JOIN vehicles v ON va.vehicle_id = v.id
       WHERE v.company_id = $1 ORDER BY va.created_at DESC LIMIT 50`, [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Insurance (static routes before /:id) ═══

// PUT /api/vehicle/insurance/:insId
router.put('/insurance/:insId', async (req, res) => {
  try {
    const fields = ['insurance_type','policy_number','insurance_company','coverage_start','coverage_end','premium','coverage_amount','deductible','broker','broker_phone','remarks','status'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.insId);
    const { rows } = await db.query(`UPDATE vehicle_insurance SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/vehicle/claims/:claimId
router.put('/claims/:claimId', async (req, res) => {
  try {
    const fields = ['claim_number','claim_date','claim_type','description','damage_amount','claim_amount','received_amount','status','driver_name','police_report_number','repair_shop','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.claimId);
    const { rows } = await db.query(`UPDATE vehicle_claims SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/vehicle/maintenance/:id
router.put('/maintenance/:id', async (req, res) => {
  try {
    const fields = ['maintenance_type','description','km_at_service','service_date','completed_date','service_center','cost','invoice_number','next_service_km','next_service_date','status','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE vehicle_maintenance SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/vehicle/issues/:id
router.put('/issues/:id', async (req, res) => {
  try {
    const fields = ['issue_type','severity','description','status','resolved_date','resolution','maintenance_id'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE vehicle_issues SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Vehicle-specific sub-resources (/:id/...) ═══

// Ownership guard: ensure vehicle belongs to user's company before accessing sub-resources
async function ensureVehicleOwnership(req, res, next) {
  try {
    const { rows } = await db.query('SELECT id FROM vehicles WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/vehicle/:id/insurance
router.get('/:id/insurance', ensureVehicleOwnership, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM vehicle_insurance WHERE vehicle_id=$1 ORDER BY coverage_end DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/:id/insurance
router.post('/:id/insurance', ensureVehicleOwnership, async (req, res) => {
  try {
    const { insurance_type, policy_number, insurance_company, coverage_start, coverage_end, premium, coverage_amount, deductible, broker, broker_phone, remarks } = req.body;
    const { rows: [ins] } = await db.query(
      `INSERT INTO vehicle_insurance (vehicle_id, insurance_type, policy_number, insurance_company, coverage_start, coverage_end, premium, coverage_amount, deductible, broker, broker_phone, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.params.id, insurance_type || 'compulsory', policy_number, insurance_company, coverage_start, coverage_end, premium||0, coverage_amount||0, deductible||0, broker, broker_phone, remarks]);
    res.status(201).json(ins);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vehicle/:id/claims
router.get('/:id/claims', ensureVehicleOwnership, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, i.policy_number, i.insurance_company
       FROM vehicle_claims c LEFT JOIN vehicle_insurance i ON c.insurance_id = i.id
       WHERE c.vehicle_id=$1 ORDER BY c.claim_date DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/:id/claims
router.post('/:id/claims', ensureVehicleOwnership, async (req, res) => {
  try {
    const { insurance_id, booking_id, claim_number, claim_date, claim_type, description, damage_amount, claim_amount, driver_name, police_report_number, repair_shop, remarks } = req.body;
    const { rows: [claim] } = await db.query(
      `INSERT INTO vehicle_claims (vehicle_id, insurance_id, booking_id, claim_number, claim_date, claim_type, description, damage_amount, claim_amount, driver_name, police_report_number, repair_shop, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.params.id, insurance_id||null, booking_id||null, claim_number, claim_date, claim_type||'accident', description, damage_amount||0, claim_amount||0, driver_name, police_report_number, repair_shop, remarks, req.user.id]);
    res.status(201).json(claim);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vehicle/:id/maintenance
router.get('/:id/maintenance', ensureVehicleOwnership, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM vehicle_maintenance WHERE vehicle_id=$1 ORDER BY service_date DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/:id/maintenance
router.post('/:id/maintenance', ensureVehicleOwnership, async (req, res) => {
  try {
    const { maintenance_type, description, km_at_service, service_date, completed_date, service_center, cost, invoice_number, next_service_km, next_service_date, remarks } = req.body;
    const { rows: [m] } = await db.query(
      `INSERT INTO vehicle_maintenance (vehicle_id, maintenance_type, description, km_at_service, service_date, completed_date, service_center, cost, invoice_number, next_service_km, next_service_date, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.params.id, maintenance_type||'scheduled', description, km_at_service, service_date, completed_date, service_center, cost||0, invoice_number, next_service_km, next_service_date, remarks, req.user.id]);
    res.status(201).json(m);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vehicle/:id/issues
router.get('/:id/issues', ensureVehicleOwnership, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, u.first_name || ' ' || u.last_name AS reported_by_name
       FROM vehicle_issues i LEFT JOIN users u ON i.reported_by = u.id
       WHERE i.vehicle_id=$1 ORDER BY i.report_date DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/vehicle/:id/issues
router.post('/:id/issues', ensureVehicleOwnership, async (req, res) => {
  try {
    const { booking_id, issue_type, severity, description } = req.body;
    const { rows: [issue] } = await db.query(
      `INSERT INTO vehicle_issues (vehicle_id, booking_id, reported_by, issue_type, severity, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, booking_id||null, req.user.id, issue_type||'other', severity||'medium', description]);
    res.status(201).json(issue);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/vehicle/:id/schedule?months=3
router.get('/:id/schedule', ensureVehicleOwnership, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 3;
    const endDate = new Date(); endDate.setMonth(endDate.getMonth() + months);
    const endStr = endDate.toISOString().slice(0, 10);
    const { rows: bookings } = await db.query(
      `SELECT b.*, u.first_name || ' ' || u.last_name AS booked_by_name, p.code AS project_code
       FROM bookings b LEFT JOIN users u ON b.booked_by = u.id LEFT JOIN projects p ON b.project_id = p.id
       WHERE b.vehicle_id=$1 AND b.booking_type='vehicle' AND b.status NOT IN ('rejected','cancelled') AND b.end_date >= CURRENT_DATE AND b.start_date <= $2
       ORDER BY b.start_date`, [req.params.id, endStr]);
    const { rows: maintenance } = await db.query(
      `SELECT * FROM vehicle_maintenance WHERE vehicle_id=$1 AND status IN ('scheduled','in_progress')
       AND service_date <= $2 ORDER BY service_date`, [req.params.id, endStr]);
    res.json({ bookings, maintenance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/vehicle/:id — Retire vehicle (soft delete)
router.delete('/:id', checkPermission(['executive','manager']), async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE vehicles SET status='retired', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING id, name, status",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/vehicle/bookings/:id — Cancel booking (unified bookings table)
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { rows: [b] } = await db.query(
      "SELECT * FROM bookings WHERE id=$1 AND company_id=$2 AND booking_type='vehicle'",
      [req.params.id, req.user.company_id]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    // Staff can only cancel own bookings
    if (req.user.role === 'staff' && b.booked_by !== req.user.id) {
      return res.status(403).json({ error: 'PERMISSION_DENIED', message: 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้' });
    }
    if (['checked_in','cancelled','completed'].includes(b.status)) {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'ไม่สามารถยกเลิกการจองที่สถานะ ' + b.status });
    }
    const { rows } = await db.query(
      "UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/vehicle/bookings/:id — Edit booking (unified bookings table + conflict re-check)
router.put('/bookings/:id', async (req, res) => {
  try {
    const { rows: [b] } = await db.query(
      "SELECT * FROM bookings WHERE id=$1 AND company_id=$2 AND booking_type='vehicle'",
      [req.params.id, req.user.company_id]);
    if (!b) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'staff' && b.booked_by !== req.user.id) {
      return res.status(403).json({ error: 'PERMISSION_DENIED', message: 'คุณไม่มีสิทธิ์แก้ไขการจองนี้' });
    }
    if (!['pending','approved'].includes(b.status)) {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'แก้ไขได้เฉพาะสถานะ pending/approved' });
    }
    // Re-check conflict if dates or vehicle changed
    const newVehicle = req.body.vehicle_id || b.vehicle_id;
    const newStart = req.body.start_date || b.start_date;
    const newEnd = req.body.end_date || b.end_date;
    if (req.body.vehicle_id || req.body.start_date || req.body.end_date) {
      const { rows: conflicts } = await db.query(
        `SELECT id FROM bookings WHERE vehicle_id=$1 AND id != $2
         AND status NOT IN ('rejected','cancelled')
         AND start_date <= $4 AND end_date >= $3`,
        [newVehicle, req.params.id, newStart, newEnd]);
      if (conflicts.length) return res.status(409).json({ error: 'Booking conflict', conflicts });
    }
    const fields = ['vehicle_id','start_date','end_date','purpose','passengers','project_id','title','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE bookings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/vehicle/:id — Update vehicle (KM, fuel, photo, details)
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = ['current_km','fuel_level','image_url','notes','status','brand','model','year','color','vin_number','engine_number','registration_date','registration_expiry','ownership_type','lease_company','lease_start','lease_end','lease_monthly_cost','lease_contract_number'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push(`updated_at = NOW()`);
    params.push(req.params.id);
    params.push(req.user.company_id);
    const { rows } = await db.query(
      `UPDATE vehicles SET ${sets.join(', ')} WHERE id = $${idx++} AND company_id = $${idx} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
