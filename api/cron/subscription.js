/**
 * Subscription billing cron — daily 00:01
 * Handles: trial expiry, invoice generation, past due, auto suspend, usage snapshot
 * Idempotent: safe to run multiple times
 */
const db = require('../db');

async function checkSubscriptions() {
  console.log(`[cron:subscription] running at ${new Date().toISOString()}`);
  let actions = 0;
  try {
    // 1. Trial warning (3 days left)
    const { rows: warnings } = await db.query(`
      SELECT s.id, s.company_id, s.trial_ends_at,
        (SELECT id FROM users WHERE company_id=s.company_id AND role='executive' AND is_active=true LIMIT 1) AS exec_id
      FROM subscriptions s
      WHERE s.status='trial' AND s.trial_ends_at IS NOT NULL
        AND s.trial_ends_at::date - CURRENT_DATE BETWEEN 1 AND 3
        AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.company_id=s.company_id AND n.doc_type='subscription' AND n.title LIKE '%ทดลองใช้จะหมด%' AND n.created_at > CURRENT_DATE - INTERVAL '1 day')`);
    for (const w of warnings) {
      const daysLeft = Math.ceil((new Date(w.trial_ends_at) - new Date()) / 86400000);
      if (w.exec_id) {
        await db.query(
          `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type)
           VALUES ($1,$2,$3,$4,'setup.html#subscription','subscription')`,
          [w.company_id, w.exec_id, `ช่วงทดลองใช้จะหมดในอีก ${daysLeft} วัน`, 'กรุณาเลือกแพลนเพื่อใช้งานต่อ']);
      }
      actions++;
    }

    // 2. Trial expired
    const { rows: expired } = await db.query(`
      UPDATE subscriptions SET status='expired', updated_at=NOW()
      WHERE status='trial' AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW()
      RETURNING company_id`);
    for (const e of expired) {
      const { rows: [exec] } = await db.query("SELECT id FROM users WHERE company_id=$1 AND role='executive' AND is_active=true LIMIT 1", [e.company_id]);
      if (exec) {
        await db.query(
          `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type)
           VALUES ($1,$2,'ช่วงทดลองใช้หมดแล้ว','กรุณาเลือกแพลนเพื่อใช้งานต่อ','setup.html#subscription','subscription')`,
          [e.company_id, exec.id]);
      }
      actions++;
    }

    // 3. Invoice generation (active + billing date = today)
    const { rows: toBill } = await db.query(`
      SELECT s.*, p.price_monthly, p.price_yearly
      FROM subscriptions s JOIN plans p ON s.plan_id=p.id
      WHERE s.status='active' AND s.next_billing_date=CURRENT_DATE
        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.subscription_id=s.id AND i.billing_period_start=CURRENT_DATE)`);
    for (const s of toBill) {
      const amount = s.billing_cycle === 'yearly' ? parseFloat(s.price_yearly) : parseFloat(s.price_monthly);
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (s.billing_cycle === 'yearly' ? 12 : 1));
      const subtotal = amount;
      const vat = Math.round(subtotal * 7) / 100;
      const invNum = `INV-${new Date().toISOString().slice(0,7).replace('-','')}-${String(Math.floor(Math.random()*9999)).padStart(4,'0')}`;
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      await db.query(
        `INSERT INTO invoices (company_id, subscription_id, invoice_number, billing_period_start, billing_period_end, subtotal, vat_amount, total, status, issued_at, due_date)
         VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,'issued',NOW(),$8)`,
        [s.company_id, s.id, invNum, periodEnd.toISOString().slice(0,10), subtotal, vat, subtotal+vat, dueDate.toISOString().slice(0,10)]);
      await db.query(
        `UPDATE subscriptions SET current_period_start=CURRENT_DATE, current_period_end=$1, next_billing_date=$1, updated_at=NOW() WHERE id=$2`,
        [periodEnd.toISOString().slice(0,10), s.id]);
      actions++;
    }

    // 4. Past due (invoice overdue)
    const { rows: overdue } = await db.query(`
      UPDATE invoices SET status='overdue'
      WHERE status='issued' AND due_date < CURRENT_DATE RETURNING company_id, subscription_id`);
    const pastDueCompanies = [...new Set(overdue.map(o => o.company_id))];
    for (const cid of pastDueCompanies) {
      await db.query("UPDATE subscriptions SET status='past_due', updated_at=NOW() WHERE company_id=$1 AND status='active'", [cid]);
      actions++;
    }

    // 5. Auto suspend (past_due > 14 days)
    const { rows: toSuspend } = await db.query(`
      SELECT DISTINCT s.company_id FROM subscriptions s
      JOIN invoices i ON i.subscription_id=s.id
      WHERE s.status='past_due' AND i.status='overdue' AND i.due_date < CURRENT_DATE - INTERVAL '14 days'`);
    for (const ts of toSuspend) {
      await db.query("UPDATE subscriptions SET status='suspended', updated_at=NOW() WHERE company_id=$1", [ts.company_id]);
      actions++;
    }

    // 6. Usage snapshot
    await db.query(`
      INSERT INTO usage_tracking (company_id, metric, current_value, limit_value)
      SELECT c.id, 'users', (SELECT COUNT(*) FROM users WHERE company_id=c.id AND is_active=true), p.max_users
      FROM companies c JOIN subscriptions s ON s.company_id=c.id JOIN plans p ON s.plan_id=p.id
      ON CONFLICT (company_id, metric, recorded_at) DO UPDATE SET current_value=EXCLUDED.current_value`);
    await db.query(`
      INSERT INTO usage_tracking (company_id, metric, current_value, limit_value)
      SELECT c.id, 'projects', (SELECT COUNT(*) FROM projects WHERE company_id=c.id AND status!='cancelled'), p.max_projects
      FROM companies c JOIN subscriptions s ON s.company_id=c.id JOIN plans p ON s.plan_id=p.id
      ON CONFLICT (company_id, metric, recorded_at) DO UPDATE SET current_value=EXCLUDED.current_value`);

    if (actions) console.log(`[cron:subscription] ${actions} actions`);
    else console.log('[cron:subscription] no actions needed');
  } catch (err) {
    console.error('[cron:subscription] error:', err.message);
  }
}

module.exports = { checkSubscriptions };
