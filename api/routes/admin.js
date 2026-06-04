const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user.is_superadmin) return res.status(403).json({ error: 'Superadmin only' });
  next();
});

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { rows: [stats] } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM companies) AS total_companies,
        (SELECT COUNT(*) FROM subscriptions WHERE status='active') AS active_subs,
        (SELECT COUNT(*) FROM subscriptions WHERE status='trial') AS trial_subs,
        (SELECT COUNT(*) FROM subscriptions WHERE status='cancelled') AS cancelled_subs,
        (SELECT COALESCE(SUM(amount),0) FROM subscriptions WHERE status='active' AND billing_cycle='monthly') AS mrr_monthly,
        (SELECT COALESCE(SUM(amount/12),0) FROM subscriptions WHERE status='active' AND billing_cycle='yearly') AS mrr_yearly
    `);
    stats.mrr = parseFloat(stats.mrr_monthly || 0) + parseFloat(stats.mrr_yearly || 0);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/companies
router.get('/companies', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*, s.status AS sub_status, p.display_name AS plan_name, s.amount, s.billing_cycle,
        (SELECT COUNT(*) FROM users WHERE company_id=c.id AND is_active=true) AS user_count,
        (SELECT COUNT(*) FROM projects WHERE company_id=c.id) AS project_count
      FROM companies c
      LEFT JOIN subscriptions s ON s.company_id=c.id
      LEFT JOIN plans p ON s.plan_id=p.id
      ORDER BY c.created_at DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/companies/:id
router.get('/companies/:id', async (req, res) => {
  try {
    const { rows: [c] } = await db.query('SELECT * FROM companies WHERE id=$1', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const { rows: [sub] } = await db.query(
      'SELECT s.*, p.display_name AS plan_name FROM subscriptions s JOIN plans p ON s.plan_id=p.id WHERE s.company_id=$1', [req.params.id]);
    const { rows: users } = await db.query('SELECT id, email, first_name, last_name, role, is_active FROM users WHERE company_id=$1', [req.params.id]);
    const { rows: invoices } = await db.query('SELECT * FROM invoices WHERE company_id=$1 ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    res.json({ company: c, subscription: sub, users, invoices });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/companies/:id/suspend
router.put('/companies/:id/suspend', async (req, res) => {
  try {
    await db.query("UPDATE subscriptions SET status='suspended', updated_at=NOW() WHERE company_id=$1", [req.params.id]);
    res.json({ message: 'Company suspended' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/companies/:id/unsuspend
router.put('/companies/:id/unsuspend', async (req, res) => {
  try {
    await db.query("UPDATE subscriptions SET status='active', updated_at=NOW() WHERE company_id=$1", [req.params.id]);
    res.json({ message: 'Company unsuspended' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/invoices
router.get('/invoices', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, c.name AS company_name FROM invoices i JOIN companies c ON i.company_id=c.id ORDER BY i.created_at DESC LIMIT 100`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
