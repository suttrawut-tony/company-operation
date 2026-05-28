const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/approvals/pending — docs pending my approval
router.get('/pending', async (req, res) => {
  try {
    const role = req.user.role;
    const results = [];

    // Budgets
    const budgetStatus = role === 'executive' ? 'pending_executive' : role === 'pm' ? 'pending_manager' : null;
    if (budgetStatus) {
      const { rows } = await db.query(
        `SELECT id, code AS doc_number, 'budget' AS doc_type, total_budget AS amount, status, created_at
         FROM budgets WHERE company_id = $1 AND status = $2`, [req.user.company_id, budgetStatus]);
      results.push(...rows);
    }

    // PRs
    const prStatuses = [];
    if (role === 'pm') prStatuses.push('pending_manager');
    if (role === 'finance') prStatuses.push('pending_finance');
    if (role === 'executive') prStatuses.push('pending_executive');
    if (prStatuses.length) {
      const { rows } = await db.query(
        `SELECT id, doc_number, 'pr' AS doc_type, total_amount AS amount, status, created_at
         FROM purchase_requests WHERE company_id = $1 AND status = ANY($2)`,
        [req.user.company_id, prStatuses]);
      results.push(...rows);
    }

    // Expenses
    const expStatuses = [];
    if (role === 'pm') expStatuses.push('pending_manager');
    if (role === 'finance') expStatuses.push('pending_finance');
    if (role === 'executive') expStatuses.push('pending_executive');
    if (expStatuses.length) {
      const { rows } = await db.query(
        `SELECT id, doc_number, 'expense' AS doc_type, amount, status, created_at
         FROM expenses WHERE company_id = $1 AND status = ANY($2)`,
        [req.user.company_id, expStatuses]);
      results.push(...rows);
    }

    // OT
    const otStatus = role === 'executive' ? 'pending_executive' : role === 'pm' ? 'pending_manager' : null;
    if (otStatus) {
      const { rows } = await db.query(
        `SELECT id, doc_number, 'ot' AS doc_type, compensation AS amount, status, created_at
         FROM ot_requests WHERE company_id = $1 AND status = $2`, [req.user.company_id, otStatus]);
      results.push(...rows);
    }

    results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json({ total: results.length, items: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
