const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');

router.use(authenticate);

// GET /api/quotes — List quotes, optional ?pr_id= filter
router.get('/', async (req, res) => {
  try {
    const { pr_id } = req.query;
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT q.*, pr.doc_number AS pr_doc_number
             FROM vendor_quotes q
             LEFT JOIN purchase_requests pr ON q.pr_id = pr.id
             WHERE pr.company_id = $1`;
    const params = [req.user.company_id];
    if (projectIds !== null) {
      params.push(projectIds);
      params.push(req.user.id);
      q += ` AND (pr.project_id = ANY($${params.length - 1}) OR pr.created_by = $${params.length})`;
    }
    if (pr_id) {
      params.push(pr_id);
      q += ` AND q.pr_id = $${params.length}`;
    }
    q += ' ORDER BY q.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/quotes/:id — Get quote with lines
router.get('/:id', async (req, res) => {
  try {
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT q.* FROM vendor_quotes q
             LEFT JOIN purchase_requests pr ON q.pr_id = pr.id
             WHERE q.id = $1 AND pr.company_id = $2`;
    const params = [req.params.id, req.user.company_id];
    if (projectIds !== null) {
      params.push(projectIds);
      q += ` AND pr.project_id = ANY($${params.length})`;
    }
    const { rows: [quote] } = await db.query(q, params);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    const { rows: lines } = await db.query(
      'SELECT * FROM vendor_quote_lines WHERE quote_id = $1 ORDER BY id', [quote.id]);
    res.json({ ...quote, lines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/quotes — Create quote
router.post('/', async (req, res) => {
  try {
    const { pr_id, vendor_code, vendor_name, quote_date, valid_until, lines } = req.body;
    if (!pr_id) return res.status(400).json({ error: 'pr_id is required' });

    // Verify the PR exists and user has access
    const { rows: [pr] } = await db.query(
      'SELECT id FROM purchase_requests WHERE id = $1 AND company_id = $2',
      [pr_id, req.user.company_id]);
    if (!pr) return res.status(404).json({ error: 'PR not found' });

    const totalAmount = (lines || []).reduce((s, l) => s + ((l.unit_price || 0) * (l.quantity || 0)), 0);

    const { rows: [quote] } = await db.query(
      `INSERT INTO vendor_quotes (pr_id, vendor_code, vendor_name, quote_date, valid_until, total_amount, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7) RETURNING *`,
      [pr_id, vendor_code, vendor_name, quote_date, valid_until, totalAmount, req.user.id]);

    if (lines && lines.length) {
      for (const line of lines) {
        const lineTotal = (line.unit_price || 0) * (line.quantity || 0);
        await db.query(
          `INSERT INTO vendor_quote_lines (quote_id, item_code, item_name, quantity, unit_price, line_total, lead_days)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [quote.id, line.item_code, line.item_name, line.quantity, line.unit_price, lineTotal, line.lead_days]);
      }
    }

    res.status(201).json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/quotes/:id/select — Mark quote as selected, reject others for same PR
router.post('/:id/select', async (req, res) => {
  try {
    const { rows: [quote] } = await db.query(
      `SELECT q.* FROM vendor_quotes q
       LEFT JOIN purchase_requests pr ON q.pr_id = pr.id
       WHERE q.id = $1 AND pr.company_id = $2`,
      [req.params.id, req.user.company_id]);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Mark this quote as selected
    await db.query("UPDATE vendor_quotes SET status = 'selected' WHERE id = $1", [quote.id]);
    // Reject all other quotes for the same PR
    await db.query(
      "UPDATE vendor_quotes SET status = 'rejected' WHERE pr_id = $1 AND id != $2 AND status = 'pending'",
      [quote.pr_id, quote.id]);

    const { rows: [updated] } = await db.query('SELECT * FROM vendor_quotes WHERE id = $1', [quote.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/quotes/:id/reject — Mark quote as rejected
router.post('/:id/reject', async (req, res) => {
  try {
    const { rows: [quote] } = await db.query(
      `SELECT q.* FROM vendor_quotes q
       LEFT JOIN purchase_requests pr ON q.pr_id = pr.id
       WHERE q.id = $1 AND pr.company_id = $2`,
      [req.params.id, req.user.company_id]);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const { rows: [updated] } = await db.query(
      "UPDATE vendor_quotes SET status = 'rejected' WHERE id = $1 RETURNING *", [quote.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added PUT /:id
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['vendor_name','amount','currency','validity_days','delivery_days','notes','status'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) { if (req.body[f] !== undefined) { sets.push(`${f}=$${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at=NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE vendor_quotes SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query("UPDATE vendor_quotes SET status='cancelled' WHERE id=$1 RETURNING *", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
