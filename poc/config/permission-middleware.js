/**
 * SDA Operation — Permission Middleware
 * ตรวจสอบสิทธิ์ทั้ง Frontend guard + Backend middleware
 */

// ─────────────────────────────────────────────
// Frontend: Permission Check Functions
// ─────────────────────────────────────────────

/**
 * Check if user has permission for a specific action on a module
 * @param {object} user - Current user object { role, id }
 * @param {string} moduleId - Module ID (e.g., 'budget', 'pr_po')
 * @param {string} action - Action (e.g., 'view', 'create', 'approve')
 * @param {object} [record] - Optional record to check ownership
 * @returns {boolean}
 */
function hasPermission(user, moduleId, action, record = null) {
  const matrix = typeof PERMISSION_MATRIX !== 'undefined'
    ? PERMISSION_MATRIX
    : require('./roles').PERMISSION_MATRIX;

  const rolePerms = matrix[user.role];
  if (!rolePerms) return false;

  const modulePerms = rolePerms[moduleId];
  if (!modulePerms) return false;

  const value = modulePerms[action];

  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  // 'own' — check record ownership
  if (value === 'own') {
    if (!record) return true;  // No record context = allow (list will be filtered)
    return record.created_by === user.id || record.assigned_to === user.id;
  }

  return false;
}

/**
 * Get all visible modules for a user's role
 * @param {string} role
 * @returns {string[]} array of module IDs
 */
function getVisibleModules(role) {
  const matrix = typeof PERMISSION_MATRIX !== 'undefined'
    ? PERMISSION_MATRIX
    : require('./roles').PERMISSION_MATRIX;

  const rolePerms = matrix[role];
  if (!rolePerms) return [];

  return Object.entries(rolePerms)
    .filter(([_, perms]) => perms.view === true || perms.view === 1 || perms.view === 'own')
    .map(([moduleId]) => moduleId);
}

/**
 * Get all actions a user can perform on a module
 * @param {string} role
 * @param {string} moduleId
 * @returns {object} { view: true, create: false, edit: 'own', ... }
 */
function getModulePermissions(role, moduleId) {
  const matrix = typeof PERMISSION_MATRIX !== 'undefined'
    ? PERMISSION_MATRIX
    : require('./roles').PERMISSION_MATRIX;

  return matrix[role]?.[moduleId] || {};
}

/**
 * Check if user can approve a specific amount
 * @param {object} user
 * @param {number} amount
 * @returns {boolean}
 */
function canApproveAmount(user, amount) {
  const roles = typeof ROLES !== 'undefined' ? ROLES : require('./roles').ROLES;
  const roleKey = Object.keys(roles).find(k => roles[k].id === user.role);
  if (!roleKey) return false;
  return amount <= roles[roleKey].maxApprovalAmount;
}

// ─────────────────────────────────────────────
// Frontend: UI Guards
// ─────────────────────────────────────────────

/**
 * Show/hide UI elements based on permissions
 * Usage: <div data-perm="budget:create">...</div>
 */
function applyPermissionGuards(user) {
  document.querySelectorAll('[data-perm]').forEach(el => {
    const [moduleId, action] = el.dataset.perm.split(':');
    if (!hasPermission(user, moduleId, action)) {
      el.style.display = 'none';
    }
  });
}

/**
 * Show/hide tab navigation items based on permissions
 * Usage: <a class="tab-item" data-module="budget">Budget</a>
 */
function applyTabGuards(user) {
  document.querySelectorAll('[data-module]').forEach(tab => {
    const moduleId = tab.dataset.module;
    if (!hasPermission(user, moduleId, 'view')) {
      tab.style.display = 'none';
    }
  });
}

/**
 * Filter records to only show user's own records when permission = 'own'
 * @param {object} user
 * @param {string} moduleId
 * @param {Array} records
 * @returns {Array}
 */
function filterOwnRecords(user, moduleId, records) {
  const perms = getModulePermissions(user.role, moduleId);
  if (perms.view === true || perms.view === 1) return records;
  if (perms.view === 'own') {
    return records.filter(r => r.created_by === user.id || r.assigned_to === user.id);
  }
  return [];
}

// ─────────────────────────────────────────────
// Backend: Express Middleware
// ─────────────────────────────────────────────

/**
 * Express middleware factory
 * Usage: app.get('/api/budget', requirePermission('budget', 'view'), handler)
 */
function requirePermission(moduleId, action) {
  return (req, res, next) => {
    const user = req.user;  // assumes auth middleware sets req.user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(user, moduleId, action)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role "${user.role}" does not have "${action}" permission on "${moduleId}"`,
      });
    }

    next();
  };
}

/**
 * Express middleware: filter query results for 'own' permissions
 * Attaches a filter function to req that route handlers can use
 */
function attachOwnershipFilter(moduleId) {
  return (req, res, next) => {
    const user = req.user;
    const perms = getModulePermissions(user.role, moduleId);

    if (perms.view === 'own') {
      req.ownerFilter = { $or: [{ created_by: user.id }, { assigned_to: user.id }] };
    } else {
      req.ownerFilter = {};  // no filter = see all
    }

    next();
  };
}

/**
 * Express middleware: check approval authority for amount
 * Usage: app.post('/api/budget/:id/approve', requireApproval('budget'), handler)
 */
function requireApproval(moduleId) {
  return (req, res, next) => {
    const user = req.user;

    if (!hasPermission(user, moduleId, 'approve')) {
      return res.status(403).json({ error: 'You do not have approval rights for this module' });
    }

    const amount = req.body.amount || 0;
    if (!canApproveAmount(user, amount)) {
      return res.status(403).json({
        error: 'Amount exceeds your approval limit',
        yourLimit: getApprovalLimit(user),
        requestedAmount: amount,
      });
    }

    next();
  };
}

function getApprovalLimit(user) {
  const roles = typeof ROLES !== 'undefined' ? ROLES : require('./roles').ROLES;
  const roleKey = Object.keys(roles).find(k => roles[k].id === user.role);
  return roleKey ? roles[roleKey].maxApprovalAmount : 0;
}

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports = {
    hasPermission,
    getVisibleModules,
    getModulePermissions,
    canApproveAmount,
    applyPermissionGuards,
    applyTabGuards,
    filterOwnRecords,
    requirePermission,
    attachOwnershipFilter,
    requireApproval,
  };
}
