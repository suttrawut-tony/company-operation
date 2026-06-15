const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');

router.use(authenticate);

// GET / — List goods receipts (filtered by project access)
router.get('/', async (req, res) => {
  try {
    const { project_id, status } = req.query;
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT gr.*, u.first_name || ' ' || u.last_name AS creator_name
             FROM goods_receipts gr LEFT JOIN users u ON gr.created_by = u.id
             WHERE gr.company_id = $1`;
    const params = [req.user.company_id];
    if (projectIds !== null) {
      params.push(projectIds);
      params.push(req.user.id);
      q += ` AND (gr.project_id = ANY($${params.length - 1}) OR gr.created_by = $${params.length})`;
    }
    if (project_id) { params.push(project_id); q += ` AND gr.project_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND gr.status = $${params.length}`; }
    q += ' ORDER BY gr.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /:id — Get GRPO detail with lines
router.get('/:id', async (req, res) => {
  try {
    const projectIds = await getUserProjectIds(req.user);
    let q = 'SELECT * FROM goods_receipts WHERE id = $1';
    const params = [req.params.id];
    if (projectIds !== null) { params.push(projectIds); q += ` AND project_id = ANY($${params.length})`; }
    const { rows: [grpo] } = await db.query(q, params);
    if (!grpo) return res.status(404).json({ error: 'GRPO not found' });
    const { rows: lines } = await db.query('SELECT * FROM grpo_lines WHERE grpo_id = $1 ORDER BY line_num', [grpo.id]);

    // Document chain
    const chain = {};
    if (grpo.po_id) {
      const { rows: pos } = await db.query('SELECT id, doc_number, status, total_amount FROM purchase_orders WHERE id = $1', [grpo.po_id]);
      if (pos.length) {
        chain.po = pos[0];
        if (pos[0].pr_id) {
          const { rows: prs } = await db.query('SELECT id, doc_number, status FROM purchase_requests WHERE id = $1', [pos[0].pr_id]);
          if (prs.length) chain.pr = prs[0];
        }
      }
    }
    const { rows: invs } = await db.query('SELECT id, doc_number, status, total_amount FROM ap_invoices WHERE grpo_id = $1', [grpo.id]);
    if (invs.length) chain.invoice = invs[0];

    res.json({ ...grpo, lines, chain });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST / — Create GRPO from PO
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { po_id, lines, warehouse, remarks } = req.body;

    // Fetch PO
    const { rows: [po] } = await client.query('SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2', [po_id, req.user.company_id]);
    if (!po) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'PO not found' }); }

    // Generate doc number
    const { rows: [series] } = await client.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'GR', 'GR', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `GR${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    // Create GRPO header
    const { rows: [grpo] } = await client.query(
      `INSERT INTO goods_receipts (company_id, project_id, po_id, doc_number, vendor_code, vendor_name, warehouse, remarks, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'posted',$9) RETURNING *`,
      [req.user.company_id, po.project_id, po.id, docNumber, po.vendor_code, po.vendor_name, warehouse, remarks, req.user.id]);

    // Process each line
    for (const [i, line] of (lines || []).entries()) {
      // Fetch PO line details
      const { rows: [poLine] } = await client.query('SELECT * FROM po_lines WHERE id = $1 AND po_id = $2', [line.po_line_id, po_id]);
      if (!poLine) { await client.query('ROLLBACK'); return res.status(400).json({ error: `PO line ${line.po_line_id} not found` }); }

      // Validate received qty does not exceed open qty
      const openQty = parseFloat(poLine.open_qty || poLine.quantity);
      if (line.received_qty > openQty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Received qty (${line.received_qty}) exceeds open qty (${openQty}) for line ${poLine.line_num}` });
      }

      // Insert GRPO line (copy item details from PO line)
      await client.query(
        `INSERT INTO grpo_lines (grpo_id, line_num, po_line_id, item_code, item_name, received_qty, uom, unit_price, total_price, warehouse)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [grpo.id, i + 1, poLine.id, poLine.item_code, poLine.item_name, line.received_qty,
         poLine.uom, poLine.unit_price, line.received_qty * parseFloat(poLine.unit_price), warehouse]);

      // Update PO line received_qty and open_qty
      await client.query(
        `UPDATE po_lines SET received_qty = COALESCE(received_qty, 0) + $1,
                             open_qty = COALESCE(open_qty, quantity) - $1
         WHERE id = $2`,
        [line.received_qty, poLine.id]);
    }

    await client.query('COMMIT');
    res.status(201).json(grpo);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /:id/cancel — Cancel GRPO and reverse received_qty on PO lines
router.post('/:id/cancel', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [grpo] } = await client.query('SELECT * FROM goods_receipts WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (!grpo) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'GRPO not found' }); }
    if (grpo.status === 'cancelled') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'GRPO is already cancelled' }); }

    // Reverse received_qty on PO lines
    const { rows: grpoLines } = await client.query('SELECT * FROM grpo_lines WHERE grpo_id = $1', [grpo.id]);
    for (const line of grpoLines) {
      if (line.po_line_id) {
        await client.query(
          `UPDATE po_lines SET received_qty = COALESCE(received_qty, 0) - $1,
                               open_qty = COALESCE(open_qty, 0) + $1
           WHERE id = $2`,
          [line.received_qty, line.po_line_id]);
      }
    }

    // Update GRPO status
    const { rows: [updated] } = await client.query(
      `UPDATE goods_receipts SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`, [grpo.id]);

    await client.query('COMMIT');
    res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// FIXED: Added PUT /:id for editing draft GRPO
router.put('/:id', async (req, res) => {
  try {
    const { rows: [grpo] } = await db.query('SELECT * FROM goods_receipts WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!grpo) return res.status(404).json({ error: 'Not found' });
    if (grpo.status !== 'draft') return res.status(400).json({ error: 'Can only edit draft GRPO' });
    const allowed = ['remarks','received_date','warehouse_code'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) { if (req.body[f] !== undefined) { sets.push(`${f}=$${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at=NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE goods_receipts SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
