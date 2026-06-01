const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// ═══ FUNDS ═══

// GET /api/petty-cash/funds
router.get('/funds', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.*, u.first_name || ' ' || u.last_name AS custodian_name,
              p.code AS project_code, p.name AS project_name
       FROM petty_cash_funds f
       LEFT JOIN users u ON f.custodian_id = u.id
       LEFT JOIN projects p ON f.project_id = p.id
       WHERE f.company_id = $1 ORDER BY f.created_at DESC`,
      [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/petty-cash/funds — Create fund
router.post('/funds', async (req, res) => {
  try {
    const { fund_name, fund_limit, custodian_id, project_id, gl_account, low_threshold } = req.body;
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'PCF', 'PCF', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const fundCode = `PCF${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [fund] } = await db.query(
      `INSERT INTO petty_cash_funds (company_id, project_id, fund_code, fund_name, fund_limit, current_balance, custodian_id, gl_account, low_threshold, created_by)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.company_id, project_id || null, fundCode, fund_name, fund_limit || 5000, custodian_id || null, gl_account || '111101', low_threshold || 20, req.user.id]);
    res.status(201).json(fund);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/petty-cash/funds/:id
router.get('/funds/:id', async (req, res) => {
  try {
    const { rows: [fund] } = await db.query(
      `SELECT f.*, u.first_name || ' ' || u.last_name AS custodian_name
       FROM petty_cash_funds f LEFT JOIN users u ON f.custodian_id = u.id
       WHERE f.id = $1 AND f.company_id = $2`,
      [req.params.id, req.user.company_id]);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    // Load recent disbursements
    const { rows: disbursements } = await db.query(
      `SELECT d.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM petty_cash_disbursements d LEFT JOIN users u ON d.created_by = u.id
       WHERE d.fund_id = $1 ORDER BY d.created_at DESC LIMIT 50`, [fund.id]);

    // Load replenishments
    const { rows: replenishments } = await db.query(
      `SELECT r.*, u.first_name || ' ' || u.last_name AS approved_by_name
       FROM petty_cash_replenishments r LEFT JOIN users u ON r.approved_by = u.id
       WHERE r.fund_id = $1 ORDER BY r.created_at DESC LIMIT 20`, [fund.id]);

    // Load cash counts
    const { rows: counts } = await db.query(
      'SELECT * FROM petty_cash_counts WHERE fund_id = $1 ORDER BY count_date DESC LIMIT 10', [fund.id]);

    res.json({ ...fund, disbursements, replenishments, counts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ DISBURSEMENTS ═══

// GET /api/petty-cash/disbursements
router.get('/disbursements', async (req, res) => {
  try {
    const { fund_id, status } = req.query;
    let q = `SELECT d.*, u.first_name || ' ' || u.last_name AS created_by_name
             FROM petty_cash_disbursements d LEFT JOIN users u ON d.created_by = u.id
             WHERE d.company_id = $1`;
    const params = [req.user.company_id];
    if (fund_id) { params.push(fund_id); q += ` AND d.fund_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND d.status = $${params.length}`; }
    q += ' ORDER BY d.created_at DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/petty-cash/disbursements — Create disbursement
router.post('/disbursements', async (req, res) => {
  try {
    const { fund_id, recipient, description, amount, category, remarks } = req.body;

    // Check fund balance
    const { rows: [fund] } = await db.query('SELECT * FROM petty_cash_funds WHERE id = $1', [fund_id]);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    if (parseFloat(fund.current_balance) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient petty cash balance' });
    }

    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'PCD', 'PCD', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `PCD${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [disb] } = await db.query(
      `INSERT INTO petty_cash_disbursements (fund_id, company_id, doc_number, recipient, description, amount, category, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [fund_id, req.user.company_id, docNumber, recipient, description, amount, category || 'misc', remarks, req.user.id]);

    // Deduct from fund balance
    await db.query('UPDATE petty_cash_funds SET current_balance = current_balance - $1, updated_at = NOW() WHERE id = $2', [amount, fund_id]);

    if (req.app.get('broadcast')) req.app.get('broadcast')('pc_disbursement', { doc_number: docNumber });
    res.status(201).json(disb);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/petty-cash/disbursements/:id/submit-receipt — Submit receipt
router.post('/disbursements/:id/submit-receipt', async (req, res) => {
  try {
    const { receipt_amount, receipt_url, category } = req.body;
    const { rows: [disb] } = await db.query(
      `UPDATE petty_cash_disbursements SET receipt_status = 'submitted', receipt_amount = $1, receipt_url = $2,
       category = COALESCE($3, category), updated_at = NOW()
       WHERE id = $4 AND company_id = $5 RETURNING *`,
      [receipt_amount, receipt_url, category, req.params.id, req.user.company_id]);
    if (!disb) return res.status(404).json({ error: 'Not found' });

    // Handle change (เงินทอน)
    const change = parseFloat(disb.amount) - parseFloat(receipt_amount || disb.amount);
    if (change > 0) {
      await db.query('UPDATE petty_cash_disbursements SET change_amount = $1 WHERE id = $2', [change, disb.id]);
      await db.query('UPDATE petty_cash_funds SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2', [change, disb.fund_id]);
    }
    res.json(disb);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/petty-cash/disbursements/:id/approve — Approve receipt
router.post('/disbursements/:id/approve', async (req, res) => {
  try {
    const { rows: [disb] } = await db.query(
      `UPDATE petty_cash_disbursements SET status = 'approved', receipt_status = 'approved',
       approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND company_id = $3 RETURNING *`,
      [req.user.id, req.params.id, req.user.company_id]);
    if (!disb) return res.status(404).json({ error: 'Not found' });

    // Create GL Journal
    const catAccounts = { travel:'522601', food:'522603', accommodation:'522602', transport:'522701', material:'511120', office:'522501', delivery:'522701', maintenance:'523101', misc:'522709' };
    const glAccount = catAccounts[disb.category] || '522709';
    const actualAmount = parseFloat(disb.receipt_amount || disb.amount);

    const { rows: [journal] } = await db.query(
      `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, posting_date, remarks, total_debit, total_credit, status, created_by)
       VALUES ($1, 'petty_cash', $2, $3, CURRENT_DATE, $4, $5, $5, 'posted', $6) RETURNING *`,
      [req.user.company_id, disb.id, disb.doc_number, 'Petty Cash: ' + disb.description, actualAmount, req.user.id]);

    await db.query(
      `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
       ($1, 1, $2, $3, $4, 0, $5),
       ($1, 2, '111101', 'Petty Cash', 0, $4, $5)`,
      [journal.id, glAccount, disb.description, actualAmount, disb.description]);

    await db.query('UPDATE petty_cash_disbursements SET journal_id = $1 WHERE id = $2', [journal.id, disb.id]);

    if (req.app.get('broadcast')) req.app.get('broadcast')('pc_updated', { id: disb.fund_id });
    res.json(disb);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/petty-cash/disbursements/:id/reject
router.post('/disbursements/:id/reject', async (req, res) => {
  try {
    const { rows: [disb] } = await db.query(
      `UPDATE petty_cash_disbursements SET receipt_status = 'rejected', status = 'disbursed', updated_at = NOW()
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [req.params.id, req.user.company_id]);
    if (!disb) return res.status(404).json({ error: 'Not found' });
    res.json(disb);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ REPLENISHMENT ═══

// POST /api/petty-cash/replenish — Request replenishment
router.post('/replenish', async (req, res) => {
  try {
    const { fund_id, amount, remarks } = req.body;
    const { rows: [series] } = await db.query(
      `INSERT INTO number_series (company_id, doc_type, prefix, year_month, current_number)
       VALUES ($1, 'PCR', 'PCR', to_char(NOW(), 'YYMM'), 1)
       ON CONFLICT (company_id, doc_type, year_month) DO UPDATE SET current_number = number_series.current_number + 1
       RETURNING *`, [req.user.company_id]);
    const docNumber = `PCR${series.year_month}${String(series.current_number).padStart(4, '0')}`;

    const { rows: [repl] } = await db.query(
      `INSERT INTO petty_cash_replenishments (fund_id, company_id, doc_number, amount, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [fund_id, req.user.company_id, docNumber, amount, remarks, req.user.id]);
    res.status(201).json(repl);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/petty-cash/replenish/:id/approve — Approve & transfer
router.post('/replenish/:id/approve', async (req, res) => {
  try {
    const { bank_account_id, reference } = req.body;
    const { rows: [repl] } = await db.query(
      `UPDATE petty_cash_replenishments SET status = 'transferred', bank_account_id = $1, reference = $2,
       approved_by = $3, approved_at = NOW(), transferred_at = NOW()
       WHERE id = $4 AND company_id = $5 RETURNING *`,
      [bank_account_id, reference, req.user.id, req.params.id, req.user.company_id]);
    if (!repl) return res.status(404).json({ error: 'Not found' });

    // Add to fund balance
    await db.query('UPDATE petty_cash_funds SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2',
      [repl.amount, repl.fund_id]);

    // Get bank GL
    let bankGl = '111201';
    if (bank_account_id) {
      const { rows: [bank] } = await db.query('SELECT gl_account FROM bank_accounts WHERE id = $1', [bank_account_id]);
      if (bank) bankGl = bank.gl_account;
    }

    // GL Journal
    const { rows: [journal] } = await db.query(
      `INSERT INTO gl_journals (company_id, doc_type, doc_id, doc_number, posting_date, remarks, total_debit, total_credit, status, created_by)
       VALUES ($1, 'pc_replenish', $2, $3, CURRENT_DATE, $4, $5, $5, 'posted', $6) RETURNING *`,
      [req.user.company_id, repl.id, repl.doc_number, 'Petty Cash Replenishment', repl.amount, req.user.id]);

    await db.query(
      `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
       ($1, 1, '111101', 'Petty Cash', $2, 0, 'Replenishment'),
       ($1, 2, $3, 'Bank Account', 0, $2, 'Replenishment')`,
      [journal.id, repl.amount, bankGl]);

    await db.query('UPDATE petty_cash_replenishments SET journal_id = $1 WHERE id = $2', [journal.id, repl.id]);

    if (req.app.get('broadcast')) req.app.get('broadcast')('pc_updated', { id: repl.fund_id });
    res.json(repl);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ CASH COUNT ═══

// POST /api/petty-cash/count — Record cash count
router.post('/count', async (req, res) => {
  try {
    const { fund_id, actual_balance, remarks } = req.body;
    const { rows: [fund] } = await db.query('SELECT current_balance FROM petty_cash_funds WHERE id = $1', [fund_id]);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    const systemBal = parseFloat(fund.current_balance);
    const actualBal = parseFloat(actual_balance);
    const diff = actualBal - systemBal;
    const diffType = diff === 0 ? 'match' : diff > 0 ? 'overage' : 'shortage';

    const { rows: [count] } = await db.query(
      `INSERT INTO petty_cash_counts (fund_id, company_id, system_balance, actual_balance, difference, difference_type, remarks, counted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [fund_id, req.user.company_id, systemBal, actualBal, diff, diffType, remarks, req.user.id]);

    // If difference, create GL and adjust balance
    if (diff !== 0) {
      const { rows: [journal] } = await db.query(
        `INSERT INTO gl_journals (company_id, doc_type, doc_id, posting_date, remarks, total_debit, total_credit, status, created_by)
         VALUES ($1, 'pc_count', $2, CURRENT_DATE, $3, $4, $4, 'posted', $5) RETURNING *`,
        [req.user.company_id, count.id, 'Cash Count Adjustment: ' + diffType, Math.abs(diff), req.user.id]);

      if (diff > 0) {
        // Overage: Dr. 111101 / Cr. 411901
        await db.query(
          `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
           ($1, 1, '111101', 'Petty Cash', $2, 0, 'Cash Overage'),
           ($1, 2, '411901', 'Cash Overage', 0, $2, 'Cash Overage')`,
          [journal.id, Math.abs(diff)]);
      } else {
        // Shortage: Dr. 522709 / Cr. 111101
        await db.query(
          `INSERT INTO gl_journal_lines (journal_id, line_num, gl_account, account_name, debit, credit, description) VALUES
           ($1, 1, '522709', 'Cash Shortage', $2, 0, 'Cash Shortage'),
           ($1, 2, '111101', 'Petty Cash', 0, $2, 'Cash Shortage')`,
          [journal.id, Math.abs(diff)]);
      }

      await db.query('UPDATE petty_cash_counts SET journal_id = $1 WHERE id = $2', [journal.id, count.id]);
      // Adjust fund balance to actual
      await db.query('UPDATE petty_cash_funds SET current_balance = $1, updated_at = NOW() WHERE id = $2', [actualBal, fund_id]);
    }

    await db.query('UPDATE petty_cash_counts SET status = $1 WHERE id = $2', [diff === 0 ? 'matched' : 'adjusted', count.id]);

    if (req.app.get('broadcast')) req.app.get('broadcast')('pc_updated', { id: fund_id });
    res.status(201).json({ ...count, difference: diff, difference_type: diffType });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/petty-cash/journal/:id
router.get('/journal/:id', async (req, res) => {
  try {
    const { rows: [journal] } = await db.query('SELECT * FROM gl_journals WHERE id = $1', [req.params.id]);
    if (!journal) return res.status(404).json({ error: 'Not found' });
    const { rows: lines } = await db.query('SELECT * FROM gl_journal_lines WHERE journal_id = $1 ORDER BY line_num', [req.params.id]);
    res.json({ ...journal, lines });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ EDIT ENDPOINTS ═══

// PUT /api/petty-cash/funds/:id — edit fund (finance/executive only)
router.put('/funds/:id', async (req, res) => {
  try {
    const role = req.user.role || '';
    if (!['finance','executive','admin'].includes(role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { fund_name, fund_limit, custodian_id, project_id, gl_account, low_threshold } = req.body;
    const { rows: [fund] } = await db.query(
      `UPDATE petty_cash_funds SET fund_name=COALESCE($1,fund_name), fund_limit=COALESCE($2,fund_limit),
       custodian_id=COALESCE($3,custodian_id), project_id=COALESCE($4,project_id),
       gl_account=COALESCE($5,gl_account), low_threshold=COALESCE($6,low_threshold), updated_at=NOW()
       WHERE id=$7 AND company_id=$8 RETURNING *`,
      [fund_name, fund_limit, custodian_id, project_id, gl_account, low_threshold, req.params.id, req.user.company_id]);
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    res.json(fund);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/petty-cash/disbursements/:id — edit disbursement (draft/disbursed, owner only)
router.put('/disbursements/:id', async (req, res) => {
  try {
    const { rows: [disb] } = await db.query(
      'SELECT * FROM petty_cash_disbursements WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!disb) return res.status(404).json({ error: 'Not found' });
    if (!['draft','disbursed'].includes(disb.status)) return res.status(400).json({ error: 'Can only edit draft/disbursed records' });
    const role = req.user.role || '';
    if (disb.created_by !== req.user.id && !['finance','executive','admin'].includes(role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { recipient, description, amount, category, remarks } = req.body;
    const { rows: [updated] } = await db.query(
      `UPDATE petty_cash_disbursements SET recipient=COALESCE($1,recipient), description=COALESCE($2,description),
       amount=COALESCE($3,amount), category=COALESCE($4,category), remarks=COALESCE($5,remarks), updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [recipient, description, amount, category, remarks, req.params.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/petty-cash/disbursements/:id — cancel disbursement (draft/disbursed, owner)
router.delete('/disbursements/:id', async (req, res) => {
  try {
    const { rows: [disb] } = await db.query(
      'SELECT * FROM petty_cash_disbursements WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    if (!disb) return res.status(404).json({ error: 'Not found' });
    if (!['draft','disbursed'].includes(disb.status)) return res.status(400).json({ error: 'Can only cancel draft/disbursed records' });
    const role = req.user.role || '';
    if (disb.created_by !== req.user.id && !['finance','executive','admin'].includes(role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Refund balance back to fund
    await db.query('UPDATE petty_cash_funds SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2',
      [parseFloat(disb.amount), disb.fund_id]);
    await db.query('UPDATE petty_cash_disbursements SET status=$1, updated_at=NOW() WHERE id=$2', ['cancelled', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
