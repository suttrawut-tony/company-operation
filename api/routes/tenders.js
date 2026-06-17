const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/tenders
router.get('/', async (req, res) => {
  try {
    const { project_id, status, tender_type } = req.query;
    let q = `SELECT t.*, p.code AS project_code, p.name AS project_name,
      u.first_name || ' ' || u.last_name AS created_by_name
      FROM tenders t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.company_id = $1`;
    const params = [req.user.company_id];
    if (status) { params.push(status); q += ` AND t.status = $${params.length}`; }
    if (project_id) { params.push(project_id); q += ` AND t.project_id = $${params.length}`; }
    if (tender_type) { params.push(tender_type); q += ` AND t.tender_type = $${params.length}`; }
    q += ' ORDER BY t.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tenders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: [tender] } = await db.query(
      `SELECT t.*, p.code AS project_code, p.name AS project_name
       FROM tenders t LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1 AND t.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!tender) return res.status(404).json({ error: 'Not found' });
    const { rows: items } = await db.query(
      'SELECT * FROM tender_items WHERE tender_id = $1 ORDER BY sort_order, id', [tender.id]);
    const { rows: vendors } = await db.query(
      'SELECT * FROM tender_vendors WHERE tender_id = $1 ORDER BY created_at', [tender.id]);
    res.json({ ...tender, items, vendors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tenders
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    // Auto-generate tender_number TD{YYMM}{0000}
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'TD', 'TD', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const tenderNumber = `TD${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [tender] } = await db.query(
      `INSERT INTO tenders (company_id, tender_number, project_id, title, tender_type,
        budget_amount, close_date, opening_date, evaluation_criteria, remarks, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11)
       RETURNING *`,
      [req.user.company_id, tenderNumber, b.project_id || null, b.title,
       b.tender_type || 'open', b.budget_amount || 0,
       b.close_date || null, b.opening_date || null,
       b.evaluation_criteria || null, b.remarks || null, req.user.id]);

    // Insert items
    if (b.items && b.items.length) {
      for (let i = 0; i < b.items.length; i++) {
        const it = b.items[i];
        await db.query(
          `INSERT INTO tender_items (tender_id, item_code, item_name, quantity, uom, estimated_price, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [tender.id, it.item_code || null, it.item_name,
           it.quantity || 1, it.uom || 'EA', it.estimated_price || 0, i]);
      }
    }

    // Insert vendors
    if (b.vendors && b.vendors.length) {
      for (const v of b.vendors) {
        await db.query(
          `INSERT INTO tender_vendors (tender_id, vendor_code, vendor_name, invited_date, status)
           VALUES ($1,$2,$3,NOW(),'invited')`,
          [tender.id, v.vendor_code || null, v.vendor_name]);
      }
    }

    res.status(201).json(tender);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/tenders/:id — update draft only (header fields + items/vendors)
router.put('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM tenders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    // Header fields can only be updated when draft
    const allowed = ['title','tender_type','budget_amount','close_date','opening_date',
      'evaluation_criteria','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        if (existing.status !== 'draft') return res.status(400).json({ error: 'Only draft tenders can update header fields' });
        sets.push(`${f} = $${idx++}`); params.push(req.body[f]);
      }
    }
    if (sets.length) {
      sets.push('updated_at = NOW()');
      params.push(req.params.id);
      await db.query(
        `UPDATE tenders SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    }

    // Replace items if provided (draft only)
    if (req.body.items && Array.isArray(req.body.items)) {
      if (existing.status !== 'draft') return res.status(400).json({ error: 'Only draft tenders can update items' });
      await db.query('DELETE FROM tender_items WHERE tender_id = $1', [req.params.id]);
      for (let i = 0; i < req.body.items.length; i++) {
        const it = req.body.items[i];
        await db.query(
          `INSERT INTO tender_items (tender_id, item_code, item_name, quantity, uom, estimated_price, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, it.item_code || null, it.item_name,
           it.quantity || 1, it.uom || 'EA', it.estimated_price || 0, i]);
      }
    }

    // Replace vendors if provided (allowed in draft, published, closed, evaluating for scoring)
    if (req.body.vendors && Array.isArray(req.body.vendors)) {
      if (existing.status === 'awarded' || existing.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot update vendors for awarded or cancelled tenders' });
      }
      await db.query('DELETE FROM tender_vendors WHERE tender_id = $1', [req.params.id]);
      for (const v of req.body.vendors) {
        await db.query(
          `INSERT INTO tender_vendors (tender_id, vendor_code, vendor_name, contact, status, total_price, scores, evaluation_score, invited_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [req.params.id, v.vendor_code || null, v.vendor_name || null,
           v.contact || null, v.status || 'invited',
           v.total_price || null, v.scores ? JSON.stringify(v.scores) : null,
           v.evaluation_score || v.score || null]);
      }
    }

    // Return updated tender with items and vendors
    const { rows: [tender] } = await db.query(
      'SELECT * FROM tenders WHERE id = $1', [req.params.id]);
    const { rows: items } = await db.query(
      'SELECT * FROM tender_items WHERE tender_id = $1 ORDER BY sort_order, id', [req.params.id]);
    const { rows: vendors } = await db.query(
      'SELECT * FROM tender_vendors WHERE tender_id = $1 ORDER BY created_at', [req.params.id]);
    res.json({ ...tender, items, vendors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tenders/:id — soft delete (draft only)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      'SELECT * FROM tenders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (existing.status !== 'draft') return res.status(400).json({ error: 'Only draft tenders can be cancelled' });
    const { rows } = await db.query(
      "UPDATE tenders SET status='cancelled', updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tenders/:id/publish
router.post('/:id/publish', async (req, res) => {
  try {
    const { rows: [tender] } = await db.query(
      'SELECT * FROM tenders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!tender) return res.status(404).json({ error: 'Not found' });
    if (tender.status !== 'draft') return res.status(400).json({ error: 'Only draft tenders can be published' });
    const { rows } = await db.query(
      "UPDATE tenders SET status='published', publish_date=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tenders/:id/close
router.post('/:id/close', async (req, res) => {
  try {
    const { rows: [tender] } = await db.query(
      'SELECT * FROM tenders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!tender) return res.status(404).json({ error: 'Not found' });
    if (tender.status !== 'published') return res.status(400).json({ error: 'Only published tenders can be closed' });
    const { rows } = await db.query(
      "UPDATE tenders SET status='closed', updated_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tenders/:id/evaluate — accept vendors[] with scores
router.post('/:id/evaluate', async (req, res) => {
  try {
    const { rows: [tender] } = await db.query(
      'SELECT * FROM tenders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!tender) return res.status(404).json({ error: 'Not found' });
    if (tender.status !== 'closed') return res.status(400).json({ error: 'Only closed tenders can be evaluated' });

    const { vendors } = req.body;
    if (!vendors || !vendors.length) return res.status(400).json({ error: 'vendors[] required' });

    for (const v of vendors) {
      await db.query(
        `UPDATE tender_vendors SET evaluation_score=$1,
          evaluation_notes=$2
         WHERE id=$3 AND tender_id=$4`,
        [v.total_score || v.evaluation_score || 0,
         v.evaluation_notes || null, v.id, tender.id]);
    }

    await db.query(
      "UPDATE tenders SET status='evaluating', updated_at=NOW() WHERE id=$1", [tender.id]);

    const { rows: updatedVendors } = await db.query(
      'SELECT * FROM tender_vendors WHERE tender_id = $1 ORDER BY evaluation_score DESC', [tender.id]);
    res.json({ status: 'evaluating', vendors: updatedVendors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tenders/:id/award — set awarded vendor, auto-create draft contract
router.post('/:id/award', async (req, res) => {
  try {
    const { rows: [tender] } = await db.query(
      'SELECT * FROM tenders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!tender) return res.status(404).json({ error: 'Not found' });
    if (tender.status !== 'evaluating' && tender.status !== 'closed') {
      return res.status(400).json({ error: 'Tender must be evaluating or closed before awarding' });
    }

    const { vendor_id } = req.body;
    if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });

    // Verify vendor belongs to this tender
    const { rows: [vendor] } = await db.query(
      'SELECT * FROM tender_vendors WHERE id=$1 AND tender_id=$2', [vendor_id, tender.id]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found in this tender' });

    // Update tender status
    await db.query(
      "UPDATE tenders SET status='awarded', awarded_vendor_code=$1, awarded_vendor_name=$2, awarded_amount=$3, updated_at=NOW() WHERE id=$4",
      [vendor.vendor_code, vendor.vendor_name, vendor.total_price || tender.budget_amount, tender.id]);

    // Auto-generate contract number
    const { rows: [cSeries] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'CT', 'CT', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const contractNumber = `CT${cSeries.year_month}${String(cSeries.current_number).padStart(4, '0')}`;

    // Auto-create draft contract
    const { rows: [contract] } = await db.query(
      `INSERT INTO contracts (company_id, contract_number, tender_id, project_id,
        counterparty_code, counterparty_name, contract_amount, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8)
       RETURNING *`,
      [req.user.company_id, contractNumber, tender.id, tender.project_id,
       vendor.vendor_code, vendor.vendor_name, vendor.total_price || tender.budget_amount, req.user.id]);

    res.json({ tender_status: 'awarded', awarded_vendor: vendor, contract });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
