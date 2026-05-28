const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT po.*, u.first_name || ' ' || u.last_name AS creator_name
       FROM purchase_orders po LEFT JOIN users u ON po.created_by = u.id
       WHERE po.company_id = $1 ORDER BY po.created_at DESC`, [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: [po] } = await db.query('SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (!po) return res.status(404).json({ error: 'PO not found' });
    const { rows: lines } = await db.query('SELECT * FROM po_lines WHERE po_id = $1 ORDER BY line_num', [req.params.id]);

    // Document chain
    const chain = {};
    if (po.pr_id) {
      const { rows: prs } = await db.query('SELECT id, doc_number, status, total_amount FROM purchase_requests WHERE id = $1', [po.pr_id]);
      if (prs.length) chain.pr = prs[0];
    }
    const { rows: grpos } = await db.query('SELECT id, doc_number, status FROM goods_receipts WHERE po_id = $1', [po.id]);
    if (grpos.length) {
      chain.grpo = grpos[0];
      const { rows: invs } = await db.query('SELECT id, doc_number, status, total_amount FROM ap_invoices WHERE grpo_id = $1 OR po_id = $1', [grpos[0].id, po.id]);
      if (invs.length) chain.invoice = invs[0];
    }

    res.json({ ...po, lines, chain });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, pr_id, vendor_code, vendor_name, remarks, lines } = req.body;
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'PO', 'PO', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `PO${series.year_month}${String(series.current_number).padStart(4, '0')}`;
    const totalAmount = (lines || []).reduce((s, l) => s + (l.total_price || 0), 0);

    const { rows: [po] } = await db.query(
      `INSERT INTO purchase_orders (company_id, project_id, pr_id, doc_number, vendor_code, vendor_name, total_amount, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, project_id, pr_id, docNumber, vendor_code, vendor_name, totalAmount, remarks, req.user.id]);
    if (lines) {
      for (const [i, line] of lines.entries()) {
        await db.query(
          `INSERT INTO po_lines (po_id, line_num, item_code, item_name, quantity, uom, unit_price, total_price, sap_account, tax_code, received_qty, open_qty)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [po.id, i + 1, line.item_code, line.item_name, line.quantity, line.uom || 'EA', line.unit_price, line.total_price, line.sap_account, line.tax_code, 0, line.quantity]
        );
      }
    }
    res.status(201).json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/po/:id — Update PO status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      'UPDATE purchase_orders SET status=COALESCE($1,status) WHERE id=$2 AND company_id=$3 RETURNING *',
      [status, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/po/:id/submit — Submit PO for approval
router.post('/:id/submit', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE purchase_orders SET status='pending_manager' WHERE id=$1 AND status='draft' RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Cannot submit' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/po/:id/approve — Approve PO (tier logic based on amount)
router.post('/:id/approve', async (req, res) => {
  try {
    const { rows: [po] } = await db.query('SELECT * FROM purchase_orders WHERE id = $1', [req.params.id]);
    if (!po) return res.status(404).json({ error: 'Not found' });
    const amount = parseFloat(po.total_amount);
    let nextStatus;
    if (po.status === 'pending_manager') {
      nextStatus = amount > 10000 ? 'pending_finance' : 'approved';
    } else if (po.status === 'pending_finance') {
      nextStatus = amount > 100000 ? 'pending_executive' : 'approved';
    } else if (po.status === 'pending_executive') {
      nextStatus = 'approved';
    } else {
      return res.status(400).json({ error: 'Cannot approve at this step' });
    }
    const { rows } = await db.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *',
      [nextStatus, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/po/:id/reject — Reject PO back to draft
router.post('/:id/reject', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE purchase_orders SET status='draft' WHERE id=$1 AND status IN ('pending_manager','pending_finance','pending_executive') RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Cannot reject' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
