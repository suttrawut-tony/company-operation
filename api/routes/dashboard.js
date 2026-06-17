const router = require('express').Router();
const db = require('../db');
const { authenticate, getUserProjectIds } = require('../middleware/auth');
router.use(authenticate);

// GET /api/dashboard — KPI summary (filtered by project access)
router.get('/', async (req, res) => {
  try {
    const cid = req.user.company_id;
    const projectIds = await getUserProjectIds(req.user);
    // projectIds = null means full access, otherwise array of allowed project IDs

    // Build project filter clause for tables that have project_id
    let projFilter = '';
    let projFilterBudget = '';
    const baseParams = [cid];
    if (projectIds !== null) {
      if (projectIds.length === 0) {
        // User has no projects — return zeros
        return res.json({
          kpi: { activeProjects: 0, budgetUsed: 0, budgetTotal: 0, pendingApprovals: 0, expenseThisMonth: 0 },
          projects: [],
        });
      }
      projFilter = ` AND project_id = ANY($2)`;
      projFilterBudget = ` AND project_id = ANY($2)`;
      baseParams.push(projectIds);
    }

    const [projects, budgetUsed, pendingApprovals, expenseMonth] = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM projects WHERE company_id = $1 AND status = 'active'${projFilter.replace('project_id','id')}`, baseParams),
      db.query(`SELECT COALESCE(SUM(total_actual),0) AS used, COALESCE(SUM(total_budget),0) AS total FROM budgets WHERE company_id = $1 AND status = 'approved'${projFilterBudget}`, baseParams),
      db.query(`SELECT
        (SELECT COUNT(*) FROM purchase_requests WHERE company_id = $1 AND status::text LIKE 'pending_%'${projFilter}) +
        (SELECT COUNT(*) FROM expenses WHERE company_id = $1 AND status::text LIKE 'pending_%'${projFilter}) +
        (SELECT COUNT(*) FROM budgets WHERE company_id = $1 AND status::text LIKE 'pending_%'${projFilterBudget}) +
        (SELECT COUNT(*) FROM ot_requests WHERE company_id = $1 AND status::text LIKE 'pending_%'${projFilter})
        AS count`, baseParams),
      db.query(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE company_id = $1
        AND date_trunc('month', doc_date) = date_trunc('month', CURRENT_DATE)${projFilter}`, baseParams),
    ]);

    // Project list with progress (filtered)
    const { rows: projectList } = await db.query(
      `SELECT id, code, name, status, progress FROM projects WHERE company_id = $1 AND status = 'active'${projFilter.replace('project_id','id')} ORDER BY progress DESC LIMIT 10`, baseParams);

    res.json({
      kpi: {
        activeProjects: parseInt(projects.rows[0].count),
        budgetUsed: parseFloat(budgetUsed.rows[0].used),
        budgetTotal: parseFloat(budgetUsed.rows[0].total),
        pendingApprovals: parseInt(pendingApprovals.rows[0].count),
        expenseThisMonth: parseFloat(expenseMonth.rows[0].total),
      },
      projects: projectList,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/my-tasks — Tasks assigned to current user
router.get('/my-tasks', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, p.code AS project_code, p.name AS project_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.assigned_to = $1 AND t.status != 'done'
       ORDER BY
         CASE WHEN t.due_date < NOW() THEN 0 ELSE 1 END,
         t.due_date ASC NULLS LAST,
         CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
       LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/pending-convert — Bookings confirmed, waiting to convert to SQ
router.get('/pending-convert', async (req, res) => {
  try {
    const allowedRoles = ['executive','pm','admin','procurement'];
    if (!allowedRoles.includes(req.user.role)) return res.json([]);
    let q = `SELECT b.id, b.title, b.booking_type, b.status, b.customer_name,
      b.start_date, b.end_date, b.updated_at, b.recommended_kwp, b.site_name, b.location,
      p.code AS project_code, p.name AS project_name,
      jo.job_order_number,
      u.first_name || ' ' || u.last_name AS booked_by_name,
      COALESCE(bi.item_count, 0) AS item_count,
      EXTRACT(DAY FROM NOW() - b.updated_at) AS days_waiting
      FROM bookings b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN job_orders jo ON b.job_order_id = jo.id
      LEFT JOIN users u ON b.booked_by = u.id
      LEFT JOIN (SELECT booking_id, COUNT(*) AS item_count FROM booking_items GROUP BY booking_id) bi ON bi.booking_id = b.id
      WHERE b.company_id = $1 AND b.status IN ('confirmed','survey_completed') AND b.booking_type IN ('solar','technician')`;
    const params = [req.user.company_id];
    if (req.user.role === 'staff') { params.push(req.user.id); q += ` AND b.booked_by = $${params.length}`; }
    q += ' ORDER BY b.updated_at ASC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/my-tasks-all — All tasks for current user (with date range + done)
router.get('/my-tasks-all', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let q = `SELECT t.*, p.code AS project_code, p.name AS project_name,
      u.first_name, u.last_name, u.first_name_th
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.assigned_to = $1`;
    const params = [req.user.id];
    if (start_date) { params.push(start_date); q += ` AND (t.due_date >= $${params.length} OR t.start_date >= $${params.length})`; }
    if (end_date) { params.push(end_date); q += ` AND (t.due_date <= $${params.length} OR t.start_date <= $${params.length})`; }
    q += ` ORDER BY t.due_date ASC NULLS LAST, CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/expense-trend — Monthly expense totals (last 6 months)
router.get('/expense-trend', async (req, res) => {
  try {
    const cid = req.user.company_id;
    const { rows } = await db.query(`
      SELECT
        TO_CHAR(date_trunc('month', doc_date), 'YYYY-MM') AS month,
        TO_CHAR(date_trunc('month', doc_date), 'Mon') AS label,
        COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE company_id = $1
        AND doc_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY date_trunc('month', doc_date)
      ORDER BY month
    `, [cid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/budget-by-project — Budget usage per project (top 8)
router.get('/budget-by-project', async (req, res) => {
  try {
    const cid = req.user.company_id;
    const projectIds = await getUserProjectIds(req.user);
    let filter = '';
    const params = [cid];
    if (projectIds !== null && projectIds.length > 0) {
      filter = ' AND b.project_id = ANY($2)';
      params.push(projectIds);
    }
    const { rows } = await db.query(`
      SELECT p.code, p.name,
        COALESCE(b.total_budget, 0) AS budget,
        COALESCE(b.total_actual, 0) AS actual
      FROM budgets b
      JOIN projects p ON b.project_id = p.id
      WHERE b.company_id = $1 AND b.status = 'approved'${filter}
      ORDER BY b.total_budget DESC
      LIMIT 8
    `, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
