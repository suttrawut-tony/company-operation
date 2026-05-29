/**
 * Advance overdue checker — runs daily at 08:00 Bangkok time
 * Idempotent: uses warning_notified_at / overdue_notified_at to avoid duplicates
 */
const db = require('../db');

async function checkAdvanceOverdue() {
  console.log(`[cron:advance-overdue] running at ${new Date().toISOString()}`);
  try {
    // 1. Day 5 warning (2 days left): paid advances not yet warned
    const { rows: warnings } = await db.query(`
      SELECT a.id, a.doc_number, a.due_date, a.employee_id, a.company_id,
             u.first_name || ' ' || u.last_name AS employee_name, p.pm_user_id
      FROM advance_requests a
      LEFT JOIN users u ON a.employee_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.advance_type = 'advance' AND a.status = 'paid'
        AND a.due_date IS NOT NULL AND (a.due_date - CURRENT_DATE) = 2
        AND a.warning_notified_at IS NULL`);

    for (const a of warnings) {
      await db.query(
        `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
         VALUES ($1,$2,$3,$4,$5,'advance',$6)`,
        [a.company_id, a.employee_id, 'เหลือเวลาเคลียร์อีก 2 วัน',
         `${a.doc_number} — กรุณาเคลียร์ภายินวันที่ ${a.due_date}`, 'advance.html', a.id]);
      await db.query('UPDATE advance_requests SET warning_notified_at=NOW() WHERE id=$1', [a.id]);
    }

    // 2. Day 7+ (due or overdue): mark overdue, notify employee + PM + finance
    const { rows: overdues } = await db.query(`
      SELECT a.id, a.doc_number, a.due_date, a.employee_id, a.company_id,
             u.first_name || ' ' || u.last_name AS employee_name, p.pm_user_id
      FROM advance_requests a
      LEFT JOIN users u ON a.employee_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.advance_type = 'advance' AND a.status = 'paid'
        AND a.due_date IS NOT NULL AND a.due_date <= CURRENT_DATE
        AND a.overdue_notified_at IS NULL`);

    for (const a of overdues) {
      await db.query(
        "UPDATE advance_requests SET status='overdue', overdue_notified_at=NOW(), updated_at=NOW() WHERE id=$1", [a.id]);

      // Notify employee
      await db.query(
        `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
         VALUES ($1,$2,$3,$4,$5,'advance',$6)`,
        [a.company_id, a.employee_id, 'เกินกำหนดเคลียร์เงินทดรอง!',
         `${a.doc_number} เกินกำหนดแล้ว — ไม่สามารถสร้างรายการใหม่ได้จนกว่าจะเคลียร์`, 'advance.html', a.id]);

      // Notify PM
      if (a.pm_user_id) {
        await db.query(
          `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
           VALUES ($1,$2,$3,$4,$5,'advance',$6)`,
          [a.company_id, a.pm_user_id, 'พนักงานเกินกำหนดเคลียร์เงินทดรอง',
           `${a.employee_name} — ${a.doc_number} เกินกำหนดเคลียร์`, 'advance.html', a.id]);
      }

      // Notify all finance users
      const { rows: finUsers } = await db.query(
        "SELECT id FROM users WHERE company_id=$1 AND role IN ('finance','executive') AND is_active=true", [a.company_id]);
      for (const fu of finUsers) {
        await db.query(
          `INSERT INTO notifications (company_id, user_id, title, body, link_url, doc_type, doc_id)
           VALUES ($1,$2,$3,$4,$5,'advance',$6)`,
          [a.company_id, fu.id, 'Advance Overdue Alert',
           `${a.employee_name} — ${a.doc_number} เกินกำหนดเคลียร์`, 'advance.html', a.id]);
      }
    }

    const total = warnings.length + overdues.length;
    if (total > 0) console.log(`[cron:advance-overdue] ${warnings.length} warnings, ${overdues.length} overdue`);
    else console.log('[cron:advance-overdue] no actions needed');
  } catch (err) {
    console.error('[cron:advance-overdue] error:', err.message);
  }
}

module.exports = { checkAdvanceOverdue };
