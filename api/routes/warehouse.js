const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
router.use(authenticate);

// ═══ List warehouses ═══
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT w.*,
              COALESCE(s.item_count, 0)::int AS item_count,
              COALESCE(s.total_qty, 0) AS total_qty
       FROM warehouses w
       LEFT JOIN (
         SELECT warehouse_id, COUNT(*)::int AS item_count, SUM(quantity) AS total_qty
         FROM warehouse_stock GROUP BY warehouse_id
       ) s ON s.warehouse_id = w.id
       WHERE w.company_id = $1
       ORDER BY w.code`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Single warehouse with stock summary ═══
router.get('/:id', async (req, res) => {
  try {
    const { rows: [wh] } = await db.query(
      'SELECT * FROM warehouses WHERE id=$1 AND company_id=$2',
      [req.params.id, req.user.company_id]
    );
    if (!wh) return res.status(404).json({ error: 'Not found' });
    res.json(wh);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Stock items in a warehouse ═══
router.get('/:id/stock', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ws.id, ws.item_id, ws.quantity, ws.min_quantity, ws.last_updated,
              i.item_code, i.item_name, i.item_name_th, i.category, i.uom
       FROM warehouse_stock ws
       JOIN items i ON i.id = ws.item_id
       WHERE ws.warehouse_id = $1 AND ws.company_id = $2
       ORDER BY i.item_code`,
      [req.params.id, req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Create warehouse ═══
router.post('/', requireRole('executive','admin','procurement'), async (req, res) => {
  try {
    const { code, name, location } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Code and name required' });
    const { rows } = await db.query(
      'INSERT INTO warehouses (company_id, code, name, location) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.company_id, code, name, location || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Warehouse code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ═══ Update warehouse ═══
router.put('/:id', requireRole('executive','admin','procurement'), async (req, res) => {
  try {
    const { name, location, status } = req.body;
    const { rows } = await db.query(
      `UPDATE warehouses SET name=COALESCE($1,name), location=COALESCE($2,location), status=COALESCE($3,status)
       WHERE id=$4 AND company_id=$5 RETURNING *`,
      [name, location, status, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Add/Update stock entry ═══
router.post('/:id/stock', requireRole('executive','admin','procurement'), async (req, res) => {
  try {
    const { item_id, quantity, min_quantity } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id required' });
    const qty = parseFloat(quantity) || 0;
    const minQty = parseFloat(min_quantity) || 0;
    const { rows } = await db.query(
      `INSERT INTO warehouse_stock (company_id, warehouse_id, item_id, quantity, min_quantity, last_updated)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (warehouse_id, item_id) DO UPDATE
       SET quantity = $4, min_quantity = $5, last_updated = NOW()
       RETURNING *`,
      [req.user.company_id, req.params.id, item_id, qty, minQty]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
