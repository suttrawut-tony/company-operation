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

// FIXED: Merged duplicate PUT /:id into single route
router.put('/:id', async (req, res) => {
  try {
    const { rows: [po] } = await db.query('SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!po) return res.status(404).json({ error: 'Not found' });
    // SECURITY (P1-1): no status-only shortcut — status changes must go through /submit, /approve, /reject
    // Full edit: draft only
    if (po.status !== 'draft' && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'แก้ไขได้เฉพาะสถานะ draft' });
    }
    const fields = ['vendor_code','vendor_name','remarks','total_amount','tax_amount'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE purchase_orders SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/po/:id/submit — Submit PO for approval (with budget check)
router.post('/:id/submit', async (req, res) => {
  try {
    const { rows: [po] } = await db.query('SELECT * FROM purchase_orders WHERE id = $1 AND status = $2 AND company_id = $3', [req.params.id, 'draft', req.user.company_id]);
    if (!po) return res.status(400).json({ error: 'Cannot submit' });

    // Budget validation
    let budgetWarning = null;
    if (po.project_id) {
      const { rows: budgets } = await db.query(
        'SELECT * FROM budgets WHERE project_id = $1 AND status = $2', [po.project_id, 'approved']);
      if (budgets.length) {
        const budget = budgets[0];
        const approvedBudget = parseFloat(budget.total_budget || budget.total_amount || 0);
        const { rows: [usage] } = await db.query(
          `SELECT COALESCE(SUM(actual_amount), 0) AS total_actual,
                  COALESCE(SUM(committed_amount), 0) AS total_committed
           FROM budget_lines WHERE budget_id = $1`, [budget.id]);
        const totalUsed = parseFloat(usage.total_actual) + parseFloat(usage.total_committed) + parseFloat(po.total_amount);
        const usagePercent = approvedBudget > 0 ? (totalUsed / approvedBudget) * 100 : 0;
        const blockThreshold = parseFloat(budget.block_threshold || 100);
        const warnThreshold = parseFloat(budget.warn_threshold || 80);
        const controlMode = budget.control_mode || 'warn';

        if (controlMode === 'block' && usagePercent >= blockThreshold) {
          // Notify PM
          try {
            const { rows: [project] } = await db.query('SELECT pm_user_id, code FROM projects WHERE id = $1', [po.project_id]);
            if (project && project.pm_user_id) {
              await db.query(
                `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
                 VALUES ($1, $2, $3, $4, $5, 'PO', $6)`,
                [req.user.company_id, project.pm_user_id,
                 'PO ถูก Block — เกินงบประมาณ',
                 `${po.doc_number} (฿${parseFloat(po.total_amount).toLocaleString()}) ของโปรเจค ${project.code} ถูกบล็อค เนื่องจากงบจะเกิน ${usagePercent.toFixed(1)}% (เกณฑ์ ${blockThreshold}%)`,
                 'doc-detail.html?type=po&doc=' + po.doc_number, po.id]);
            }
          } catch(_) {}
          return res.status(400).json({
            error: 'Budget exceeded',
            detail: `PO นี้จะทำให้งบเกิน ${usagePercent.toFixed(1)}% (เกณฑ์บล็อค ${blockThreshold}%) — ไม่สามารถส่งอนุมัติได้`
          });
        }
        if (usagePercent >= warnThreshold) {
          budgetWarning = `งบประมาณเตือน: PO นี้จะทำให้ใช้งบ ${usagePercent.toFixed(1)}% (เกณฑ์เตือน ${warnThreshold}%)`;
          try {
            const { rows: [project] } = await db.query('SELECT pm_user_id, code FROM projects WHERE id = $1', [po.project_id]);
            if (project && project.pm_user_id) {
              await db.query(
                `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
                 VALUES ($1, $2, $3, $4, $5, 'PO', $6)`,
                [req.user.company_id, project.pm_user_id,
                 'PO เตือนงบประมาณ',
                 `${po.doc_number} (฿${parseFloat(po.total_amount).toLocaleString()}) ของโปรเจค ${project.code} — งบจะถึง ${usagePercent.toFixed(1)}%`,
                 'doc-detail.html?type=po&doc=' + po.doc_number, po.id]);
            }
          } catch(_) {}
        }
      }
    }

    const { rows } = await db.query(
      "UPDATE purchase_orders SET status='pending_manager' WHERE id=$1 RETURNING *", [req.params.id]);
    const result = rows[0];
    if (budgetWarning) result.budget_warning = budgetWarning;
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/po/:id/approve — Approve PO (tier logic based on amount)
router.post('/:id/approve', async (req, res) => {
  try {
    // Role check: only authorized roles can approve
    const allowedRoles = { pending_manager: ['pm','finance','executive','admin'], pending_finance: ['finance','executive','admin'], pending_executive: ['executive','admin'] };
    const { rows: [po] } = await db.query('SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (!po) return res.status(404).json({ error: 'Not found' });
    const rolesForTier = allowedRoles[po.status];
    if (!rolesForTier) return res.status(400).json({ error: 'Cannot approve at this step' });
    if (!rolesForTier.includes(req.user.role)) return res.status(403).json({ error: 'Not authorized to approve at this tier' });
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

    // When approved, update budget committed_amount
    if (nextStatus === 'approved' && po.project_id) {
      try {
        const { rows: budgets } = await db.query(
          'SELECT id FROM budgets WHERE project_id = $1 AND status = $2', [po.project_id, 'approved']);
        if (budgets.length) {
          await db.query(
            `UPDATE budget_lines SET committed_amount = COALESCE(committed_amount, 0) + $1
             WHERE budget_id = $2 AND id = (SELECT id FROM budget_lines WHERE budget_id = $2 ORDER BY sort_order LIMIT 1)`,
            [po.total_amount, budgets[0].id]);
        }
      } catch(_) {}
    }

    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/po/:id/reject — Reject PO back to draft
router.post('/:id/reject', async (req, res) => {
  try {
    if (!['pm','finance','executive','admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to reject' });
    }
    const { rows } = await db.query(
      "UPDATE purchase_orders SET status='draft' WHERE id=$1 AND company_id=$2 AND status IN ('pending_manager','pending_finance','pending_executive') RETURNING *",
      [req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Cannot reject' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Duplicate PUT /:id removed — merged into route above

// DELETE /api/po/:id — Cancel PO (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [po] } = await db.query('SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!po) return res.status(404).json({ error: 'Not found' });
    if (po.status !== 'draft' && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'ยกเลิกได้เฉพาะสถานะ draft' });
    }
    const { rows } = await db.query(
      "UPDATE purchase_orders SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/po/from-pr — Create PO(s) from approved PR lines, grouped by vendor
// Uses transaction: validate → group by vendor → create POs → update pr_lines.copied_qty → auto-close PR
router.post('/from-pr', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { pr_id, project_id, lines } = req.body;
    if (!pr_id || !lines || !lines.length) return res.status(400).json({ error: 'pr_id and lines required' });

    // Validate PR exists and is approved
    const { rows: [pr] } = await client.query(
      'SELECT * FROM purchase_requests WHERE id=$1 AND company_id=$2 AND status=$3',
      [pr_id, req.user.company_id, 'approved']);
    if (!pr) return res.status(400).json({ error: 'PR not found or not approved' });

    // Validate each line's copy_qty <= open_qty
    for (const line of lines) {
      const { rows: [pl] } = await client.query(
        'SELECT quantity, COALESCE(copied_qty,0) AS copied_qty FROM pr_lines WHERE id=$1 AND pr_id=$2',
        [line.pr_line_id, pr_id]);
      if (!pl) return res.status(400).json({ error: 'PR line ' + line.pr_line_id + ' not found' });
      const openQty = parseFloat(pl.quantity) - parseFloat(pl.copied_qty);
      if (parseFloat(line.copy_qty) > openQty) {
        return res.status(400).json({ error: 'Copy qty (' + line.copy_qty + ') exceeds open qty (' + openQty + ') for line ' + line.pr_line_id });
      }
    }

    // Group lines by vendor_code
    const vendorGroups = {};
    for (const line of lines) {
      const vk = line.vendor_code || 'NO_VENDOR';
      if (!vendorGroups[vk]) vendorGroups[vk] = { vendor_code: line.vendor_code, vendor_name: line.vendor_name, lines: [] };
      vendorGroups[vk].lines.push(line);
    }

    await client.query('BEGIN');

    const createdPOs = [];
    for (const [vk, group] of Object.entries(vendorGroups)) {
      // Generate PO number
      const { rows: [series] } = await client.query(
        `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
         VALUES ($1, 'PO', 'PO', to_char(NOW(), 'YYMM'), 1)
         ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
         RETURNING *`, [req.user.company_id]);
      const docNumber = 'PO' + series.year_month + String(series.current_number).padStart(4, '0');

      const totalAmount = group.lines.reduce((s, l) => s + (parseFloat(l.copy_qty) * parseFloat(l.unit_price || 0)), 0);

      // Create PO header
      const { rows: [po] } = await client.query(
        `INSERT INTO purchase_orders (company_id, project_id, pr_id, doc_number, vendor_code, vendor_name, total_amount, remarks, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [req.user.company_id, project_id || pr.project_id, pr_id, docNumber,
         group.vendor_code, group.vendor_name, totalAmount,
         'Created from ' + pr.doc_number, req.user.id]);

      // Create PO lines
      for (let i = 0; i < group.lines.length; i++) {
        const l = group.lines[i];
        await client.query(
          `INSERT INTO po_lines (po_id, line_num, item_code, item_name, quantity, uom, unit_price, total_price, sap_account, tax_code, pr_line_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [po.id, i + 1, l.item_code, l.item_name, l.copy_qty, l.uom || 'EA',
           l.unit_price, parseFloat(l.copy_qty) * parseFloat(l.unit_price || 0),
           l.sap_account, l.tax_code, l.pr_line_id]);

        // Update pr_lines.copied_qty
        await client.query(
          'UPDATE pr_lines SET copied_qty = COALESCE(copied_qty,0) + $1 WHERE id = $2',
          [l.copy_qty, l.pr_line_id]);
      }

      createdPOs.push({ po_id: po.id, po_number: docNumber, vendor: group.vendor_name, lines_count: group.lines.length, total: totalAmount });
    }

    // Check if all PR lines are fully copied → auto-close PR
    const { rows: [openCheck] } = await client.query(
      'SELECT COUNT(*) AS open_count FROM pr_lines WHERE pr_id=$1 AND quantity - COALESCE(copied_qty,0) > 0', [pr_id]);
    if (parseInt(openCheck.open_count) === 0) {
      await client.query("UPDATE purchase_requests SET status='closed', updated_at=NOW() WHERE id=$1", [pr_id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ created: createdPOs, pr_closed: parseInt(openCheck.open_count) === 0 });
    req.broadcast('po_created', { from_pr: pr.doc_number, count: createdPOs.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
