const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/bids
router.get('/', async (req, res) => {
  try {
    const { project_id, status } = req.query;
    let q = `SELECT b.*, p.code AS project_code, p.name AS project_name,
      t.tender_number, t.title AS tender_title,
      u.first_name || ' ' || u.last_name AS created_by_name
      FROM bid_preparations b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN tenders t ON b.tender_id = t.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND b.status = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND b.project_id = $${params.length}`; }
    q += ' ORDER BY b.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/bids/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [bid] } = await db.query(
      `SELECT b.*, p.code AS project_code, p.name AS project_name,
        t.tender_number, t.title AS tender_title
       FROM bid_preparations b
       LEFT JOIN projects p ON b.project_id = p.id
       LEFT JOIN tenders t ON b.tender_id = t.id
       WHERE b.id = $1 AND b.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!bid) return res.status(404).json({ error: 'Not found' });
    const { rows: costItems } = await db.query(
      'SELECT * FROM bid_cost_items WHERE bid_id = $1 ORDER BY sort_order, id', [bid.id]);
    res.json({ ...bid, cost_items: costItems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bids
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate bid_number BD{YYMM}{0000}
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'BD', 'BD', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const bidNumber = `BD${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    // Calculate totals
    const materialCost = parseFloat(b.material_cost) || 0;
    const laborCost = parseFloat(b.labor_cost) || 0;
    const overheadCost = parseFloat(b.overhead_cost) || 0;
    const otherCost = parseFloat(b.other_cost) || 0;
    const totalCost = materialCost + laborCost + overheadCost + otherCost;
    const marginPercent = parseFloat(b.margin_percent) || 0;
    const marginAmount = totalCost * marginPercent / 100;
    const bidPrice = totalCost + marginAmount;

    const { rows: [bid] } = await db.query(
      `INSERT INTO bid_preparations (company_id, bid_number, project_id, tender_id,
        cost_material, cost_labor, cost_overhead, cost_other, total_cost,
        margin_percent, margin_amount, bid_price, remarks, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft',$14)
       RETURNING *`,
      [req.user.company_id, bidNumber, b.project_id || null, b.tender_id || null,
       materialCost, laborCost, overheadCost, otherCost, totalCost,
       marginPercent, marginAmount, bidPrice, b.remarks || null, req.user.id]);

    // Insert cost items
    if (b.cost_items && b.cost_items.length) {
      for (let i = 0; i < b.cost_items.length; i++) {
        const it = b.cost_items[i];
        await db.query(
          `INSERT INTO bid_cost_items (bid_id, category, description,
            quantity, unit_cost, total_cost, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [bid.id, it.category || 'material',
           it.description || it.item_name || null, it.quantity || 1,
           it.unit_cost || 0, it.total_cost || 0, i]);
      }
    }

    res.status(201).json(bid);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/bids/:id — update draft, auto-calc totals
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM bid_preparations WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'draft') return res.status(400).json({ error: 'Only draft bids can be updated' });

    const b = req.body;

    // Recalculate costs
    const materialCost = b.material_cost !== undefined ? parseFloat(b.material_cost) : parseFloat(existing.cost_material);
    const laborCost = b.labor_cost !== undefined ? parseFloat(b.labor_cost) : parseFloat(existing.cost_labor);
    const overheadCost = b.overhead_cost !== undefined ? parseFloat(b.overhead_cost) : parseFloat(existing.cost_overhead);
    const otherCost = b.other_cost !== undefined ? parseFloat(b.other_cost) : parseFloat(existing.cost_other);
    const totalCost = materialCost + laborCost + overheadCost + otherCost;
    const marginPercent = b.margin_percent !== undefined ? parseFloat(b.margin_percent) : parseFloat(existing.margin_percent);
    const marginAmount = totalCost * marginPercent / 100;
    const bidPrice = totalCost + marginAmount;

    const allowed = ['project_id','tender_id','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (b[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(b[f]); }
    }
    // Always update calculated fields
    sets.push(`cost_material = $${idx++}`); params.push(materialCost);
    sets.push(`cost_labor = $${idx++}`); params.push(laborCost);
    sets.push(`cost_overhead = $${idx++}`); params.push(overheadCost);
    sets.push(`cost_other = $${idx++}`); params.push(otherCost);
    sets.push(`total_cost = $${idx++}`); params.push(totalCost);
    sets.push(`margin_percent = $${idx++}`); params.push(marginPercent);
    sets.push(`margin_amount = $${idx++}`); params.push(marginAmount);
    sets.push(`bid_price = $${idx++}`); params.push(bidPrice);
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE bid_preparations SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);

    // Replace cost items if provided
    if (b.cost_items) {
      await db.query('DELETE FROM bid_cost_items WHERE bid_id = $1', [req.params.id]);
      for (let i = 0; i < b.cost_items.length; i++) {
        const it = b.cost_items[i];
        await db.query(
          `INSERT INTO bid_cost_items (bid_id, category, description,
            quantity, unit_cost, total_cost, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, it.category || 'material',
           it.description || it.item_name || null, it.quantity || 1,
           it.unit_cost || 0, it.total_cost || 0, i]);
      }
    }

    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/bids/:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM bid_preparations WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'draft') return res.status(400).json({ error: 'Only draft bids can be cancelled' });
    const { rows } = await db.query(
      "UPDATE bid_preparations SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bids/:id/submit
router.post('/:id/submit', async (req, res) => {
  try {
    const { rows: [bid] } = await db.query(
      'SELECT * FROM bid_preparations WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!bid) return res.status(404).json({ error: 'Not found' });
    if (bid.status !== 'draft') return res.status(400).json({ error: 'Only draft bids can be submitted' });
    const { rows } = await db.query(
      "UPDATE bid_preparations SET status='submitted', updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bids/:id/import-pr — import PR lines as bid cost items
router.post('/:id/import-pr', async (req, res) => {
  try {
    const { rows: [bid] } = await db.query(
      'SELECT * FROM bid_preparations WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!bid) return res.status(404).json({ error: 'Not found' });
    if (bid.status !== 'draft') return res.status(400).json({ error: 'Only draft bids can import PR lines' });

    const { pr_id } = req.body;
    if (!pr_id) return res.status(400).json({ error: 'pr_id required' });

    // Verify PR belongs to same company
    const { rows: [pr] } = await db.query(
      'SELECT * FROM purchase_requests WHERE id=$1 AND company_id=$2', [pr_id, req.user.company_id]);
    if (!pr) return res.status(404).json({ error: 'PR not found' });

    // Fetch PR lines
    const { rows: prLines } = await db.query(
      'SELECT * FROM pr_lines WHERE pr_id = $1 ORDER BY line_num', [pr_id]);

    if (!prLines.length) return res.status(400).json({ error: 'PR has no lines' });

    // Get current max sort_order
    const { rows: [maxSort] } = await db.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM bid_cost_items WHERE bid_id = $1', [bid.id]);
    let sortOrder = maxSort.max_sort + 1;

    const inserted = [];
    for (const line of prLines) {
      const desc = [line.item_code, line.item_name || line.description].filter(Boolean).join(' ');
      const { rows: [item] } = await db.query(
        `INSERT INTO bid_cost_items (bid_id, category, description,
          quantity, unit_cost, total_cost, sort_order, pr_line_id)
         VALUES ($1,'material',$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [bid.id, desc || null, line.quantity || 1,
         line.unit_price || 0, line.total_price || 0, sortOrder++, line.id]);
      inserted.push(item);
    }

    res.json({ imported: inserted.length, cost_items: inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
