const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

// ═══ Public: Register new company + trial ═══
router.post('/register', async (req, res) => {
  try {
    const { company_name, company_slug, admin_email, admin_password, admin_first_name, admin_last_name, plan_id } = req.body;
    if (!company_name || !company_slug || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'company_name, company_slug, admin_email, admin_password required' });
    }
    // Check slug unique
    const { rows: existing } = await db.query('SELECT 1 FROM companies WHERE slug=$1', [company_slug]);
    if (existing.length) return res.status(400).json({ error: 'Company slug already exists' });

    // Get plan (default starter)
    let planRow;
    if (plan_id) {
      const { rows } = await db.query('SELECT * FROM plans WHERE id=$1 AND is_active=true', [plan_id]);
      planRow = rows[0];
    }
    if (!planRow) {
      const { rows } = await db.query("SELECT * FROM plans WHERE name='starter'");
      planRow = rows[0];
    }
    if (!planRow) return res.status(500).json({ error: 'No plans available' });

    // Create company
    const { rows: [company] } = await db.query(
      `INSERT INTO companies (name, slug, is_active) VALUES ($1,$2,true) RETURNING *`,
      [company_name, company_slug]);

    // Create admin user
    const hash = await bcrypt.hash(admin_password, 10);
    const { rows: [user] } = await db.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1,$2,$3,$4,$5,'executive',true) RETURNING id, email, first_name, last_name, role`,
      [company.id, admin_email, hash, admin_first_name || 'Admin', admin_last_name || '']);

    // Create trial subscription
    const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 14);
    const { rows: [sub] } = await db.query(
      `INSERT INTO subscriptions (company_id, plan_id, status, trial_started_at, trial_ends_at, current_period_start, current_period_end, amount)
       VALUES ($1,$2,'trial',NOW(),$3,CURRENT_DATE,$4,$5) RETURNING *`,
      [company.id, planRow.id, trialEnd, trialEnd.toISOString().slice(0,10), planRow.price_monthly]);

    // Seed company_modules from plan
    const modulesToSeed = planRow.modules_included || [];
    if (modulesToSeed.length) {
      // Get all module templates from any existing company
      const { rows: templates } = await db.query(
        'SELECT DISTINCT ON (module_id) module_id, module_name, module_group, icon, href, is_core, sort_order FROM company_modules ORDER BY module_id, created_at');
      for (const t of templates) {
        const enabled = modulesToSeed.includes(t.module_id) || t.is_core;
        await db.query(
          `INSERT INTO company_modules (company_id, module_id, module_name, module_group, icon, href, is_enabled, is_core, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
          [company.id, t.module_id, t.module_name, t.module_group, t.icon, t.href, enabled, t.is_core, t.sort_order]);
      }
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, companyId: company.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ company, user, subscription: sub, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Public: Plans list ═══
router.get('/plans', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM plans WHERE is_active=true ORDER BY sort_order');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ Authenticated routes ═══
router.use(authenticate);

// GET /api/subscription — current subscription
router.get('/', async (req, res) => {
  try {
    const { rows: [sub] } = await db.query(
      `SELECT s.*, p.name AS plan_name, p.display_name AS plan_display, p.price_monthly, p.price_yearly,
       p.max_users, p.max_projects, p.max_storage_gb, p.modules_included, p.features
       FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.company_id = $1`, [req.user.company_id]);
    if (!sub) return res.json({ subscription: null });

    // Usage
    const { rows: [uc] } = await db.query('SELECT COUNT(*) AS cnt FROM users WHERE company_id=$1 AND is_active=true', [req.user.company_id]);
    const { rows: [pc] } = await db.query("SELECT COUNT(*) AS cnt FROM projects WHERE company_id=$1 AND status != 'cancelled'", [req.user.company_id]);
    const usage = {
      users: { current: parseInt(uc.cnt), limit: sub.max_users },
      projects: { current: parseInt(pc.cnt), limit: sub.max_projects },
      storage_mb: { current: 0, limit: (sub.max_storage_gb || 0) * 1024 }
    };

    // Recent invoices
    const { rows: invoices } = await db.query(
      'SELECT * FROM invoices WHERE company_id=$1 ORDER BY created_at DESC LIMIT 5', [req.user.company_id]);

    res.json({ subscription: sub, usage, invoices });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/subscription/upgrade
router.post('/upgrade', async (req, res) => {
  try {
    if (req.user.role !== 'executive') return res.status(403).json({ error: 'PERMISSION_DENIED' });
    const { plan_id, billing_cycle } = req.body;
    const { rows: [plan] } = await db.query('SELECT * FROM plans WHERE id=$1 AND is_active=true', [plan_id]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const cycle = billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const amount = cycle === 'yearly' ? parseFloat(plan.price_yearly) : parseFloat(plan.price_monthly);
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (cycle === 'yearly' ? 12 : 1));

    const { rows: [sub] } = await db.query(
      `UPDATE subscriptions SET plan_id=$1, status='active', billing_cycle=$2, amount=$3,
       current_period_start=CURRENT_DATE, current_period_end=$4, next_billing_date=$4,
       trial_ends_at=NULL, updated_at=NOW()
       WHERE company_id=$5 RETURNING *`,
      [plan_id, cycle, amount, periodEnd.toISOString().slice(0,10), req.user.company_id]);

    // Update modules based on plan
    if (plan.modules_included) {
      await db.query(
        `UPDATE company_modules SET is_enabled = (module_id = ANY($1) OR is_core), updated_at=NOW() WHERE company_id=$2`,
        [plan.modules_included, req.user.company_id]);
    } else {
      // Enterprise: enable all
      await db.query('UPDATE company_modules SET is_enabled=true, updated_at=NOW() WHERE company_id=$1', [req.user.company_id]);
    }

    // Create invoice
    // FIXED: Use sequential invoice number instead of random to prevent duplicates
    const invPrefix = `INV-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const { rows: [lastInv] } = await db.query(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 || '%' ORDER BY invoice_number DESC LIMIT 1`, [invPrefix]);
    let invSeq = 1;
    if (lastInv) { const parts = lastInv.invoice_number.split('-'); invSeq = parseInt(parts[2]||'0') + 1; }
    const invNum = `${invPrefix}-${String(invSeq).padStart(4,'0')}`;
    const subtotal = amount;
    const vat = Math.round(subtotal * 7) / 100;
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
    await db.query(
      `INSERT INTO invoices (company_id, subscription_id, invoice_number, billing_period_start, billing_period_end, subtotal, vat_amount, total, status, issued_at, due_date)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,'issued',NOW(),$8)`,
      [req.user.company_id, sub.id, invNum, periodEnd.toISOString().slice(0,10), subtotal, vat, subtotal + vat, dueDate.toISOString().slice(0,10)]);

    // FIXED: Removed sessionStorage (browser API, not available in Node.js)
    res.json({ subscription: sub, message: 'อัปเกรดแพลนเรียบร้อย' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/subscription/cancel
router.post('/cancel', async (req, res) => {
  try {
    if (req.user.role !== 'executive') return res.status(403).json({ error: 'PERMISSION_DENIED' });
    const { reason } = req.body;
    const { rows } = await db.query(
      `UPDATE subscriptions SET cancelled_at=NOW(), cancel_reason=$1, updated_at=NOW()
       WHERE company_id=$2 AND status IN ('active','trial','past_due') RETURNING *`,
      [reason || '', req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot cancel' });
    res.json({ subscription: rows[0], message: 'ยกเลิกแล้ว ยังใช้ได้ถึง ' + rows[0].current_period_end });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/subscription/reactivate
router.post('/reactivate', async (req, res) => {
  try {
    if (req.user.role !== 'executive') return res.status(403).json({ error: 'PERMISSION_DENIED' });
    const { rows } = await db.query(
      `UPDATE subscriptions SET cancelled_at=NULL, cancel_reason=NULL, status='active', updated_at=NOW()
       WHERE company_id=$1 AND cancelled_at IS NOT NULL AND current_period_end >= CURRENT_DATE RETURNING *`,
      [req.user.company_id]);
    if (!rows[0]) return res.status(400).json({ error: 'Cannot reactivate' });
    res.json({ subscription: rows[0], message: 'เปิดใช้งานอีกครั้งแล้ว' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscription/invoices
router.get('/invoices', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM invoices WHERE company_id=$1 ORDER BY created_at DESC', [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscription/usage
router.get('/usage', async (req, res) => {
  try {
    const { rows: [sub] } = await db.query(
      'SELECT s.*, p.max_users, p.max_projects, p.max_storage_gb FROM subscriptions s JOIN plans p ON s.plan_id=p.id WHERE s.company_id=$1',
      [req.user.company_id]);
    const { rows: [uc] } = await db.query('SELECT COUNT(*) AS cnt FROM users WHERE company_id=$1 AND is_active=true', [req.user.company_id]);
    const { rows: [pc] } = await db.query("SELECT COUNT(*) AS cnt FROM projects WHERE company_id=$1 AND status!='cancelled'", [req.user.company_id]);
    res.json({
      users: { current: parseInt(uc.cnt), limit: sub?.max_users || null },
      projects: { current: parseInt(pc.cnt), limit: sub?.max_projects || null },
      storage_mb: { current: 0, limit: sub ? (sub.max_storage_gb || 0) * 1024 : null }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
