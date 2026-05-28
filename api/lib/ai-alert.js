/**
 * SDA Operation — AI Alert Generator
 * Uses simple rules + trend analysis to generate executive alerts
 * Phase 2: integrate Claude API for smarter alerts
 */

const db = require('../db');

async function generateAlerts(companyId) {
  const alerts = [];

  // 1. Budget alerts — projects near/over budget
  const { rows: budgets } = await db.query(
    `SELECT b.*, p.code AS project_code, p.name AS project_name
     FROM budgets b JOIN projects p ON b.project_id = p.id
     WHERE b.company_id = $1 AND b.status = 'approved'`, [companyId]);

  for (const b of budgets) {
    const pctUsed = b.total_budget > 0 ? (b.total_actual / b.total_budget) * 100 : 0;
    if (pctUsed > 100) {
      alerts.push({
        level: 'critical',
        type: 'budget_over',
        title: `${b.project_code} — Over Budget`,
        message: `Budget exceeded by ฿${Math.round(b.total_actual - b.total_budget).toLocaleString()} (${pctUsed.toFixed(0)}%)`,
        docType: 'budget', docId: b.id,
      });
    } else if (pctUsed > 90) {
      alerts.push({
        level: 'warning',
        type: 'budget_near',
        title: `${b.project_code} — Budget almost exhausted`,
        message: `${pctUsed.toFixed(0)}% used — ฿${Math.round(b.total_budget - b.total_actual).toLocaleString()} remaining`,
        docType: 'budget', docId: b.id,
      });
    }
  }

  // 2. Approval aging — items pending > 24 hours
  const { rows: staleApprovals } = await db.query(
    `SELECT doc_number, 'pr' AS doc_type, total_amount AS amount, status, created_at
     FROM purchase_requests WHERE company_id = $1 AND status LIKE 'pending_%'
       AND created_at < NOW() - INTERVAL '24 hours'
     UNION ALL
     SELECT doc_number, 'expense', amount, status, created_at
     FROM expenses WHERE company_id = $1 AND status LIKE 'pending_%'
       AND created_at < NOW() - INTERVAL '24 hours'`,
    [companyId]);

  for (const doc of staleApprovals) {
    const hoursAgo = Math.round((Date.now() - new Date(doc.created_at)) / 3600000);
    alerts.push({
      level: 'warning',
      type: 'approval_aging',
      title: `${doc.doc_number} — Pending ${Math.round(hoursAgo / 24)} days`,
      message: `Awaiting approval for ${hoursAgo}+ hours (SLA: 24h)`,
      docType: doc.doc_type, docId: null,
    });
  }

  // 3. Expense anomaly — monthly spend > 130% of average
  const { rows: [monthlyAvg] } = await db.query(
    `SELECT AVG(monthly_total) AS avg_total FROM (
       SELECT date_trunc('month', doc_date) AS month, SUM(amount) AS monthly_total
       FROM expenses WHERE company_id = $1 AND status IN ('approved','paid','sent_to_sap')
       GROUP BY date_trunc('month', doc_date)
     ) sub`, [companyId]);

  if (monthlyAvg?.avg_total > 0) {
    const { rows: [currentMonth] } = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
       WHERE company_id = $1 AND date_trunc('month', doc_date) = date_trunc('month', CURRENT_DATE)
       AND status IN ('approved','paid','sent_to_sap')`, [companyId]);

    const ratio = currentMonth.total / monthlyAvg.avg_total;
    if (ratio > 1.3) {
      alerts.push({
        level: 'info',
        type: 'expense_anomaly',
        title: 'Monthly expense above average',
        message: `This month ฿${Math.round(currentMonth.total).toLocaleString()} — ${Math.round((ratio - 1) * 100)}% above average`,
        docType: 'expense', docId: null,
      });
    }
  }

  return alerts.sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[a.level] - priority[b.level];
  });
}

module.exports = { generateAlerts };
