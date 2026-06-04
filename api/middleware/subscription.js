/**
 * Subscription Guard Middleware
 * Checks subscription status on every request (cached 5 min)
 */
const db = require('../db');

const cache = new Map(); // companyId → { data, expiry }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSubscription(companyId) {
  const cached = cache.get(companyId);
  if (cached && cached.expiry > Date.now()) return cached.data;
  const { rows: [sub] } = await db.query(
    `SELECT s.*, p.name AS plan_name, p.max_users, p.max_projects, p.max_storage_gb, p.modules_included
     FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.company_id = $1`, [companyId]);
  cache.set(companyId, { data: sub || null, expiry: Date.now() + CACHE_TTL });
  return sub || null;
}

function clearCache(companyId) { if (companyId) cache.delete(companyId); else cache.clear(); }

function requireActiveSubscription() {
  return async (req, res, next) => {
    // Skip for public routes
    const path = req.originalUrl || req.path || '';
    if (path.startsWith('/api/auth') || path.startsWith('/api/subscription/register') || path.startsWith('/api/subscription/plans') || path.startsWith('/api/health')) return next();

    if (!req.user || !req.user.company_id) return next();
    if (req.user.is_superadmin) return next();

    const sub = await getSubscription(req.user.company_id);
    if (!sub) return next(); // No subscription record = legacy company, allow

    const now = new Date();

    if (sub.status === 'suspended') {
      return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'บัญชีถูกระงับ กรุณาติดต่อฝ่ายสนับสนุน' });
    }

    if (sub.status === 'trial') {
      if (sub.trial_ends_at && new Date(sub.trial_ends_at) < now) {
        // Trial expired but not yet updated by cron
        if (req.method !== 'GET' && !path.startsWith('/api/subscription')) {
          return res.status(402).json({ error: 'TRIAL_EXPIRED', message: 'ช่วงทดลองใช้หมดแล้ว กรุณาเลือกแพลนเพื่อใช้งานต่อ' });
        }
      }
      return next();
    }

    if (sub.status === 'active') return next();

    if (sub.status === 'past_due') {
      res.set('X-Subscription-Warning', 'past_due');
      return next();
    }

    if (sub.status === 'cancelled' || sub.status === 'expired') {
      if (sub.current_period_end && new Date(sub.current_period_end) >= now) return next(); // Still within period
      if (req.method !== 'GET' && !path.startsWith('/api/subscription')) {
        return res.status(402).json({ error: 'SUBSCRIPTION_EXPIRED', message: 'Subscription หมดอายุแล้ว กรุณาต่ออายุ' });
      }
      return next();
    }

    next();
  };
}

function checkUsageLimit(metric) {
  return async (req, res, next) => {
    if (!req.user || !req.user.company_id) return next();
    if (req.user.is_superadmin) return next();

    const sub = await getSubscription(req.user.company_id);
    if (!sub) return next();

    let current = 0, limit = null;
    if (metric === 'users') {
      const { rows: [r] } = await db.query('SELECT COUNT(*) AS cnt FROM users WHERE company_id=$1 AND is_active=true', [req.user.company_id]);
      current = parseInt(r.cnt); limit = sub.max_users;
    } else if (metric === 'projects') {
      const { rows: [r] } = await db.query("SELECT COUNT(*) AS cnt FROM projects WHERE company_id=$1 AND status!='cancelled'", [req.user.company_id]);
      current = parseInt(r.cnt); limit = sub.max_projects;
    }

    if (limit !== null && current >= limit) {
      return res.status(402).json({
        error: 'LIMIT_REACHED',
        message: `ถึงจำนวนสูงสุดของแพลนแล้ว (${current}/${limit})`,
        metric, current, limit
      });
    }
    next();
  };
}

module.exports = { requireActiveSubscription, checkUsageLimit, clearCache, getSubscription };
