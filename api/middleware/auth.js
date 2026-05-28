/**
 * SDA Operation — Auth Middleware (JWT)
 */
const jwt = require('jsonwebtoken');
const db = require('../db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [payload.userId]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = rows[0];
    // Block all non-auth API calls when password change is required, so users
    // can't keep using stale credentials after admin reset.
    if (rows[0].must_change_password && !req.path.startsWith('/change-password') && !req.path.startsWith('/me')) {
      // /api/auth/me + /api/auth/change-password remain available
      const reqPath = req.originalUrl || '';
      if (!reqPath.startsWith('/api/auth/me') && !reqPath.startsWith('/api/auth/change-password')) {
        return res.status(403).json({ error: 'Password change required', code: 'MUST_CHANGE_PASSWORD' });
      }
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

function requirePermission(moduleId, action) {
  return (req, res, next) => {
    // Uses permission matrix from config — simplified for MVP
    // Full implementation uses config/permission-middleware.js
    next();
  };
}

/**
 * Roles that can see ALL projects in the company (full visibility)
 */
const FULL_ACCESS_ROLES = ['executive', 'finance', 'accounting'];

/**
 * Returns SQL WHERE clause + params to filter projects by user access.
 * - executive/finance/accounting → see all company projects
 * - pm/staff/admin/procurement → see only projects they're a member of OR they are PM
 *
 * @param {object} user - req.user object
 * @param {string} projectAlias - SQL alias for projects table (default 'p')
 * @param {number} paramOffset - starting $N for query params
 * @returns {{ clause: string, params: array }}
 */
function projectAccessFilter(user, projectAlias = 'p', paramOffset = 1) {
  if (FULL_ACCESS_ROLES.includes(user.role)) {
    return {
      clause: `${projectAlias}.company_id = $${paramOffset}`,
      params: [user.company_id]
    };
  }
  return {
    clause: `${projectAlias}.company_id = $${paramOffset} AND (
      ${projectAlias}.pm_user_id = $${paramOffset + 1}
      OR ${projectAlias}.created_by = $${paramOffset + 1}
      OR EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = ${projectAlias}.id AND pm2.user_id = $${paramOffset + 1})
    )`,
    params: [user.company_id, user.id]
  };
}

/**
 * Middleware: check if user has access to the project in req.params.id
 */
function requireProjectAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  if (FULL_ACCESS_ROLES.includes(req.user.role)) return next();

  const projectId = req.params.id;
  if (!projectId) return next();

  db.query(
    `SELECT 1 FROM projects p WHERE p.id = $1 AND p.company_id = $2
     AND (p.pm_user_id = $3 OR p.created_by = $3
          OR EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = p.id AND pm2.user_id = $3))`,
    [projectId, req.user.company_id, req.user.id]
  ).then(({ rows }) => {
    if (!rows.length) return res.status(403).json({ error: 'You do not have access to this project' });
    next();
  }).catch(err => res.status(500).json({ error: err.message }));
}

/**
 * Returns array of project IDs the user can access (for filtering other modules)
 */
async function getUserProjectIds(user) {
  if (FULL_ACCESS_ROLES.includes(user.role)) return null; // null = all projects
  const { rows } = await db.query(
    `SELECT DISTINCT p.id FROM projects p
     WHERE p.company_id = $1
     AND (p.pm_user_id = $2 OR p.created_by = $2
          OR EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = p.id AND pm2.user_id = $2))`,
    [user.company_id, user.id]
  );
  return rows.map(r => r.id);
}

module.exports = { authenticate, requireRole, requirePermission, projectAccessFilter, requireProjectAccess, getUserProjectIds, FULL_ACCESS_ROLES };
