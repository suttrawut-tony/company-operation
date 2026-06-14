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

    // Sanitize UUID fields — empty string or "null" → null
    const uuidFields = ['project_id','travel_id','job_order_id','vehicle_id','technician_id'];
    uuidFields.forEach(f => { if (!b[f] || b[f] === 'null' || b[f] === '') b[f] = null; });

    const defaultColor = { vehicle: '#4285f4', technician: '#0f9d58', flight: '#db4437' }[b.booking_type] || '#4285f4';
    const fields = ['company_id','booking_type','project_id','travel_id','job_order_id','vehicle_id','technician_id','start_date','start_time','end_date','end_time','all_day','title','purpose','location','remarks','color','passengers','job_type','site_name','system_capacity','job_description','tools_required','safety_notes','airline','flight_number','departure_airport','arrival_airport','departure_time','arrival_time','return_flight_number','return_departure_time','return_arrival_time','passenger_names','booking_reference','ticket_cost','booking_channel','e_ticket_url','booked_by','phase','customer_name','customer_phone','customer_address','gps_lat','gps_lng','roof_area','roof_type','orientation','recommended_kwp','survey_photos','survey_notes','electrical_info'];
    const vals = [req.user.company_id, b.booking_type, b.project_id||null, b.travel_id||null, b.job_order_id||null, b.vehicle_id||null, b.technician_id||null, b.start_date, b.start_time||null, b.end_date, b.end_time||null, b.all_day !== false, b.title||null, b.purpose||null, b.location||null, b.remarks||null, b.color||defaultColor, b.passengers||null, b.job_type||null, b.site_name||null, b.system_capacity||null, b.job_description||null, b.tools_required||null, b.safety_notes||null, b.airline||null, b.flight_number||null, b.departure_airport||null, b.arrival_airport||null, b.departure_time||null, b.arrival_time||null, b.return_flight_number||null, b.return_departure_time||null, b.return_arrival_time||null, b.passenger_names||null, b.booking_reference||null, b.ticket_cost||null, b.booking_channel||null, b.e_ticket_url||null, req.user.id, b.phase||'survey', b.customer_name||null, b.customer_phone||null, b.customer_address||null, b.gps_lat||null, b.gps_lng||null, b.roof_area||null, b.roof_type||null, b.orientation||null, b.recommended_kwp||null, b.survey_photos||null, b.survey_notes||null, b.electrical_info||null];
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
    if (!['pending','approved','confirmed','surveying','survey_completed'].includes(existing.status) && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'Cannot edit booking with status ' + existing.status });
    }
    // Status transition validation (state machine)
    if (req.body.status && req.body.status !== existing.status) {
      const validTransitions = {
        pending: ['approved','cancelled'],
        approved: ['surveying','cancelled'],
        surveying: ['survey_completed','cancelled'],
        survey_completed: ['confirmed','cancelled'],
        confirmed: ['quotation_sent','cancelled'],
        quotation_sent: ['completed','cancelled'],
        checked_out: ['checked_in'],
        checked_in: ['completed'],
      };
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(req.body.status) && req.user.role !== 'executive') {
        return res.status(400).json({ error: `Cannot change status from '${existing.status}' to '${req.body.status}'. Allowed: ${allowed.join(', ')}` });
      }
    }
    // Sanitize UUID fields
    ['project_id','job_order_id','vehicle_id','technician_id','quotation_id'].forEach(f => {
      if (req.body[f] === '' || req.body[f] === 'null') req.body[f] = null;
    });
    const allowed = ['title','purpose','location','remarks','color','start_date','end_date','start_time','end_time','all_day','project_id','job_order_id','vehicle_id','technician_id','passengers','job_type','site_name','system_capacity','job_description','tools_required','safety_notes','airline','flight_number','departure_airport','arrival_airport','departure_time','arrival_time','return_flight_number','return_departure_time','return_arrival_time','passenger_names','booking_reference','ticket_cost','booking_channel','status','job_status','job_report','phase','customer_name','customer_phone','customer_address','gps_lat','gps_lng','roof_area','roof_type','orientation','recommended_kwp','survey_photos','survey_notes','electrical_info'];
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

// POST /api/bookings/:id/checkout (vehicle) — with company_id check
router.post('/:id/checkout', async (req, res) => {
  try {
    const { km_start, fuel_start } = req.body;
    const { rows } = await db.query(
      "UPDATE bookings SET status='checked_out', km_start=$1, fuel_start=$2, checked_out_at=NOW(), updated_at=NOW() WHERE id=$3 AND company_id=$4 RETURNING *",
      [km_start, fuel_start, req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings/:id/checkin (vehicle) — with company_id check
router.post('/:id/checkin', async (req, res) => {
  try {
    const { km_end, fuel_end, condition_notes } = req.body;
    const { rows } = await db.query(
      "UPDATE bookings SET status='checked_in', km_end=$1, fuel_end=$2, condition_notes=$3, checked_in_at=NOW(), updated_at=NOW() WHERE id=$4 AND company_id=$5 RETURNING *",
      [km_end, fuel_end, condition_notes, req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
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

// ══════════════════════════════════
//  BOOKING ITEMS
// ══════════════════════════════════

// GET /api/bookings/:id/items
router.get('/:id/items', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM booking_items WHERE booking_id = $1 ORDER BY sort_order, id', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings/:id/items
router.post('/:id/items', async (req, res) => {
  try {
    const b = req.body;
    const total = (b.qty || 1) * (b.unit_price || 0);
    const { rows: [item] } = await db.query(
      `INSERT INTO booking_items (booking_id, item_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, (b.item_id && b.item_id !== 'null') ? b.item_id : null, b.item_code || null, b.item_name,
       b.qty || 1, b.unit || 'ea', b.unit_price || 0, total, b.sort_order || 0]);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/bookings/:id/items/:itemId
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { qty } = req.body;
    const { rows: [item] } = await db.query(
      'SELECT * FROM booking_items WHERE id=$1 AND booking_id=$2', [req.params.itemId, req.params.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const newQty = qty !== undefined ? qty : item.qty;
    const total = newQty * parseFloat(item.unit_price);
    const { rows: [updated] } = await db.query(
      'UPDATE booking_items SET qty=$1, total=$2 WHERE id=$3 RETURNING *', [newQty, total, req.params.itemId]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/bookings/:id/items/:itemId
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    await db.query('DELETE FROM booking_items WHERE id = $1 AND booking_id = $2', [req.params.itemId, req.params.id]);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bookings/:id/convert-to-sq — creates Quotation + Project (transactional)
router.post('/:id/convert-to-sq', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { rows: [booking] } = await client.query(
      'SELECT * FROM bookings WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!booking) { client.release(); return res.status(404).json({ error: 'Booking not found' }); }
    if (booking.status !== 'confirmed' && req.user.role !== 'executive') {
      client.release(); return res.status(400).json({ error: 'Booking must be in "confirmed" status to convert. Current: ' + booking.status });
    }

    const { rows: bItems } = await client.query(
      'SELECT * FROM booking_items WHERE booking_id = $1 ORDER BY sort_order', [booking.id]);
    if (!bItems.length) {
      client.release(); return res.status(400).json({ error: 'Booking has no items. Add items before converting to SQ.' });
    }

    // ── BEGIN TRANSACTION ──
    await client.query('BEGIN');

    const subtotal = bItems.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    const vatPct = 7;
    const vatAmt = Math.round(subtotal * vatPct / 100 * 100) / 100;
    const grandTotal = subtotal + vatAmt;

    // Auto-generate SQ number (inside transaction to prevent race condition)
    const now = new Date();
    const sqPrefix = `SQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows: [lastSQ] } = await client.query(
      `SELECT sq_number FROM quotations WHERE sq_number LIKE $1 || '%' ORDER BY sq_number DESC LIMIT 1 FOR UPDATE`, [sqPrefix]);
    let sqSeq = 1;
    if (lastSQ) { sqSeq = parseInt(lastSQ.sq_number.split('-')[2] || '0') + 1; }
    const sqNumber = `${sqPrefix}-${String(sqSeq).padStart(3, '0')}`;

    // Project code
    let prjCode;
    const manualCode = (req.body.manual_project_code || '').trim();
    if (manualCode) {
      const { rows: dup } = await client.query('SELECT id FROM projects WHERE code=$1 AND company_id=$2', [manualCode, req.user.company_id]);
      if (dup.length) { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ error: `รหัสโปรเจกต์ "${manualCode}" มีอยู่แล้ว กรุณาใช้รหัสอื่น` }); }
      prjCode = manualCode;
    } else {
      const prjPrefix = `PRJ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { rows: [lastPrj] } = await client.query(`SELECT code FROM projects WHERE code LIKE $1 || '%' ORDER BY code DESC LIMIT 1 FOR UPDATE`, [prjPrefix]);
      let prjSeq = 1;
      if (lastPrj) { prjSeq = parseInt(lastPrj.code.split('-')[2] || '0') + 1; }
      prjCode = `${prjPrefix}-${String(prjSeq).padStart(3, '0')}`;
    }

    // Create Project
    const prjName = `Solar ${booking.recommended_kwp || ''}kWp — ${booking.customer_name || booking.site_name || 'Customer'}`;
    const { rows: [project] } = await client.query(
      `INSERT INTO projects (company_id, code, name, status, start_date, end_date, created_by)
       VALUES ($1,$2,$3,'active',$4,$5,$6) RETURNING *`,
      [req.user.company_id, prjCode, prjName, booking.start_date, booking.end_date, req.user.id]);

    // Create project phases
    const phases = [
      { name: 'สำรวจหน้างาน (Survey)', status: 'completed', sort: 1 },
      { name: 'เสนอราคา (Quotation)', status: 'in_progress', sort: 2 },
      { name: 'สั่งซื้ออุปกรณ์ (Procurement)', status: 'pending', sort: 3 },
      { name: 'ติดตั้งระบบ (Installation)', status: 'pending', sort: 4 },
      { name: 'ทดสอบระบบ (Testing & Commissioning)', status: 'pending', sort: 5 },
      { name: 'ส่งมอบ + ขอ กฟภ./กฟน. (Handover & MEA/PEA)', status: 'pending', sort: 6 },
      { name: 'รับประกัน (Warranty)', status: 'pending', sort: 7 },
    ];
    for (const ph of phases) {
      await client.query(
        `INSERT INTO project_phases (project_id, name, status, sort_order) VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [project.id, ph.name, ph.status, ph.sort]);
    }

    // Create Quotation
    const { rows: [sq] } = await client.query(
      `INSERT INTO quotations (company_id, sq_number, booking_id, project_id,
        customer_name, customer_phone, customer_address, site_name, site_location,
        system_capacity, roof_type, roof_area, subtotal, vat_pct, vat_amt, grand_total,
        status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'draft',$17) RETURNING *`,
      [req.user.company_id, sqNumber, booking.id, project.id,
       booking.customer_name, booking.customer_phone, booking.customer_address,
       booking.site_name, booking.location, booking.recommended_kwp,
       booking.roof_type, booking.roof_area, subtotal, vatPct, vatAmt, grandTotal,
       req.user.id]);

    // Copy booking items → quotation items
    for (let i = 0; i < bItems.length; i++) {
      const it = bItems[i];
      const itemId = (it.item_id && it.item_id !== 'null') ? it.item_id : null;
      await client.query(
        `INSERT INTO quotation_items (quotation_id, item_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [sq.id, itemId, it.item_code, it.item_name, it.qty, it.unit, it.unit_price, it.total, i]);
    }

    // Update booking
    await client.query(
      "UPDATE bookings SET status='quotation_sent', quotation_id=$1, project_id=$2, updated_at=NOW() WHERE id=$3",
      [sq.id, project.id, booking.id]);

    await client.query('COMMIT');
    client.release();
    res.status(201).json({ quotation: sq, project, sq_number: sqNumber, project_code: prjCode });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
