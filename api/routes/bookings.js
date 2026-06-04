const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');
router.use(authenticate);

// GET /api/bookings — unified list (calendar + list view)
router.get('/', async (req, res) => {
  try {
    const { type, start_date, end_date, resource_id, project_id, status } = req.query;
    let q = `SELECT b.*,
      v.name AS vehicle_name, v.plate_number,
      t.first_name AS tech_first, t.last_name AS tech_last, t.nickname AS tech_nickname,
      u.first_name || ' ' || u.last_name AS booked_by_name,
      p.code AS project_code, p.name AS project_name,
      jo.job_order_number, jo.title AS job_order_title
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN technicians t ON b.technician_id = t.id
      LEFT JOIN users u ON b.booked_by = u.id
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN job_orders jo ON b.job_order_id = jo.id
      WHERE b.company_id = $1`;
    const params = [req.user.company_id];
    if (type) { params.push(type); q += ` AND b.booking_type = $${params.length}`; }
    if (start_date) { params.push(start_date); q += ` AND b.end_date >= $${params.length}`; }
    if (end_date) { params.push(end_date); q += ` AND b.start_date <= $${params.length}`; }
    if (resource_id) { params.push(resource_id); q += ` AND (b.vehicle_id = $${params.length} OR b.technician_id = $${params.length})`; }
    if (project_id) { params.push(project_id); q += ` AND b.project_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND b.status = $${params.length}`; }
    q += ' ORDER BY b.start_date, b.start_time NULLS FIRST';
    const { rows } = await db.query(q, params);
    // Format for calendar
    const events = rows.map(b => {
      let resourceName = '';
      if (b.booking_type === 'vehicle') resourceName = `${b.plate_number||''} ${b.vehicle_name||''}`.trim();
      else if (b.booking_type === 'technician') resourceName = `${b.tech_nickname || b.tech_first || ''} ${b.tech_last||''}`.trim();
      else if (b.booking_type === 'flight') resourceName = `${b.flight_number||''} ${b.departure_airport||''}→${b.arrival_airport||''}`;
      return { ...b, resource_name: resourceName,
        start: b.all_day ? b.start_date : `${b.start_date}T${b.start_time||'00:00'}`,
        end: b.all_day ? b.end_date : `${b.end_date}T${b.end_time||'23:59'}` };
    });
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bookings/availability
router.get('/availability', async (req, res) => {
  try {
    const { type, start_date, end_date } = req.query;
    const sd = start_date || new Date().toISOString().slice(0,10);
    const days = 14;
    let resources = [];
    if (!type || type === 'vehicle') {
      const { rows } = await db.query('SELECT id, name, plate_number, status FROM vehicles WHERE company_id=$1 ORDER BY name', [req.user.company_id]);
      resources = resources.concat(rows.map(r => ({ ...r, resource_type: 'vehicle', resource_name: `${r.plate_number} ${r.name}` })));
    }
    if (!type || type === 'technician') {
      const { rows } = await db.query("SELECT id, first_name, last_name, nickname, status FROM technicians WHERE company_id=$1 AND status!='inactive' ORDER BY first_name", [req.user.company_id]);
      resources = resources.concat(rows.map(r => ({ ...r, resource_type: 'technician', resource_name: `${r.nickname||r.first_name} ${r.last_name||''}`.trim() })));
    }
    const { rows: bookings } = await db.query(
      `SELECT vehicle_id, technician_id, start_date, end_date, booking_type FROM bookings
       WHERE company_id=$1 AND status NOT IN ('rejected','cancelled')
       AND end_date >= $2 AND start_date <= ($2::date + INTERVAL '${days} days')`, [req.user.company_id, sd]);
    const result = resources.map(r => {
      const dayList = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(sd); d.setDate(d.getDate() + i);
        const ds = d.toISOString().slice(0,10);
        let dayStatus = r.status === 'retired' || r.status === 'inactive' ? 'unavailable' : 'available';
        const isBooked = bookings.some(b => {
          const rid = r.resource_type === 'vehicle' ? b.vehicle_id : b.technician_id;
          return rid === r.id && ds >= b.start_date?.toISOString().slice(0,10) && ds <= b.end_date?.toISOString().slice(0,10);
        });
        if (isBooked) dayStatus = 'booked';
        dayList.push({ date: ds, status: dayStatus });
      }
      return { ...r, days: dayList };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings — create
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    if (!b.booking_type) return res.status(400).json({ error: 'booking_type required' });
    if (!b.start_date || !b.end_date) return res.status(400).json({ error: 'start_date and end_date required' });

    // Conflict check for vehicle/technician
    if (b.booking_type === 'vehicle' && b.vehicle_id) {
      const { rows: conflicts } = await db.query(
        `SELECT id FROM bookings WHERE vehicle_id=$1 AND status NOT IN ('rejected','cancelled') AND start_date <= $3 AND end_date >= $2`,
        [b.vehicle_id, b.start_date, b.end_date]);
      if (conflicts.length) return res.status(409).json({ error: 'Vehicle booking conflict', conflicts });
    }
    if (b.booking_type === 'technician' && b.technician_id) {
      const { rows: conflicts } = await db.query(
        `SELECT id FROM bookings WHERE technician_id=$1 AND status NOT IN ('rejected','cancelled') AND start_date <= $3 AND end_date >= $2`,
        [b.technician_id, b.start_date, b.end_date]);
      if (conflicts.length) return res.status(409).json({ error: 'Technician booking conflict', conflicts });
    }

    const defaultColor = { vehicle: '#4285f4', technician: '#0f9d58', flight: '#db4437' }[b.booking_type] || '#4285f4';
    const fields = ['company_id','booking_type','project_id','travel_id','job_order_id','vehicle_id','technician_id','start_date','start_time','end_date','end_time','all_day','title','purpose','location','remarks','color','passengers','job_type','site_name','system_capacity','job_description','tools_required','safety_notes','airline','flight_number','departure_airport','arrival_airport','departure_time','arrival_time','return_flight_number','return_departure_time','return_arrival_time','passenger_names','booking_reference','ticket_cost','booking_channel','e_ticket_url','booked_by'];
    const vals = [req.user.company_id, b.booking_type, b.project_id||null, b.travel_id||null, b.job_order_id||null, b.vehicle_id||null, b.technician_id||null, b.start_date, b.start_time||null, b.end_date, b.end_time||null, b.all_day !== false, b.title||null, b.purpose||null, b.location||null, b.remarks||null, b.color||defaultColor, b.passengers||null, b.job_type||null, b.site_name||null, b.system_capacity||null, b.job_description||null, b.tools_required||null, b.safety_notes||null, b.airline||null, b.flight_number||null, b.departure_airport||null, b.arrival_airport||null, b.departure_time||null, b.arrival_time||null, b.return_flight_number||null, b.return_departure_time||null, b.return_arrival_time||null, b.passenger_names||null, b.booking_reference||null, b.ticket_cost||null, b.booking_channel||null, b.e_ticket_url||null, req.user.id];
    const placeholders = vals.map((_, i) => `$${i+1}`).join(',');
    const { rows: [booking] } = await db.query(
      `INSERT INTO bookings (${fields.join(',')}) VALUES (${placeholders}) RETURNING *`, vals);

    // Participants
    if (b.participants && b.participants.length) {
      for (const p of b.participants) {
        await db.query('INSERT INTO booking_participants (booking_id, user_id, name, role) VALUES ($1,$2,$3,$4)',
          [booking.id, p.user_id||null, p.name||null, p.role||'passenger']);
      }
    }
    res.status(201).json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/bookings/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query('SELECT * FROM bookings WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!['pending','approved','confirmed'].includes(existing.status) && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'Cannot edit booking with status ' + existing.status });
    }
    const allowed = ['title','purpose','location','remarks','color','start_date','end_date','start_time','end_time','all_day','project_id','job_order_id','vehicle_id','technician_id','passengers','job_type','site_name','system_capacity','job_description','tools_required','safety_notes','airline','flight_number','departure_airport','arrival_airport','departure_time','arrival_time','return_flight_number','return_departure_time','return_arrival_time','passenger_names','booking_reference','ticket_cost','booking_channel','status','job_status','job_report'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE bookings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE bookings SET status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW() WHERE id=$2 AND status='pending' RETURNING *",
      [req.user.id, req.params.id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot approve' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE bookings SET status='rejected', remarks=$1, updated_at=NOW() WHERE id=$2 AND status='pending' RETURNING *",
      [req.body.reason || '', req.params.id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot reject' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings/:id/checkout (vehicle)
router.post('/:id/checkout', async (req, res) => {
  try {
    const { km_start, fuel_start } = req.body;
    const { rows } = await db.query(
      "UPDATE bookings SET status='checked_out', km_start=$1, fuel_start=$2, checked_out_at=NOW(), updated_at=NOW() WHERE id=$3 RETURNING *",
      [km_start, fuel_start, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings/:id/checkin (vehicle)
router.post('/:id/checkin', async (req, res) => {
  try {
    const { km_end, fuel_end, condition_notes } = req.body;
    const { rows } = await db.query(
      "UPDATE bookings SET status='checked_in', km_end=$1, fuel_end=$2, condition_notes=$3, checked_in_at=NOW(), updated_at=NOW() WHERE id=$4 RETURNING *",
      [km_end, fuel_end, condition_notes, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/bookings/:id/job-status (technician)
router.put('/:id/job-status', async (req, res) => {
  try {
    const { job_status, job_report } = req.body;
    const sets = ['job_status = $1', 'updated_at = NOW()'];
    const params = [job_status];
    if (job_status === 'completed') {
      sets.push('job_completed_at = NOW()');
      sets.push('status = $' + (params.length + 1)); params.push('completed');
      if (job_report) { sets.push('job_report = $' + (params.length + 1)); params.push(job_report); }
    }
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE bookings SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    // Update technician status
    if (rows[0].technician_id) {
      const newStatus = job_status === 'completed' ? 'available' : 'on_job';
      await db.query('UPDATE technicians SET status=$1, updated_at=NOW() WHERE id=$2', [newStatus, rows[0].technician_id]);
    }
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
