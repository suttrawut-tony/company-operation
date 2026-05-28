const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');
router.use(authenticate);

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

    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1', [s.advance_id]);
    const { rows: sLines } = await db.query('SELECT * FROM settlement_lines WHERE settlement_id=$1 ORDER BY sort_order', [s.id]);
    const totalExpense = parseFloat(s.total_expense);
    const difference = parseFloat(s.difference);

    const { rows: [journal] } = await db.query(
      `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
       VALUES ($1,'advance_settle',$2,$3,$4,$5,$5,$6) RETURNING *`,
      [req.user.company_id, s.id, s.doc_number, 'Clear - ' + (adv?.doc_number||''), totalExpense, req.user.id]);

    let lineNum = 1;
    const catAccounts = { travel:'522601', food:'522603', accommodation:'522602', transport:'522701', material:'511120', misc:'522709' };
    for (const l of sLines) {
      const glAcct = l.sap_account || catAccounts[l.category] || '522709';
      await db.query(
        'INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES ($1,$2,$3,$4,$5,0,$6)',
        [journal.id, lineNum++, glAcct, l.description || l.category, parseFloat(l.amount), s.doc_number]);
    }
    const { rows: [emp] } = await db.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv?.employee_id]);
    await db.query(
      'INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES ($1,$2,$3,$4,0,$5,$6)',
      [journal.id, lineNum++, '113103', 'Employee Receivable - ' + (emp?.name||''), totalExpense, s.doc_number]);

    const { rows } = await db.query(
      'UPDATE advance_settlements SET status=$1, approved_by=$2, journal_id=$3 WHERE id=$4 RETURNING *',
      ['approved', req.user.id, journal.id, req.params.id]);

    if (difference === 0) {
      await db.query("UPDATE advance_requests SET status='settled', updated_at=NOW() WHERE id=$1", [s.advance_id]);
    }
    res.json(rows[0]);
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
             p.code AS project_code, p.name AS project_name
             FROM advance_requests a
             LEFT JOIN users u ON a.employee_id = u.id
             LEFT JOIN projects p ON a.project_id = p.id
             WHERE a.company_id = $1`;
    const params = [req.user.company_id];
    if (projectIds !== null) { params.push(projectIds); params.push(req.user.id); q += ` AND (a.project_id = ANY($${params.length-1}) OR a.employee_id = $${params.length})`; }
    if (req.query.project_id) { params.push(req.query.project_id); q += ` AND a.project_id = $${params.length}`; }
    if (req.query.status) { params.push(req.query.status); q += ` AND a.status = $${params.length}`; }
    if (req.query.employee_id) { params.push(req.query.employee_id); q += ` AND a.employee_id = $${params.length}`; }
    q += ' ORDER BY a.created_at DESC';
    const { rows } = await db.query(q, params);
    // Add settlement_approved flag
    for (const a of rows) {
      const { rows: setts } = await db.query(
        "SELECT status FROM advance_settlements WHERE advance_id=$1 ORDER BY created_at DESC LIMIT 1", [a.id]);
      a.clear_status = setts.length ? setts[0].status : null;
    }
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
    const { project_id, amount, description, purpose, employee_id, travel_id } = req.body;
    // Auto doc number
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'ADV', 'ADV', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `ADV${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [adv] } = await db.query(
      `INSERT INTO advance_requests (company_id, project_id, doc_number, employee_id, amount, description, purpose, travel_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, project_id || null, docNumber, employee_id || req.user.id,
       amount, description, purpose || null, travel_id || null, req.user.id]);
    res.status(201).json(adv);
    req.broadcast('advance_created', { doc_number: docNumber });
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
    const { amount, payment_method, bank_account_id, reference, remarks } = req.body;
    const { rows: [adv] } = await db.query('SELECT * FROM advance_requests WHERE id=$1', [req.params.id]);
    if (!adv) return res.status(404).json({ error: 'Not found' });
    if (adv.status !== 'approved' && adv.status !== 'paid') return res.status(400).json({ error: 'Must be approved first' });

    const payAmt = amount || parseFloat(adv.amount);

    // Get bank account GL
    let bankGL = '111201';
    let bankName = 'Bank';
    if (bank_account_id) {
      const { rows: [ba] } = await db.query('SELECT * FROM bank_accounts WHERE id=$1', [bank_account_id]);
      if (ba) { bankGL = ba.gl_account || '111201'; bankName = ba.name; }
    }

    const { rows: [payment] } = await db.query(
      `INSERT INTO advance_payments (advance_id, amount, payment_method, bank_account_id, reference, remarks, paid_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, payAmt, payment_method || 'transfer', bank_account_id || null, reference, remarks, req.user.id]);

    // Auto-create GL Journal: Dr. Employee Receivable / Cr. Bank
    const { rows: [journal] } = await db.query(
      `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
       VALUES ($1,'advance_pay',$2,$3,$4,$5,$5,$6) RETURNING *`,
      [req.user.company_id, payment.id, adv.doc_number, 'Advance payment - ' + adv.doc_number, payAmt, req.user.id]);

    // Get employee name
    const { rows: [emp] } = await db.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv.employee_id]);

    await db.query(
      `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
       ($1, 1, '113103', $2, $3, 0, $4),
       ($1, 2, $5, $6, 0, $3, $4)`,
      [journal.id, 'Employee Receivable - ' + (emp?.name||''), payAmt, adv.doc_number, bankGL, bankName]);

    // Link journal to payment
    await db.query('UPDATE advance_payments SET journal_id=$1 WHERE id=$2', [journal.id, payment.id]);

    // Update advance
    const newPaid = parseFloat(adv.paid_amount || 0) + payAmt;
    await db.query(
      "UPDATE advance_requests SET status='paid', paid_amount=$1, balance=$1-settled_amount, updated_at=NOW() WHERE id=$2",
      [newPaid, req.params.id]);

    res.status(201).json({ ...payment, journal });
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
    if (adv.status !== 'paid' && adv.status !== 'settling') return res.status(400).json({ error: 'Advance must be paid first' });

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

    // Get bank GL
    let bankGL = '111201', bankName = 'Bank';
    if (bank_account_id) {
      const { rows: [ba] } = await db.query('SELECT * FROM bank_accounts WHERE id=$1', [bank_account_id]);
      if (ba) { bankGL = ba.gl_account || '111201'; bankName = ba.name; }
    }

    // Record payment (negative = return)
    const { rows: [payment] } = await db.query(
      `INSERT INTO advance_payments (advance_id, amount, payment_method, bank_account_id, reference, remarks, paid_by)
       VALUES ($1,$2,'return',$3,$4,$5,$6) RETURNING *`,
      [req.params.id, -balance, bank_account_id, reference, remarks || 'Employee return', req.user.id]);

    // GL Journal: Dr. Bank / Cr. Employee Receivable
    const { rows: [emp] } = await db.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv.employee_id]);
    const { rows: [journal] } = await db.query(
      `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
       VALUES ($1,'advance_return',$2,$3,$4,$5,$5,$6) RETURNING *`,
      [req.user.company_id, payment.id, adv.doc_number, 'Employee return - ' + adv.doc_number, balance, req.user.id]);

    await db.query(
      `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
       ($1, 1, $2, $3, $4, 0, $5),
       ($1, 2, '113103', $6, 0, $4, $5)`,
      [journal.id, bankGL, bankName, balance, 'Return from ' + adv.doc_number, 'Employee Receivable - ' + (emp?.name||'')]);

    await db.query('UPDATE advance_payments SET journal_id=$1 WHERE id=$2', [journal.id, payment.id]);

    // Close advance
    await db.query(
      "UPDATE advance_requests SET balance=0, status='settled', updated_at=NOW() WHERE id=$1",
      [req.params.id]);

    res.json({ success: true, amount_returned: balance, journal });
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

    let bankGL = '111201', bankName = 'Bank';
    if (bank_account_id) {
      const { rows: [ba] } = await db.query('SELECT * FROM bank_accounts WHERE id=$1', [bank_account_id]);
      if (ba) { bankGL = ba.gl_account || '111201'; bankName = ba.name; }
    }

    const { rows: [payment] } = await db.query(
      `INSERT INTO advance_payments (advance_id, amount, payment_method, bank_account_id, reference, remarks, paid_by)
       VALUES ($1,$2,'reimburse',$3,$4,$5,$6) RETURNING *`,
      [req.params.id, reimbAmt, bank_account_id, reference, remarks || 'Reimburse to employee', req.user.id]);

    // GL: Dr. Employee Receivable / Cr. Bank
    const { rows: [emp] } = await db.query("SELECT first_name || ' ' || last_name AS name FROM users WHERE id=$1", [adv.employee_id]);
    const { rows: [journal] } = await db.query(
      `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, remarks, total_debit, total_credit, created_by)
       VALUES ($1,'advance_reimburse',$2,$3,$4,$5,$5,$6) RETURNING *`,
      [req.user.company_id, payment.id, adv.doc_number, 'Reimburse - ' + adv.doc_number, reimbAmt, req.user.id]);

    await db.query(
      `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
       ($1, 1, '113103', $2, $3, 0, $4),
       ($1, 2, $5, $6, 0, $3, $4)`,
      [journal.id, 'Employee Receivable - ' + (emp?.name||''), reimbAmt, 'Reimburse ' + adv.doc_number, bankGL, bankName]);

    await db.query('UPDATE advance_payments SET journal_id=$1 WHERE id=$2', [journal.id, payment.id]);

    await db.query(
      "UPDATE advance_requests SET balance=0, status='settled', updated_at=NOW() WHERE id=$1",
      [req.params.id]);

    res.json({ success: true, amount_reimbursed: reimbAmt, journal });
    req.broadcast('advance_updated', { id: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
