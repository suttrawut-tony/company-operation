const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { status, source, assigned_to } = req.query;
    let q = `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name,
      cu.first_name || ' ' || cu.last_name AS created_by_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN users cu ON l.created_by = cu.id
      WHERE l.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND l.status = $${params.length}`; }
    if (source) { params.push(source); q += ` AND l.source = $${params.length}`; }
    if (assigned_to) { params.push(assigned_to); q += ` AND l.assigned_to = $${params.length}`; }
    q += ' ORDER BY l.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [lead] } = await db.query(
      `SELECT l.*, u.first_name || ' ' || u.last_name AS assigned_to_name
       FROM leads l LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.id = $1 AND l.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!lead) return res.status(404).json({ error: 'Not found' });
    res.json(lead);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate LD number
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'LD', 'LD', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const leadNumber = `LD${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [lead] } = await db.query(
      `INSERT INTO leads (company_id, lead_number, customer_name, customer_phone, customer_email,
        customer_address, source, interest_type, estimated_kwp, monthly_bill, roof_type,
        location, status, assigned_to, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [req.user.company_id, leadNumber, b.customer_name, b.customer_phone || null,
       b.customer_email || null, b.customer_address || null, b.source || 'phone',
       b.interest_type || null, b.estimated_kwp || null, b.monthly_bill || null,
       b.roof_type || null, b.location || null, b.status || 'new',
       b.assigned_to || null, b.notes || null, req.user.id]);
    res.status(201).json(lead);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM leads WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const allowed = ['customer_name','customer_phone','customer_email','customer_address',
      'source','interest_type','estimated_kwp','monthly_bill','roof_type','location',
      'status','assigned_to','lost_reason','notes','project_id','quotation_id'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE leads SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/leads/:id — soft delete (status='lost')
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE leads SET status='lost', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/leads/:id/convert — convert to quotation
router.post('/:id/convert', async (req, res) => {
  try {
    const { rows: [lead] } = await db.query(
      'SELECT * FROM leads WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!lead) return res.status(404).json({ error: 'Not found' });

    // Auto-generate SQ number for quotation
    const now = new Date();
    const prefix = `SQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows: [last] } = await db.query(
      `SELECT sq_number FROM quotations WHERE sq_number LIKE $1 || '%' ORDER BY sq_number DESC LIMIT 1`, [prefix]);
    let seq = 1;
    if (last) { const parts = last.sq_number.split('-'); seq = parseInt(parts[2] || '0') + 1; }
    const sqNumber = `${prefix}-${String(seq).padStart(3, '0')}`;

    // Create quotation draft from lead data
    const { rows: [quotation] } = await db.query(
      `INSERT INTO quotations (company_id, sq_number, customer_name, customer_phone, customer_address,
        site_location, system_capacity, roof_type, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10)
       RETURNING *`,
      [req.user.company_id, sqNumber, lead.customer_name, lead.customer_phone || null,
       lead.customer_address || null, lead.location || null, lead.estimated_kwp || null,
       lead.roof_type || null, lead.notes || null, req.user.id]);

    // Update lead status
    await db.query(
      "UPDATE leads SET status='quoted', quotation_id=$1, updated_at=NOW() WHERE id=$2",
      [quotation.id, lead.id]);

    res.json(quotation);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
