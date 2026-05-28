const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, slug } = req.body;
    const { rows } = await db.query(
      `SELECT u.*, c.slug FROM users u JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1 AND c.slug = $2 AND u.is_active = true`, [email, slug || 'sda-group']
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or company' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ userId: user.id, role: user.role, companyId: user.company_id },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.json({
      token,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.first_name, lastName: user.last_name,
        firstNameTh: user.first_name_th, lastNameTh: user.last_name_th,
        position: user.position, department: user.department,
        canApprove: user.can_approve, approvalLimit: user.approval_limit,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const u = req.user;
  res.json({
    id: u.id, email: u.email, role: u.role,
    firstName: u.first_name, lastName: u.last_name,
    firstNameTh: u.first_name_th, lastNameTh: u.last_name_th,
    position: u.position, department: u.department,
    canApprove: u.can_approve, approvalLimit: u.approval_limit,
  });
});

// GET /api/auth/users — list all users (requires auth)
router.get('/users', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, first_name, first_name_th, last_name, last_name_th,
              role, position, department, sap_user_code, sap_license,
              can_approve, approval_limit, is_active
       FROM users WHERE company_id = $1 ORDER BY role, first_name`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/users — Create new user
router.post('/users', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const { email, password, first_name, last_name, first_name_th, last_name_th,
            role, position, department, can_approve, approval_limit } = req.body;
    if (!email || !password || !first_name || !role) {
      return res.status(400).json({ error: 'Required: email, password, first_name, role' });
    }
    // Check duplicate email
    const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, first_name_th, last_name_th,
       role, position, department, can_approve, approval_limit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, email, first_name, last_name, role, position, department, is_active`,
      [req.user.company_id, email, password_hash, first_name, last_name || '', first_name_th || '', last_name_th || '',
       role, position || '', department || '', can_approve || false, approval_limit || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/auth/users/:id — Update user
router.put('/users/:id', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const { first_name, last_name, first_name_th, last_name_th,
            role, position, department, can_approve, approval_limit, is_active, password } = req.body;

    // Update password if provided
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.params.id]);
    }

    const { rows } = await db.query(
      `UPDATE users SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
       first_name_th=COALESCE($3,first_name_th), last_name_th=COALESCE($4,last_name_th),
       role=COALESCE($5,role), position=COALESCE($6,position), department=COALESCE($7,department),
       can_approve=COALESCE($8,can_approve), approval_limit=COALESCE($9,approval_limit),
       is_active=COALESCE($10,is_active)
       WHERE id=$11 AND company_id=$12
       RETURNING id, email, first_name, last_name, first_name_th, last_name_th, role, position, department, can_approve, approval_limit, is_active`,
      [first_name, last_name, first_name_th, last_name_th, role, position, department,
       can_approve, approval_limit, is_active, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/auth/users/:id — Deactivate user
router.delete('/users/:id', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE users SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id, email',
      [req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, deactivated: rows[0].email });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
