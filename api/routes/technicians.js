const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// GET /api/technicians
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM technicians WHERE company_id=$1 AND status!='inactive' ORDER BY first_name", [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/technicians
router.post('/', async (req, res) => {
  try {
    const { code, first_name, last_name, nickname, phone, specialization, certification, skill_level, daily_rate, employee_id, notes } = req.body;
    if (!first_name) return res.status(400).json({ error: 'first_name required' });
    const { rows: [tech] } = await db.query(
      `INSERT INTO technicians (company_id, employee_id, code, first_name, last_name, nickname, phone, specialization, certification, skill_level, daily_rate, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.company_id, employee_id||null, code||null, first_name, last_name||null, nickname||null, phone||null, specialization||'install', certification||null, skill_level||'junior', daily_rate||0, notes||null]);
    res.status(201).json(tech);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/technicians/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['code','first_name','last_name','nickname','phone','specialization','certification','skill_level','daily_rate','status','notes','employee_id','avatar_url'];
    const sets = []; const params = []; let idx = 1;
    for (const f of fields) { if (req.body[f] !== undefined) { sets.push(`${f} = $${idx++}`); params.push(req.body[f]); } }
    if (!sets.length) return res.status(400).json({ error: 'No fields' });
    sets.push('updated_at = NOW()');
    params.push(req.params.id); params.push(req.user.company_id);
    const { rows } = await db.query(`UPDATE technicians SET ${sets.join(', ')} WHERE id=$${idx++} AND company_id=$${idx} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/technicians/:id/schedule
router.get('/:id/schedule', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 3;
    const endDate = new Date(); endDate.setMonth(endDate.getMonth() + months);
    const { rows } = await db.query(
      `SELECT b.*, p.code AS project_code FROM bookings b LEFT JOIN projects p ON b.project_id=p.id
       WHERE b.technician_id=$1 AND b.status NOT IN ('rejected','cancelled') AND b.end_date >= CURRENT_DATE AND b.start_date <= $2
       ORDER BY b.start_date`, [req.params.id, endDate.toISOString().slice(0,10)]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
