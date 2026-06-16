const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/reports/cashflow — Cash Flow Forecast (เงินเข้า/เงินออก รายเดือน)
router.get('/cashflow', async (req, res) => {
  try {
    const cid = req.user.company_id;
    const { from, to } = req.query;

    // Build optional date filter
    let dateFilterPO = '';
    let dateFilterPP = '';
    const params = [cid];
    let paramIdx = 2;

    if (from) {
      dateFilterPO += ` AND po.doc_date >= $${paramIdx}`;
      dateFilterPP += ` AND COALESCE(pp.expected_date, pp.invoice_date) >= $${paramIdx}`;
      params.push(from);
      paramIdx++;
    }
    if (to) {
      dateFilterPO += ` AND po.doc_date <= $${paramIdx}`;
      dateFilterPP += ` AND COALESCE(pp.expected_date, pp.invoice_date) <= $${paramIdx}`;
      params.push(to);
      paramIdx++;
    }

    // ═══ Cash Out: POs approved but not fully paid ═══
    // Outstanding = PO total_amount minus any paid AP invoices linked to that PO
    const { rows: cashOutRows } = await db.query(`
      SELECT
        to_char(COALESCE(po.doc_date, po.created_at), 'YYYY-MM') AS month,
        SUM(
          po.total_amount - COALESCE(paid.paid_total, 0)
        ) AS amount
      FROM purchase_orders po
      LEFT JOIN (
        SELECT po_id, SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS paid_total
        FROM ap_invoices
        GROUP BY po_id
      ) paid ON paid.po_id = po.id
      WHERE po.company_id = $1
        AND po.status IN ('approved', 'sent_to_sap', 'received')
        AND (po.total_amount - COALESCE(paid.paid_total, 0)) > 0
        ${dateFilterPO}
      GROUP BY 1
      ORDER BY 1
    `, params);

    // ═══ Cash In: phase_payments (งวดงาน plan) not yet fully received ═══
    const { rows: cashInRows } = await db.query(`
      SELECT
        to_char(COALESCE(pp.expected_date, pp.invoice_date, pp.created_at), 'YYYY-MM') AS month,
        SUM(pp.amount - COALESCE(pp.received_amount, 0)) AS amount
      FROM phase_payments pp
      WHERE pp.project_id IN (SELECT id FROM projects WHERE company_id = $1)
        AND pp.status IN ('pending', 'invoiced', 'partially_paid')
        AND (pp.amount - COALESCE(pp.received_amount, 0)) > 0
        ${dateFilterPP}
      GROUP BY 1
      ORDER BY 1
    `, params);

    // Merge months
    const monthSet = new Set();
    cashOutRows.forEach(r => monthSet.add(r.month));
    cashInRows.forEach(r => monthSet.add(r.month));
    const months = [...monthSet].sort();

    const outMap = {};
    cashOutRows.forEach(r => { outMap[r.month] = parseFloat(r.amount) || 0; });
    const inMap = {};
    cashInRows.forEach(r => { inMap[r.month] = parseFloat(r.amount) || 0; });

    const cash_in = months.map(m => inMap[m] || 0);
    const cash_out = months.map(m => outMap[m] || 0);
    const net = months.map((m, i) => cash_in[i] - cash_out[i]);

    res.json({ months, cash_in, cash_out, net });
  } catch (err) {
    console.error('Cashflow report error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
