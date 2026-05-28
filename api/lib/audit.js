/**
 * SDA Operation — Auth audit log helper
 * Never throws — failures are logged but the calling route should not be blocked.
 */
const db = require('../db');

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.ip
      || req.socket?.remoteAddress
      || null;
}

async function record(req, { userId = null, emailTried = null, event, success, detail = null }) {
  try {
    await db.query(
      `INSERT INTO auth_audit_log (user_id, email_tried, event, success, ip, user_agent, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, emailTried, event, success, clientIp(req), req.headers['user-agent'] || null, detail]
    );
  } catch (err) {
    console.error('[audit] failed to record %s: %s', event, err.message);
  }
}

module.exports = { record, clientIp };
