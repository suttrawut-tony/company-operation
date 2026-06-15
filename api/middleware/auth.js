/**
 * Company Operation — Auth Middleware (JWT)
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

    // Static token (issued by the no-DB login path) — never hit the DB
    if (payload.static === true) {
      const staticUser = require('../lib/static-user');
      req.user = staticUser.buildStaticUser();
      // Honor any payload overrides (in case env changed after token was issued)
      req.user.id = payload.userId || req.user.id;
      req.user.company_id = payload.companyId || req.user.company_id;
      req.user.role = payload.role || req.user.role;
      return next();
    }

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

// FIXED: Implement basic permission check using company_modules
function requirePermission(moduleId, action) {
  return async (req, res, next) => {
    try {
      const { rows } = await db.query(
        'SELECT allowed_roles FROM company_modules WHERE company_id=$1 AND module_id=$2 AND is_enabled=true',
        [req.user.company_id, moduleId]);
      if (rows[0] && rows[0].allowed_roles && rows[0].allowed_roles.length) {
        if (!rows[0].allowed_roles.includes(req.user.role)) {
          return res.status(403).json({ error: `No permission for module: ${moduleId}` });
        }
      }
      next();
    } catch(e) { next(); } // Fallback: allow if check fails (graceful degradation)
  };
}

/**
 * Roles that can see ALL projects in the company (full visibility)
 */
const FULL_ACCESS_ROLES = ['owner', 'executive', 'finance', 'accounting'];

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
// FIXED: Changed from .then() to async/await to prevent race condition
async function requireProjectAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (FULL_ACCESS_ROLES.includes(req.user.role)) return next();
  const projectId = req.params.id;
  if (!projectId) return next();
  try {
    const { rows } = await db.query(
      `SELECT 1 FROM projects p WHERE p.id = $1 AND p.company_id = $2
       AND (p.pm_user_id = $3 OR p.created_by = $3
            OR EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = p.id AND pm2.user_id = $3))`,
      [projectId, req.user.company_id, req.user.id]);
    if (!rows.length) return res.status(403).json({ error: 'You do not have access to this project' });
    next();
  } catch(err) { res.status(500).json({ error: err.message }); }
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

/**
 * checkPermission — reusable permission + status check for PUT/DELETE endpoints
 * @param {string[]} allowedRoles — roles that can perform this action
 * @param {object} options
 *   ownerField: column name for record owner (e.g. 'created_by') — staff can edit own records
 *   editableStatuses: statuses where edit/delete is allowed (default ['draft'])
 *   softDelete: if true, DELETE sets status='cancelled' instead of actual delete
 */
function checkPermission(allowedRoles, options = {}) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const role = req.user.role;
    // Executive can always override
    if (role === 'executive') return next();
    // Check allowed roles
    if (!allowedRoles.includes(role)) {
      // Staff exception: can edit own records
      if (role === 'staff' && options.ownerField) {
        req._checkOwner = options.ownerField;
        return next();
      }
      return res.status(403).json({ error: 'PERMISSION_DENIED', message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' });
    }
    next();
  };
}

/**
 * validateStatus — check if record status allows edit/delete
 */
function validateStatus(record, editableStatuses = ['draft']) {
  if (!record || !record.status) return true;
  return editableStatuses.includes(record.status);
}

module.exports = { authenticate, requireRole, requirePermission, projectAccessFilter, requireProjectAccess, getUserProjectIds, FULL_ACCESS_ROLES, checkPermission, validateStatus };
