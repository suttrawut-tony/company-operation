const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/modules — list modules for current user
router.get('/', async (req, res) => {
  try {
    const isAdmin = ['admin','executive'].includes(req.user.role);
    let q, params;
    if (isAdmin) {
      q = 'SELECT * FROM company_modules WHERE company_id = $1 ORDER BY module_group, sort_order';
      params = [req.user.company_id];
    } else {
      q = `SELECT * FROM company_modules WHERE company_id = $1 AND is_enabled = true
           AND (allowed_roles IS NULL OR $2 = ANY(allowed_roles))
           ORDER BY module_group, sort_order`;
      params = [req.user.company_id, req.user.role];
    }
    const { rows } = await db.query(q, params);
    res.json({ modules: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/modules/:moduleId/toggle — enable/disable
router.put('/:moduleId/toggle', async (req, res) => {
  try {
    if (!['admin','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'PERMISSION_DENIED' });
    }
    const { rows: [m] } = await db.query(
      'SELECT * FROM company_modules WHERE company_id = $1 AND module_id = $2',
      [req.user.company_id, req.params.moduleId]);
    if (!m) return res.status(404).json({ error: 'Module not found' });
    if (m.is_core) return res.status(400).json({ error: 'ไม่สามารถปิด module หลักได้' });

    const newState = req.body.is_enabled !== undefined ? req.body.is_enabled : !m.is_enabled;
    const { rows } = await db.query(
      'UPDATE company_modules SET is_enabled = $1, updated_at = NOW() WHERE company_id = $2 AND module_id = $3 RETURNING *',
      [newState, req.user.company_id, req.params.moduleId]);
    res.json({ ...rows[0], message: newState ? 'เปิดใช้งาน module แล้ว' : 'ปิดใช้งาน module แล้ว' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/modules/:moduleId — update module config
router.put('/:moduleId', async (req, res) => {
  try {
    if (!['admin','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'PERMISSION_DENIED' });
    }
    const fields = ['module_name','sort_order','allowed_roles','settings','module_group','icon'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.user.company_id); params.push(req.params.moduleId);
    const { rows } = await db.query(
      `UPDATE company_modules SET ${sets.join(', ')} WHERE company_id = $${idx++} AND module_id = $${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Module not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/modules — add new module
router.post('/', async (req, res) => {
  try {
    if (!['admin','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'PERMISSION_DENIED' });
    }
    const { module_id, module_name, module_group, icon, href, allowed_roles, sort_order } = req.body;
    if (!module_id || !module_name || !href) {
      return res.status(400).json({ error: 'module_id, module_name, href required' });
    }
    const { rows: [m] } = await db.query(
      `INSERT INTO company_modules (company_id, module_id, module_name, module_group, icon, href, allowed_roles, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.company_id, module_id, module_name, module_group || 'system', icon || 'reports', href, allowed_roles || null, sort_order || 99]);
    res.status(201).json(m);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'module_id ซ้ำ' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/modules/bulk — update sort_order for multiple modules
router.put('/bulk/sort', async (req, res) => {
  try {
    if (!['admin','executive'].includes(req.user.role)) {
      return res.status(403).json({ error: 'PERMISSION_DENIED' });
    }
    const { modules } = req.body;
    if (!modules || !modules.length) return res.status(400).json({ error: 'No modules' });
    for (const m of modules) {
      await db.query(
        'UPDATE company_modules SET sort_order = $1, updated_at = NOW() WHERE company_id = $2 AND module_id = $3',
        [m.sort_order, req.user.company_id, m.module_id]);
    }
    res.json({ updated: modules.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
