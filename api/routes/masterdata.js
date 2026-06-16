const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
router.use(authenticate);

// ═══ Items ═══
router.get('/items', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM items WHERE company_id=$1 ORDER BY item_code', [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/items', requireRole('executive','admin','procurement'), async (req, res) => {
  try {
    const { item_code, item_name, item_name_th, description, category, uom, unit_price, gl_account, tax_code, expiry_date, quantity_on_hand, has_warranty, warranty_months, warranty_terms } = req.body;
    if (!item_code || !item_name) return res.status(400).json({ error: 'Code and name required' });
    const { rows } = await db.query(
      'INSERT INTO items (company_id, item_code, item_name, item_name_th, description, category, uom, unit_price, gl_account, tax_code, expiry_date, quantity_on_hand, has_warranty, warranty_months, warranty_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *',
      [req.user.company_id, item_code, item_name, item_name_th||'', description||null, category||'material', uom||'EA', unit_price||0, gl_account||'114101', tax_code||'IG07', expiry_date||null, parseFloat(quantity_on_hand)||0, !!has_warranty, parseInt(warranty_months)||0, warranty_terms||null]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/items/:id', requireRole('executive','admin','procurement'), async (req, res) => {
  try {
    const { item_name, item_name_th, description, category, uom, unit_price, gl_account, tax_code, is_active, expiry_date, quantity_on_hand, has_warranty, warranty_months, warranty_terms } = req.body;
    const { rows } = await db.query(
      `UPDATE items SET item_name=COALESCE($1,item_name), item_name_th=COALESCE($2,item_name_th), category=COALESCE($3,category), uom=COALESCE($4,uom), unit_price=COALESCE($5,unit_price), gl_account=COALESCE($6,gl_account), tax_code=COALESCE($7,tax_code), is_active=COALESCE($8,is_active),
         description=COALESCE($9,description), expiry_date=COALESCE($10,expiry_date), quantity_on_hand=COALESCE($11,quantity_on_hand),
         has_warranty=COALESCE($12,has_warranty), warranty_months=COALESCE($13,warranty_months), warranty_terms=COALESCE($14,warranty_terms)
       WHERE id=$15 AND company_id=$16 RETURNING *`,
      [item_name, item_name_th, category, uom, unit_price, gl_account, tax_code, is_active,
       description===undefined?null:description, expiry_date===undefined?null:expiry_date, quantity_on_hand===undefined?null:(parseFloat(quantity_on_hand)||0),
       has_warranty===undefined?null:!!has_warranty, warranty_months===undefined?null:(parseInt(warranty_months)||0), warranty_terms===undefined?null:warranty_terms,
       req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Business Partners ═══
router.get('/bp', async (req, res) => {
  try {
    const { type } = req.query;
    let q = 'SELECT * FROM business_partners WHERE company_id=$1';
    const params = [req.user.company_id];
    if (type) { params.push(type); q += ' AND bp_type=$' + params.length; }
    q += ' ORDER BY bp_code';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bp', requireRole('executive','admin','procurement'), async (req, res) => {
  try {
    const { bp_code, bp_name, bp_name_th, bp_type, contact_person, phone, email, address, tax_id, payment_terms, bank_name, bank_account, gl_account } = req.body;
    if (!bp_code || !bp_name) return res.status(400).json({ error: 'Code and name required' });
    const { rows } = await db.query(
      'INSERT INTO business_partners (company_id, bp_code, bp_name, bp_name_th, bp_type, contact_person, phone, email, address, tax_id, payment_terms, bank_name, bank_account, gl_account) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
      [req.user.company_id, bp_code, bp_name, bp_name_th||'', bp_type||'vendor', contact_person||'', phone||'', email||'', address||'', tax_id||'', payment_terms||30, bank_name||'', bank_account||'', gl_account||'211301']);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/bp/:id', requireRole('executive','admin','procurement'), async (req, res) => {
  try {
    const { bp_name, bp_name_th, contact_person, phone, email, address, tax_id, payment_terms, bank_name, bank_account, gl_account, is_active } = req.body;
    const { rows } = await db.query(
      'UPDATE business_partners SET bp_name=COALESCE($1,bp_name), bp_name_th=COALESCE($2,bp_name_th), contact_person=COALESCE($3,contact_person), phone=COALESCE($4,phone), email=COALESCE($5,email), address=COALESCE($6,address), tax_id=COALESCE($7,tax_id), payment_terms=COALESCE($8,payment_terms), bank_name=COALESCE($9,bank_name), bank_account=COALESCE($10,bank_account), gl_account=COALESCE($11,gl_account), is_active=COALESCE($12,is_active) WHERE id=$13 AND company_id=$14 RETURNING *',
      [bp_name, bp_name_th, contact_person, phone, email, address, tax_id, payment_terms, bank_name, bank_account, gl_account, is_active, req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added GET /items/:id
router.get('/items/:id', async (req, res) => {
  try {
    const { rows: [item] } = await db.query('SELECT * FROM items WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added DELETE /items/:id (soft delete)
router.delete('/items/:id', requireRole('executive','admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE items SET is_active=false WHERE id=$1 AND company_id=$2 RETURNING *',
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added GET /bp/:id
router.get('/bp/:id', async (req, res) => {
  try {
    const { rows: [bp] } = await db.query('SELECT * FROM business_partners WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!bp) return res.status(404).json({ error: 'Not found' });
    res.json(bp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added DELETE /bp/:id (soft delete)
router.delete('/bp/:id', requireRole('executive','admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE business_partners SET is_active=false WHERE id=$1 AND company_id=$2 RETURNING *',
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
