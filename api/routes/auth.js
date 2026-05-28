/**
 * SDA Operation — Auth routes
 * - POST  /login                — email + password + slug (+ remember)
 * - GET   /me                   — current user (incl. must_change_password)
 * - POST  /change-password      — authenticated user changes own password
 * - POST  /forgot-password      — request reset link (always returns 200)
 * - POST  /reset-password       — consume reset token + set new password
 * - GET   /users                — list users (auth)
 * - POST  /users                — create user (executive/admin)
 * - PUT   /users/:id            — update user (executive/admin)
 * - DELETE /users/:id           — deactivate user (executive/admin)
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateStrength, generateResetToken, hashResetToken } = require('../lib/password');
const { sendMail } = require('../lib/email');
const audit = require('../lib/audit');

const GENERIC_LOGIN_ERROR = 'Invalid email or password';
const LOCKOUT_THRESHOLD = 8;            // failed attempts
const LOCKOUT_WINDOW_MIN = 15;          // lock for 15 min

function normalizeEmail(e) {
  return typeof e === 'string' ? e.trim().toLowerCase() : '';
}

function isEmailDomainAllowed(email) {
  const allowed = (process.env.REGISTER_ALLOWED_DOMAINS || '').trim();
  if (!allowed) return true;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  const list = allowed.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  return list.includes(domain);
}

function signToken(user, remember = false) {
  const expiresIn = remember
    ? (process.env.JWT_EXPIRES_REMEMBER || '30d')
    : (process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRES_SHORT || '7d');
  return jwt.sign(
    { userId: user.id, role: user.role, companyId: user.company_id },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

function publicUser(u) {
  return {
    id: u.id, email: u.email, role: u.role,
    firstName: u.first_name, lastName: u.last_name,
    firstNameTh: u.first_name_th, lastNameTh: u.last_name_th,
    position: u.position, department: u.department,
    canApprove: u.can_approve, approvalLimit: u.approval_limit,
    mustChangePassword: !!u.must_change_password,
  };
}

// ─── Rate limiters ───
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,                              // 20 registrations / hour / IP (covers offices behind shared NAT)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password, slug, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { rows } = await db.query(
      `SELECT u.*, c.slug AS company_slug
         FROM users u JOIN companies c ON u.company_id = c.id
        WHERE LOWER(u.email) = $1 AND c.slug = $2`,
      [email, slug || 'sda-group']
    );
    const user = rows[0];

    // Generic error covers: no user, wrong slug, wrong password
    if (!user) {
      await audit.record(req, { emailTried: email, event: 'login_fail', success: false, detail: { reason: 'not_found' } });
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }
    if (!user.is_active) {
      // Self-registered + still pending: tell the user clearly so they don't keep retrying.
      // Verifying the password first ensures we don't leak account existence to attackers
      // who don't know the password.
      const passwordOk = user.password_hash && await bcrypt.compare(password, user.password_hash);
      if (passwordOk && user.registered_self && !user.approved_at) {
        await audit.record(req, { userId: user.id, emailTried: email, event: 'login_fail', success: false, detail: { reason: 'pending_approval' } });
        return res.status(403).json({
          error: 'Your account is pending admin approval. You will be able to sign in after an admin activates it.',
          code: 'PENDING_APPROVAL'
        });
      }
      await audit.record(req, { userId: user.id, emailTried: email, event: 'login_fail', success: false, detail: { reason: 'inactive' } });
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await audit.record(req, { userId: user.id, emailTried: email, event: 'login_fail', success: false, detail: { reason: 'locked' } });
      return res.status(401).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const valid = user.password_hash && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = attempts >= LOCKOUT_THRESHOLD
        ? new Date(Date.now() + LOCKOUT_WINDOW_MIN * 60 * 1000)
        : null;
      await db.query(
        `UPDATE users SET failed_login_attempts = $1,
                          last_failed_login_at = NOW(),
                          locked_until = COALESCE($2, locked_until)
          WHERE id = $3`,
        [attempts, lockUntil, user.id]
      );
      await audit.record(req, { userId: user.id, emailTried: email, event: lockUntil ? 'lockout' : 'login_fail', success: false, detail: { attempts } });
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    // Success: reset counters, stamp last_login
    await db.query(
      `UPDATE users SET last_login_at = NOW(),
                        failed_login_attempts = 0,
                        locked_until = NULL
        WHERE id = $1`,
      [user.id]
    );
    await audit.record(req, { userId: user.id, emailTried: email, event: 'login_success', success: true });

    const token = signToken(user, !!remember);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login service unavailable. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════════════════════
router.get('/me', authenticate, (req, res) => {
  res.json(publicUser(req.user));
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/change-password
// ═══════════════════════════════════════════════════════════
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    const valid = req.user.password_hash && await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!valid) {
      await audit.record(req, { userId: req.user.id, event: 'password_change', success: false, detail: { reason: 'wrong_current' } });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const strength = validateStrength(newPassword);
    if (strength) return res.status(400).json({ error: strength });
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different from current' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users
          SET password_hash = $1,
              must_change_password = false,
              password_changed_at = NOW()
        WHERE id = $2`,
      [hash, req.user.id]
    );
    await audit.record(req, { userId: req.user.id, event: 'password_change', success: true });
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Could not change password' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// Always returns success (no email enumeration).
// ═══════════════════════════════════════════════════════════
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const ALWAYS_OK = { success: true, message: 'If that email is registered, a reset link has been sent.' };
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.json(ALWAYS_OK);

    const { rows } = await db.query(
      `SELECT id, email, first_name FROM users WHERE LOWER(email) = $1 AND is_active = true`,
      [email]
    );
    const user = rows[0];

    if (user) {
      const { raw, hash } = generateResetToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, $3, $4)`,
        [user.id, hash, expires, audit.clientIp(req)]
      );

      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '') || 'http://localhost:4000';
      const resetUrl = `${appUrl}/reset-password.html?token=${raw}`;

      await sendMail({
        to: user.email,
        subject: 'SDA Operation — Password Reset',
        text: `Hello ${user.first_name},

We received a request to reset the password for your SDA Operation account.
Use the link below within 1 hour to set a new password:

${resetUrl}

If you did not request this, you can ignore this email.`,
      });

      await audit.record(req, { userId: user.id, emailTried: email, event: 'password_reset_request', success: true });
    } else {
      await audit.record(req, { emailTried: email, event: 'password_reset_request', success: false, detail: { reason: 'not_found' } });
    }
    res.json(ALWAYS_OK);
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.json(ALWAYS_OK); // never reveal anything
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/register — public self-register (admin must approve)
// ═══════════════════════════════════════════════════════════
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const {
      password, first_name, last_name, first_name_th, last_name_th,
      position, department, phone, slug,
    } = req.body;

    if (!email || !password || !first_name) {
      return res.status(400).json({ error: 'Required: email, password, first_name' });
    }
    const strength = validateStrength(password);
    if (strength) return res.status(400).json({ error: strength });
    if (!isEmailDomainAllowed(email)) {
      return res.status(400).json({ error: 'This email domain is not allowed to register. Please contact your administrator.' });
    }

    const companySlug = (slug || 'sda-group').trim();
    const { rows: companies } = await db.query(
      'SELECT id FROM companies WHERE slug = $1 AND is_active = true',
      [companySlug]
    );
    if (!companies[0]) {
      return res.status(400).json({ error: 'Invalid company' });
    }

    const { rows: existing } = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (existing.length) {
      // Don't reveal whether the email was admin-created or self-registered; uniform message.
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (company_id, email, password_hash,
                          first_name, last_name, first_name_th, last_name_th,
                          phone, role, position, department,
                          can_approve, approval_limit,
                          is_active, registered_self,
                          password_changed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'staff',$9,$10,false,0,false,true,NOW())
       RETURNING id, email`,
      [companies[0].id, email, password_hash,
       first_name, last_name || '', first_name_th || '', last_name_th || '',
       phone || null, position || '', department || '']
    );

    await audit.record(req, { userId: rows[0].id, emailTried: email, event: 'register', success: true });

    // Notify admins (best-effort — log if SMTP not configured)
    try {
      const { rows: admins } = await db.query(
        `SELECT email, first_name FROM users
          WHERE company_id = $1 AND role IN ('executive','admin') AND is_active = true`,
        [companies[0].id]
      );
      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '') || 'http://localhost:4000';
      await Promise.all(admins.map(a => sendMail({
        to: a.email,
        subject: 'SDA Operation — New account pending approval',
        text: `Hi ${a.first_name},

A new user has just registered and is waiting for your approval:

  Email:      ${email}
  Name:       ${first_name} ${last_name || ''}
  Position:   ${position || '-'}
  Department: ${department || '-'}

Review and approve at: ${appUrl}/user-permissions.html`,
      }).catch(e => console.error('[register] notify admin failed:', e.message))));
    } catch (e) {
      console.error('[register] admin notify error:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration submitted. An admin will review and activate your account.',
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Could not complete registration. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });

    const strength = validateStrength(newPassword);
    if (strength) return res.status(400).json({ error: strength });

    const tokenHash = hashResetToken(token);
    const { rows } = await db.query(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at, u.email
         FROM password_reset_tokens t
         JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = $1
        LIMIT 1`,
      [tokenHash]
    );
    const entry = rows[0];
    if (!entry || entry.used_at || new Date(entry.expires_at) < new Date()) {
      await audit.record(req, { userId: entry?.user_id, event: 'password_reset_used', success: false, detail: { reason: 'invalid_or_expired' } });
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('BEGIN');
    try {
      await db.query(
        `UPDATE users SET password_hash = $1,
                          must_change_password = false,
                          password_changed_at = NOW(),
                          failed_login_attempts = 0,
                          locked_until = NULL
          WHERE id = $2`,
        [hash, entry.user_id]
      );
      await db.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [entry.id]);
      // Invalidate other outstanding tokens for the same user
      await db.query(
        `UPDATE password_reset_tokens SET used_at = NOW()
          WHERE user_id = $1 AND used_at IS NULL AND id <> $2`,
        [entry.user_id, entry.id]
      );
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }

    await audit.record(req, { userId: entry.user_id, emailTried: entry.email, event: 'password_reset_used', success: true });
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/auth/users
// ═══════════════════════════════════════════════════════════
router.get('/users', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, first_name, first_name_th, last_name, last_name_th,
              role, position, department, sap_user_code, sap_license,
              can_approve, approval_limit, is_active, must_change_password,
              registered_self, approved_at, approved_by, created_at
         FROM users WHERE company_id = $1
         ORDER BY (registered_self AND approved_at IS NULL) DESC, role, first_name`,
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[auth/users:list]', err);
    res.status(500).json({ error: 'Could not list users' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/users — create
// ═══════════════════════════════════════════════════════════
router.post('/users', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const {
      password, first_name, last_name, first_name_th, last_name_th,
      role, position, department, can_approve, approval_limit,
      must_change_password,
    } = req.body;

    if (!email || !password || !first_name || !role) {
      return res.status(400).json({ error: 'Required: email, password, first_name, role' });
    }
    const strength = validateStrength(password);
    if (strength) return res.status(400).json({ error: strength });

    const { rows: existing } = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (company_id, email, password_hash,
                          first_name, last_name, first_name_th, last_name_th,
                          role, position, department, can_approve, approval_limit,
                          must_change_password, password_changed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())
       RETURNING id, email, first_name, last_name, role, position, department, is_active, must_change_password`,
      [req.user.company_id, email, password_hash, first_name, last_name || '',
       first_name_th || '', last_name_th || '', role, position || '', department || '',
       can_approve || false, approval_limit || 0,
       must_change_password === undefined ? true : !!must_change_password]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[auth/users:create]', err);
    res.status(500).json({ error: 'Could not create user' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/users/:id/approve — admin activates a self-registered account
// ═══════════════════════════════════════════════════════════
router.post('/users/:id/approve', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const { role, position, department, can_approve, approval_limit } = req.body;

    const { rows } = await db.query(
      `UPDATE users
          SET is_active     = true,
              approved_at   = NOW(),
              approved_by   = $1,
              role          = COALESCE($2, role),
              position      = COALESCE($3, position),
              department    = COALESCE($4, department),
              can_approve   = COALESCE($5, can_approve),
              approval_limit = COALESCE($6, approval_limit)
        WHERE id = $7 AND company_id = $8
        RETURNING id, email, first_name, last_name, role, position, department, is_active, approved_at`,
      [req.user.id, role || null, position || null, department || null,
       can_approve === undefined ? null : !!can_approve,
       approval_limit === undefined ? null : approval_limit,
       req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const approved = rows[0];
    await audit.record(req, { userId: approved.id, emailTried: approved.email, event: 'user_approved', success: true, detail: { approver: req.user.id } });

    // Notify the user (best-effort)
    try {
      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '') || 'http://localhost:4000';
      await sendMail({
        to: approved.email,
        subject: 'SDA Operation — Your account has been approved',
        text: `Hi ${approved.first_name},

Your account has been activated. You can now sign in:

${appUrl}/login.html`,
      });
    } catch (e) { console.error('[approve] user notify error:', e.message); }

    res.json(approved);
  } catch (err) {
    console.error('[auth/users:approve]', err);
    res.status(500).json({ error: 'Could not approve user' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /api/auth/users/:id — update
// ═══════════════════════════════════════════════════════════
router.put('/users/:id', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const { first_name, last_name, first_name_th, last_name_th,
            role, position, department, can_approve, approval_limit, is_active, password } = req.body;

    if (password) {
      const strength = validateStrength(password);
      if (strength) return res.status(400).json({ error: strength });
      const password_hash = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE users SET password_hash = $1,
                          must_change_password = true,
                          password_changed_at = NOW(),
                          failed_login_attempts = 0,
                          locked_until = NULL
          WHERE id = $2 AND company_id = $3`,
        [password_hash, req.params.id, req.user.company_id]
      );
    }

    const { rows } = await db.query(
      `UPDATE users SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
              first_name_th=COALESCE($3,first_name_th), last_name_th=COALESCE($4,last_name_th),
              role=COALESCE($5,role), position=COALESCE($6,position), department=COALESCE($7,department),
              can_approve=COALESCE($8,can_approve), approval_limit=COALESCE($9,approval_limit),
              is_active=COALESCE($10,is_active)
        WHERE id=$11 AND company_id=$12
        RETURNING id, email, first_name, last_name, first_name_th, last_name_th,
                  role, position, department, can_approve, approval_limit, is_active, must_change_password`,
      [first_name, last_name, first_name_th, last_name_th, role, position, department,
       can_approve, approval_limit, is_active, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[auth/users:update]', err);
    res.status(500).json({ error: 'Could not update user' });
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /api/auth/users/:id — deactivate
// ═══════════════════════════════════════════════════════════
router.delete('/users/:id', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE users SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id, email',
      [req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, deactivated: rows[0].email });
  } catch (err) {
    console.error('[auth/users:delete]', err);
    res.status(500).json({ error: 'Could not deactivate user' });
  }
});

module.exports = router;
