const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds, checkPermission } = require('../middleware/auth');
router.use(authenticate);

// Helper: run multi-step operations inside a transaction
async function withTransaction(fn) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ═══ Static routes MUST come before /:id routes ═══

// GET /api/advance/banks/list
router.get('/banks/list', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM bank_accounts WHERE company_id = $1 AND is_active = true ORDER BY code',
      [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/advance/journal/:id
router.get('/journal/:id', async (req, res) => {
  try {
    const { rows: [journal] } = await db.query('SELECT * FROM gl_journals WHERE id = $1', [req.params.id]);
    if (!journal) return res.status(404).json({ error: 'Not found' });
    const { rows: lines } = await db.query(
      'SELECT * FROM gl_journal_lines WHERE journal_id = $1 ORDER BY line_num', [req.params.id]);
    res.json({ ...journal, lines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/advance/dashboard/overdue
router.get('/dashboard/overdue', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.*, u.first_name || ' ' || u.last_name AS employee_name,
             p.code AS project_code,
             (CURRENT_DATE - a.due_date) AS days_overdue
      FROM advance_requests a
      LEFT JOIN users u ON a.employee_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.company_id = $1
        AND a.advance_type = 'advance'
        AND (a.status = 'overdue' OR (a.status = 'paid' AND a.due_date IS NOT NULL AND a.due_date <= CURRENT_DATE))
      ORDER BY a.due_date ASC`, [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/advance/report/aging
router.get('/report/aging', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS employee_name,
       p.code AS project_code,
       EXTRACT(DAY FROM NOW() - a.created_at) AS days_outstanding
       FROM advance_requests a
       LEFT JOIN users u ON a.employee_id = u.id
       LEFT JOIN projects p ON a.project_id = p.id
       WHERE a.company_id = $1 AND a.status IN ('paid','settling') AND a.balance > 0
       ORDER BY a.created_at ASC`,
      [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance/settlement/:id/approve
router.post('/settlement/:id/approve', async (req, res) => {
  try {
    if (!['finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Finance can approve clearing' });
    }
    const { rows: [s] } = await db.query('SELECT * FROM advance_settlements WHERE id=$1', [req.params.id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (s.status !== 'pending_finance') return res.status(400).json({ error: 'Cannot approve at this step' });

    const result = await withTransaction(async (client) => {
      const { rows: [adv] } = await client.query('SELECT * FROM advance_requests WHERE id=$1', [s.advance_id]);
      const { rows: sLines } = await client.query('SELECT * FROM settlement_lines WHERE settlement_id=$1 ORDER BY sort_order', [s.id]);
      const totalExpense = parseFloat(s.total_expense);
      const difference = parseFloat(s.difference);

      const { rows: [journal] } = await client.query(
        `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
         VALUES ($1,'advance_settle',$2,$3,$4,$5,$5,$6) RETURNING *`,
        [req.user.company_id, s.id, s.doc_number, 'Clear - ' + (adv?.doc_number||''), totalExpense, req.user.id]);

      let lineNum = 1;
      const catAccounts = { travel:'522601', food:'522603', accommodation:'522602', transport:'522701', material:'511120', misc:'522709' };
      for (const l of sLines) {
        const glAcct = l.sap_account || catAccounts[l.category] || '522709';
        await client.query(
          'INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES ($1,$2,$3,$4,$5,0,$6)',
          [journal.id, lineNum++, glAcct, l.description || l.category, parseFloat(l.amount), s.doc_number]);
      }
      const { rows: [emp] } = await client.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv?.employee_id]);
      await client.query(
        'INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES ($1,$2,$3,$4,0,$5,$6)',
        [journal.id, lineNum++, '113103', 'Employee Receivable - ' + (emp?.name||''), totalExpense, s.doc_number]);

      const { rows } = await client.query(
        'UPDATE advance_settlements SET status=$1, approved_by=$2, approved_at=NOW(), journal_id=$3 WHERE id=$4 RETURNING *',
        ['approved', req.user.id, journal.id, req.params.id]);

      if (difference === 0) {
        await client.query("UPDATE advance_requests SET status='settled', updated_at=NOW() WHERE id=$1", [s.advance_id]);
      }
      return rows[0];
    });

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance/settlement/:id/reject — Finance rejects settlement
router.post('/settlement/:id/reject', async (req, res) => {
  try {
    if (!['finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Finance can reject clearing' });
    }
    const { reason } = req.body;
    const { rows: [s] } = await db.query('SELECT * FROM advance_settlements WHERE id=$1', [req.params.id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (s.status !== 'pending_finance') return res.status(400).json({ error: 'Can only reject pending settlements' });

    await withTransaction(async (client) => {
      // Reject settlement
      await client.query(
        "UPDATE advance_settlements SET status='rejected', remarks=COALESCE(remarks,'') || ' [Rejected: ' || $1 || ']' WHERE id=$2",
        [reason || 'No reason', req.params.id]);

      // Revert advance: undo settled_amount and balance, set back to 'paid'
      const totalExpense = parseFloat(s.total_expense);
      await client.query(
        "UPDATE advance_requests SET status='paid', settled_amount=GREATEST(0, settled_amount-$1), balance=paid_amount-GREATEST(0, settled_amount-$1), updated_at=NOW() WHERE id=$2",
        [totalExpense, s.advance_id]);
    });

    res.json({ rejected: true, settlement_id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Advance Requests ═══

// GET /api/advance — List advance requests
router.get('/', async (req, res) => {
  try {
    const projectIds = await getUserProjectIds(req.user);
    let q = `SELECT a.*, u.first_name || ' ' || u.last_name AS employee_name,
             COALESCE(u.first_name_th,'') || ' ' || COALESCE(u.last_name_th,'') AS employee_name_th,
             u.bank_name AS employee_bank, u.bank_account AS employee_bank_account,
             p.code AS project_code, p.name AS project_name,
             CASE WHEN a.advance_type = 'advance' AND a.status IN ('paid','overdue','settling') AND a.due_date IS NOT NULL
               THEN (a.due_date - CURRENT_DATE) ELSE NULL END AS days_remaining,
             CASE WHEN a.status = 'overdue' THEN true
               WHEN a.advance_type = 'advance' AND a.status = 'paid' AND a.due_date IS NOT NULL AND a.due_date < CURRENT_DATE THEN true
               ELSE false END AS is_overdue,
             (SELECT s.status FROM advance_settlements s WHERE s.advance_id = a.id ORDER BY s.created_at DESC LIMIT 1) AS clear_status
             FROM advance_requests a
             LEFT JOIN users u ON a.employee_id = u.id
             LEFT JOIN projects p ON a.project_id = p.id
             WHERE a.company_id = $1`;
    const params = [req.user.company_id];
    if (projectIds !== null) { params.push(projectIds); params.push(req.user.id); q += ` AND (a.project_id = ANY($${params.length-1}) OR a.employee_id = $${params.length})`; }
    if (req.query.project_id) { params.push(req.query.project_id); q += ` AND a.project_id = $${params.length}`; }
    if (req.query.status) { params.push(req.query.status); q += ` AND a.status = $${params.length}`; }
    if (req.query.employee_id) { params.push(req.query.employee_id); q += ` AND a.employee_id = $${params.length}`; }
    if (req.query.type) { params.push(req.query.type); q += ` AND a.advance_type = $${params.length}`; }
    if (req.query.status === 'overdue') { q += ` AND (a.status = 'overdue' OR (a.advance_type = 'advance' AND a.status = 'paid' AND a.due_date IS NOT NULL AND a.due_date < CURRENT_DATE))`; }
    q += ' ORDER BY a.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/advance/:id — Get advance with payments & settlements
router.get('/:id', async (req, res) => {
  try {
    const { rows: [adv] } = await db.query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS employee_name,
       p.code AS project_code
       FROM advance_requests a LEFT JOIN users u ON a.employee_id = u.id
       LEFT JOIN projects p ON a.project_id = p.id
       WHERE a.id = $1 AND a.company_id = $2`, [req.params.id, req.user.company_id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });

    const { rows: payments } = await db.query(
      `SELECT p.*, u.first_name || ' ' || u.last_name AS paid_by_name
       FROM advance_payments p LEFT JOIN users u ON p.paid_by = u.id
       WHERE p.advance_id = $1 ORDER BY p.payment_date`, [adv.id]);

    const { rows: settlements } = await db.query(
      'SELECT * FROM advance_settlements WHERE advance_id = $1 ORDER BY doc_date', [adv.id]);
    for (const s of settlements) {
      const { rows: lines } = await db.query(
        'SELECT * FROM settlement_lines WHERE settlement_id = $1 ORDER BY sort_order', [s.id]);
      s.lines = lines;
    }

    res.json({ ...adv, payments, settlements });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance — Create advance request
router.post('/', async (req, res) => {
  try {
    const { project_id, amount, description, purpose, employee_id, travel_id, advance_type, receipt_lines } = req.body;
    const type = (advance_type === 'reimburse') ? 'reimburse' : 'advance';
    const empId = employee_id || req.user.id;

    // Overdue lock: block if employee has overdue advances
    const { rows: overdueCheck } = await db.query(
      `SELECT id, doc_number FROM advance_requests
       WHERE employee_id = $1 AND (status = 'overdue' OR (advance_type = 'advance' AND status = 'paid' AND due_date IS NOT NULL AND due_date < CURRENT_DATE))
       LIMIT 5`, [empId]);
    if (overdueCheck.length > 0) {
      return res.status(403).json({
        error: 'OVERDUE_LOCK',
        message: 'ไม่สามารถสร้างรายการใหม่ได้ คุณมีเงินทดรองจ่ายที่เกินกำหนดเคลียร์ กรุณาเคลียร์ให้เสร็จก่อน',
        overdue_requests: overdueCheck
      });
    }

    // Reimburse requires receipt lines
    if (type === 'reimburse' && (!receipt_lines || !receipt_lines.length)) {
      return res.status(400).json({ error: 'Reimburse requires at least 1 receipt line' });
    }

    // Auto doc number
    const prefix = type === 'reimburse' ? 'RMB' : 'ADV';
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, $2, $2, to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id, prefix]);
    const docNumber = `${prefix}${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [adv] } = await db.query(
      `INSERT INTO advance_requests (company_id, project_id, doc_number, employee_id, amount, description, purpose, travel_id, advance_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.company_id, project_id || null, docNumber, empId,
       amount, description, purpose || null, travel_id || null, type, req.user.id]);

    // If reimburse, auto-create settlement record with receipt lines
    let settlement = null;
    if (type === 'reimburse' && receipt_lines && receipt_lines.length) {
      const { rows: [clrSeries] } = await db.query(
        `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
         VALUES ($1, 'CLR', 'CLR', to_char(NOW(), 'YYMM'), 1)
         ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
         RETURNING *`, [req.user.company_id]);
      const clrNumber = `CLR${clrSeries.year_month}${String(clrSeries.current_number).padStart(4, '0')}`;
      const totalExpense = receipt_lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

      const { rows: [s] } = await db.query(
        `INSERT INTO advance_settlements (advance_id, doc_number, total_expense, advance_amount, difference, settlement_type, status, remarks, submitted_by)
         VALUES ($1,$2,$3,$4,$5,'reimburse','draft',$6,$7) RETURNING *`,
        [adv.id, clrNumber, totalExpense, parseFloat(amount), totalExpense - parseFloat(amount), 'Auto-created with reimburse request', req.user.id]);

      for (let i = 0; i < receipt_lines.length; i++) {
        const l = receipt_lines[i];
        await db.query(
          `INSERT INTO settlement_lines (settlement_id, description, category, amount, receipt_date, receipt_number, has_receipt, sap_account, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8)`,
          [s.id, l.description, l.category || 'misc', l.amount, l.receipt_date || null,
           l.receipt_number || null, l.sap_account || '522709', i + 1]);
      }
      settlement = s;
    }

    res.status(201).json({ ...adv, settlement });
    req.broadcast('advance_created', { doc_number: docNumber });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/advance/:id — Edit advance request (draft/pending only)
router.put('/:id', async (req, res) => {
  try {
    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'staff' && adv.created_by !== req.user.id) {
      return res.status(403).json({ error: 'PERMISSION_DENIED', message: 'คุณไม่มีสิทธิ์แก้ไขรายการนี้' });
    }
    if (!['draft','pending_manager','pending_finance','pending_executive'].includes(adv.status) && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'ไม่สามารถแก้ไขรายการที่สถานะ ' + adv.status });
    }
    const fields = ['description','amount','purpose','project_id','employee_id','remarks'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await db.query(`UPDATE advance_requests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/advance/:id — Cancel advance (soft delete, draft only)
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'staff' && adv.created_by !== req.user.id) {
      return res.status(403).json({ error: 'PERMISSION_DENIED', message: 'คุณไม่มีสิทธิ์ลบรายการนี้' });
    }
    if (adv.status !== 'draft' && req.user.role !== 'executive') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'ลบได้เฉพาะสถานะ draft' });
    }
    const { rows } = await db.query(
      "UPDATE advance_requests SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *", [req.params.id]);
    res.json({ cancelled: true, ...rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance/:id/submit
router.post('/:id/submit', async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE advance_requests SET status='pending_manager', updated_at=NOW() WHERE id=$1 AND status='draft' AND company_id=$2 RETURNING *",
      [req.params.id, req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot submit' });
    res.json(rows[0]);
    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    if (!['pm','finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1', [req.params.id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });
    const amount = parseFloat(adv.amount);
    let next;
    if (adv.status === 'pending_manager') next = amount > 10000 ? 'pending_finance' : 'approved';
    else if (adv.status === 'pending_finance') next = amount > 100000 ? 'pending_executive' : 'approved';
    else if (adv.status === 'pending_executive') next = 'approved';
    else return res.status(400).json({ error: 'Cannot approve at this step' });

    const { rows } = await db.query(
      'UPDATE advance_requests SET status=$1, approved_by=$2, approved_at=NOW(), updated_at=NOW() WHERE id=$3 RETURNING *',
      [next, req.user.id, req.params.id]);
    res.json(rows[0]);
    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await db.query(
      "UPDATE advance_requests SET status='draft', remarks=$1, updated_at=NOW() WHERE id=$2 AND status LIKE 'pending_%' RETURNING *",
      [reason || '', req.params.id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot reject' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Payments (Finance records payment) ═══

// POST /api/advance/:id/pay
router.post('/:id/pay', async (req, res) => {
  try {
    if (!['finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only finance can record payment' });
    }
    const { amount, payment_method, bank_account_id, reference, remarks, payment_date } = req.body;

    // Validate required fields
    if (!payment_method) return res.status(400).json({ error: 'payment_method is required' });
    if (!reference) return res.status(400).json({ error: 'reference is required' });

    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1', [req.params.id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });
    if (adv.status !== 'approved' && adv.status !== 'paid') return res.status(400).json({ error: 'Must be approved first' });

    const payAmt = amount ? parseFloat(amount) : parseFloat(adv.amount);
    const alreadyPaid = parseFloat(adv.paid_amount || 0);
    const approvedAmt = parseFloat(adv.amount);
    if (payAmt <= 0) return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    if (alreadyPaid + payAmt > approvedAmt * 1.001) {
      return res.status(400).json({ error: `Payment would exceed approved amount. Approved: ${approvedAmt}, Already paid: ${alreadyPaid}, Attempting: ${payAmt}` });
    }
    const payDate = payment_date || new Date().toISOString().slice(0, 10);

    // Get bank account GL
    let bankGL = '111201';
    let bankName = 'Bank';
    if (bank_account_id) {
      const { rows: [ba] } = await db.query('SELECT * FROM bank_accounts WHERE id=$1', [bank_account_id]);
      if (ba) { bankGL = ba.gl_account || '111201'; bankName = ba.name; }
    }

    const { rows: [payment] } = await db.query(
      `INSERT INTO advance_payments (advance_id, amount, payment_method, bank_account_id, reference, remarks, paid_by, payment_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, payAmt, payment_method, bank_account_id || null, reference, remarks, req.user.id, payDate]);

    // Get employee name
    const { rows: [emp] } = await db.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv.employee_id]);

    const isReimburse = adv.advance_type === 'reimburse';

    if (isReimburse) {
      // ═══ Reimburse: GL Dr. Expense categories / Cr. Bank → auto-settle ═══
      const { rows: settlements } = await db.query('SELECT * FROM advance_settlements WHERE advance_id=$1 LIMIT 1', [adv.id]);
      const sett = settlements[0];
      let sLines = [];
      if (sett) {
        const { rows } = await db.query('SELECT * FROM settlement_lines WHERE settlement_id=$1 ORDER BY sort_order', [sett.id]);
        sLines = rows;
      }

      const catAccounts = { travel:'522601', food:'522603', accommodation:'522602', transport:'522701', material:'511120', misc:'522709' };
      const { rows: [journal] } = await db.query(
        `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
         VALUES ($1,'reimburse_pay',$2,$3,$4,$5,$5,$6) RETURNING *`,
        [req.user.company_id, payment.id, adv.doc_number, 'Reimburse - ' + adv.doc_number, payAmt, req.user.id]);

      let lineNum = 1;
      if (sLines.length) {
        for (const l of sLines) {
          const glAcct = l.sap_account || catAccounts[l.category] || '522709';
          await db.query(
            'INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES ($1,$2,$3,$4,$5,0,$6)',
            [journal.id, lineNum++, glAcct, l.description || l.category, parseFloat(l.amount), adv.doc_number]);
        }
      } else {
        // No settlement lines — book as misc expense
        await db.query(
          'INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES ($1,$2,$3,$4,$5,0,$6)',
          [journal.id, lineNum++, '522709', adv.description || 'Reimburse', payAmt, adv.doc_number]);
      }
      // Cr. Bank
      await db.query(
        'INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES ($1,$2,$3,$4,0,$5,$6)',
        [journal.id, lineNum++, bankGL, bankName, payAmt, adv.doc_number]);

      await db.query('UPDATE advance_payments SET journal_id=$1 WHERE id=$2', [journal.id, payment.id]);

      // Auto-settle
      if (sett) {
        await db.query("UPDATE advance_settlements SET status='approved', approved_by=$1, journal_id=$2 WHERE id=$3", [req.user.id, journal.id, sett.id]);
      }
      await db.query(
        "UPDATE advance_requests SET status='settled', paid_amount=$1, settled_amount=$1, balance=0, updated_at=NOW() WHERE id=$2",
        [payAmt, req.params.id]);

      // Notification
      try {
        await db.query(
          `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
           VALUES ($1, $2, $3, $4, $5, 'advance', $6)`,
          [req.user.company_id, adv.employee_id,
           'เบิกคืนจ่ายแล้ว',
           `${adv.doc_number} — ฿${payAmt.toLocaleString()} โอนเรียบร้อย`,
           'advance.html', adv.id]);
      } catch(_) {}

      res.status(201).json({ ...payment, journal, auto_settled: true });
    } else {
      // ═══ Advance: GL Dr. Employee Receivable / Cr. Bank ═══
      const { rows: [journal] } = await db.query(
        `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
         VALUES ($1,'advance_pay',$2,$3,$4,$5,$5,$6) RETURNING *`,
        [req.user.company_id, payment.id, adv.doc_number, 'Advance payment - ' + adv.doc_number, payAmt, req.user.id]);

      await db.query(
        `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
         ($1, 1, '113103', $2, $3, 0, $4),
         ($1, 2, $5, $6, 0, $3, $4)`,
        [journal.id, 'Employee Receivable - ' + (emp?.name||''), payAmt, adv.doc_number, bankGL, bankName]);

      await db.query('UPDATE advance_payments SET journal_id=$1 WHERE id=$2', [journal.id, payment.id]);

      // Calculate due_date = payment_date + 7 days
      const dueDate = new Date(payDate);
      dueDate.setDate(dueDate.getDate() + 7);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      const newPaid = parseFloat(adv.paid_amount || 0) + payAmt;
      await db.query(
        /* FIXED: Added parentheses for SQL arithmetic */ "UPDATE advance_requests SET status='paid', paid_amount=$1, balance=($1 - settled_amount), due_date=$2, updated_at=NOW() WHERE id=$3",
        [newPaid, dueDateStr, req.params.id]);

      // Notification
      try {
        await db.query(
          `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
           VALUES ($1, $2, $3, $4, $5, 'advance', $6)`,
          [req.user.company_id, adv.employee_id,
           'เงินทดรองจ่ายโอนแล้ว',
           `${adv.doc_number} — ฿${payAmt.toLocaleString()} กรุณาเคลียร์ภายในวันที่ ${dueDateStr}`,
           'advance.html', adv.id]);
      } catch(_) {}

      res.status(201).json({ ...payment, journal, due_date: dueDateStr });
    }

    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Settlements (Employee clears advance) ═══

// POST /api/advance/:id/settle
router.post('/:id/settle', async (req, res) => {
  try {
    const { lines, remarks } = req.body;
    if (!lines || !lines.length) return res.status(400).json({ error: 'Settlement must have line items' });

    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1', [req.params.id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });
    if (!['paid','settling','overdue'].includes(adv.status)) return res.status(400).json({ error: 'Advance must be paid first' });

    // Prevent duplicate pending/approved settlements
    const { rows: existingSettlements } = await db.query(
      "SELECT id, status FROM advance_settlements WHERE advance_id=$1 AND status IN ('pending_finance','approved')", [req.params.id]);
    if (existingSettlements.length > 0) {
      return res.status(400).json({ error: 'This advance already has a pending or approved settlement. Cannot submit another.' });
    }

    // Auto doc number
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'CLR', 'CLR', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `CLR${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const totalExpense = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const advanceAmount = parseFloat(adv.paid_amount || adv.amount);
    const difference = totalExpense - advanceAmount;
    const settlementType = difference === 0 ? 'exact' : difference > 0 ? 'reimburse' : 'return';

    // Status: exact → pending_finance, has difference → pending_finance (Finance must approve money movement)
    const initStatus = 'pending_finance';

    const { rows: [settlement] } = await db.query(
      `INSERT INTO advance_settlements (advance_id, doc_number, total_expense, advance_amount, difference, settlement_type, status, remarks, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.id, docNumber, totalExpense, advanceAmount, difference, settlementType, initStatus, remarks, req.user.id]);

    // Insert lines
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await db.query(
        `INSERT INTO settlement_lines (settlement_id, description, category, amount, receipt_date, receipt_number, has_receipt, sap_account, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [settlement.id, l.description, l.category || 'misc', l.amount, l.receipt_date || null,
         l.receipt_number || null, l.has_receipt || false, l.sap_account || '522709', i + 1]);
    }

    // GL Journal will be created when Finance approves (not now)

    /* GL moved to approve endpoint */

    // Update advance status
    await db.query(
      "UPDATE advance_requests SET status='settling', settled_amount=settled_amount+$1, balance=paid_amount-(settled_amount+$1), updated_at=NOW() WHERE id=$2",
      [totalExpense, req.params.id]);

    res.status(201).json({ ...settlement, lines });
    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// POST /api/advance/:id/receive-return — Record employee returning money
router.post('/:id/receive-return', async (req, res) => {
  try {
    if (!['finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only finance can receive return' });
    }
    const { bank_account_id, reference, remarks } = req.body;
    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1', [req.params.id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });

    const balance = parseFloat(adv.balance || 0);
    if (balance <= 0) return res.status(400).json({ error: 'No outstanding balance to return' });

    const result = await withTransaction(async (client) => {
      let bankGL = '111201', bankName = 'Bank';
      if (bank_account_id) {
        const { rows: [ba] } = await client.query('SELECT * FROM bank_accounts WHERE id=$1', [bank_account_id]);
        if (ba) { bankGL = ba.gl_account || '111201'; bankName = ba.name; }
      }

      const { rows: [payment] } = await client.query(
        `INSERT INTO advance_payments (advance_id, amount, payment_method, bank_account_id, reference, remarks, paid_by)
         VALUES ($1,$2,'return',$3,$4,$5,$6) RETURNING *`,
        [req.params.id, -balance, bank_account_id, reference, remarks || 'Employee return', req.user.id]);

      const { rows: [emp] } = await client.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv.employee_id]);
      const { rows: [journal] } = await client.query(
        `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
         VALUES ($1,'advance_return',$2,$3,$4,$5,$5,$6) RETURNING *`,
        [req.user.company_id, payment.id, adv.doc_number, 'Employee return - ' + adv.doc_number, balance, req.user.id]);

      await client.query(
        `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
         ($1, 1, $2, $3, $4, 0, $5),
         ($1, 2, '113103', $6, 0, $4, $5)`,
        [journal.id, bankGL, bankName, balance, 'Return from ' + adv.doc_number, 'Employee Receivable - ' + (emp?.name||'')]);

      await client.query('UPDATE advance_payments SET journal_id=$1 WHERE id=$2', [journal.id, payment.id]);
      await client.query(
        "UPDATE advance_requests SET balance=0, status='settled', updated_at=NOW() WHERE id=$1", [req.params.id]);

      return { payment, journal };
    });

    res.json({ success: true, amount_returned: balance, journal: result.journal });
    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance/:id/pay-reimburse — Company pays extra to employee
router.post('/:id/pay-reimburse', async (req, res) => {
  try {
    if (!['finance','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only finance can pay reimburse' });
    }
    const { bank_account_id, reference, remarks } = req.body;
    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1', [req.params.id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });

    const balance = parseFloat(adv.balance || 0);
    if (balance >= 0) return res.status(400).json({ error: 'No reimbursement needed' });
    const reimbAmt = Math.abs(balance);

    const result = await withTransaction(async (client) => {
      let bankGL = '111201', bankName = 'Bank';
      if (bank_account_id) {
        const { rows: [ba] } = await client.query('SELECT * FROM bank_accounts WHERE id=$1', [bank_account_id]);
        if (ba) { bankGL = ba.gl_account || '111201'; bankName = ba.name; }
      }

      const { rows: [payment] } = await client.query(
        `INSERT INTO advance_payments (advance_id, amount, payment_method, bank_account_id, reference, remarks, paid_by)
         VALUES ($1,$2,'reimburse',$3,$4,$5,$6) RETURNING *`,
        [req.params.id, reimbAmt, bank_account_id, reference, remarks || 'Reimburse to employee', req.user.id]);

      const { rows: [emp] } = await client.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv.employee_id]);
      const { rows: [journal] } = await client.query(
        `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
         VALUES ($1,'advance_reimburse',$2,$3,$4,$5,$5,$6) RETURNING *`,
        [req.user.company_id, payment.id, adv.doc_number, 'Reimburse - ' + adv.doc_number, reimbAmt, req.user.id]);

      await client.query(
        `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
         ($1, 1, '113103', $2, $3, 0, $4),
         ($1, 2, $5, $6, 0, $3, $4)`,
        [journal.id, 'Employee Receivable - ' + (emp?.name||''), reimbAmt, 'Reimburse ' + adv.doc_number, bankGL, bankName]);

      await client.query('UPDATE advance_payments SET journal_id=$1 WHERE id=$2', [journal.id, payment.id]);
      await client.query(
        "UPDATE advance_requests SET balance=0, status='settled', updated_at=NOW() WHERE id=$1", [req.params.id]);

      return { payment, journal };
    });

    res.json({ success: true, amount_reimbursed: reimbAmt, journal: result.journal });
    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advance/:id/confirm-return — Employee confirms they have returned money
router.post('/:id/confirm-return', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE advance_requests SET employee_confirmed = true, employee_confirmed_at = NOW()
       WHERE id = $1 AND company_id = $2 AND balance > 0 RETURNING *`,
      [req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found or no balance to return' });
    res.json(rows[0]);
    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
