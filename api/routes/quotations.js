const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/quotations
router.get('/', async (req, res) => {
  try {
    const { status, project_id } = req.query;
    let q = `SELECT q.*, p.code AS project_code, p.name AS project_name,
      u.first_name || ' ' || u.last_name AS created_by_name
      FROM quotations q
      LEFT JOIN projects p ON q.project_id = p.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND q.status = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND q.project_id = $${params.length}`; }
    q += ' ORDER BY q.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/quotations/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [sq] } = await db.query(
      `SELECT q.*, p.code AS project_code, p.name AS project_name
       FROM quotations q LEFT JOIN projects p ON q.project_id = p.id
       WHERE q.id = $1 AND q.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!sq) return res.status(404).json({ error: 'Not found' });
    const { rows: items } = await db.query(
      'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY sort_order, id', [sq.id]);
    res.json({ ...sq, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/quotations
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate SQ number
    const now = new Date();
    const prefix = `SQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { rows: [last] } = await db.query(
      `SELECT sq_number FROM quotations WHERE sq_number LIKE $1 || '%' ORDER BY sq_number DESC LIMIT 1`, [prefix]);
    let seq = 1;
    if (last) { const parts = last.sq_number.split('-'); seq = parseInt(parts[2] || '0') + 1; }
    const sqNumber = `${prefix}-${String(seq).padStart(3, '0')}`;

    const { rows: [sq] } = await db.query(
      `INSERT INTO quotations (company_id, sq_number, booking_id, project_id,
        customer_name, customer_phone, customer_address, site_name, site_location,
        system_capacity, roof_type, roof_area, subtotal, discount_pct, discount_amt,
        vat_pct, vat_amt, grand_total, terms, validity_days, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [req.user.company_id, sqNumber, b.booking_id || null, b.project_id || null,
       b.customer_name || null, b.customer_phone || null, b.customer_address || null,
       b.site_name || null, b.site_location || null, b.system_capacity || null,
       b.roof_type || null, b.roof_area || null,
       b.subtotal || 0, b.discount_pct || 0, b.discount_amt || 0,
       b.vat_pct || 7, b.vat_amt || 0, b.grand_total || 0,
       b.terms || null, b.validity_days || 30, b.status || 'draft', b.notes || null,
       req.user.id]);

    // Insert items if provided
    if (b.items && b.items.length) {
      for (let i = 0; i < b.items.length; i++) {
        const it = b.items[i];
        await db.query(
          `INSERT INTO quotation_items (quotation_id, item_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [sq.id, it.item_id || null, it.item_code || null, it.item_name, it.qty || 1,
           it.unit || 'ea', it.unit_price || 0, it.total || 0, i]);
      }
    }
    res.status(201).json(sq);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/quotations/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM quotations WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const allowed = ['customer_name','customer_phone','customer_address','site_name','site_location',
      'system_capacity','roof_type','roof_area','subtotal','discount_pct','discount_amt',
      'vat_pct','vat_amt','grand_total','terms','validity_days','status','notes','project_id'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE quotations SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);

    // Replace items if provided
    if (req.body.items) {
      await db.query('DELETE FROM quotation_items WHERE quotation_id = $1', [req.params.id]);
      for (let i = 0; i < req.body.items.length; i++) {
        const it = req.body.items[i];
        await db.query(
          `INSERT INTO quotation_items (quotation_id, item_id, item_code, item_name, qty, unit, unit_price, total, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [req.params.id, it.item_id || null, it.item_code || null, it.item_name, it.qty || 1,
           it.unit || 'ea', it.unit_price || 0, it.total || 0, i]);
      }
    }
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE quotations SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
