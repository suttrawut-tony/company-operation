/**
 * Company Operation — Auth routes (simplified, schema-tolerant)
 *
 * Endpoints intentionally use ONLY columns present in the original
 * users/companies schema. Optional columns added by migrations 013/014
 * (must_change_password, password_changed_at, registered_self,
 * approved_at, approved_by) are written with a best-effort helper that
 * never throws, so auth keeps working even if those migrations haven't
 * been applied yet.
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateStrength, generateResetToken, hashResetToken } = require('../lib/password');
const { sendMail } = require('../lib/email');
const staticUser = require('../lib/static-user');

const GENERIC_LOGIN_ERROR = 'Invalid email or password';

function normalizeEmail(e) {
  return typeof e === 'string' ? e.trim().toLowerCase() : '';
}

function isEmailDomainAllowed(email) {
  const allowed = (process.env.REGISTER_ALLOWED_DOMAINS || '').trim();
  if (!allowed) return true;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return allowed.split(',').map(d => d.trim().toLowerCase()).filter(Boolean).includes(domain);
}

function requireApproval() {
  return /^(true|1|yes)$/i.test(process.env.REQUIRE_REGISTER_APPROVAL || '');
}

/**
 * Role assigned to users who sign up via /register. Default 'staff' for real
 * production (least privilege). For a POC pitch, set REGISTER_DEFAULT_ROLE=
 * executive on the server so demo accounts can see everything in the seeded
 * data without needing to be made a project member first.
 */
function registerDefaultRole() {
  const requested = (process.env.REGISTER_DEFAULT_ROLE || 'staff').toLowerCase().trim();
  const valid = ['staff', 'pm', 'executive', 'finance', 'accounting', 'procurement', 'admin'];
  return valid.includes(requested) ? requested : 'staff';
}

function signToken(user, remember = false) {
  const expiresIn = remember
    ? (process.env.JWT_EXPIRES_REMEMBER || '30d')
    : (process.env.JWT_EXPIRES_IN || '7d');
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

/** Best-effort DB call — never throws, just logs. Used for optional columns. */
async function tryDB(sql, params, label = 'tryDB') {
  try { return await db.query(sql, params); }
  catch (err) {
    console.warn(`[auth/${label}] best-effort failed: ${err.message}`);
    return null;
  }
}

/**
 * Extract a human-readable description from any thrown value.
 * Handles AggregateError (pg connection errors) whose .message is empty.
 */
function formatErr(err) {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  const parts = [];
  if (err.code) parts.push(err.code);
  if (err.message) parts.push(err.message);
  if (err.errors && err.errors[0]) {
    const inner = err.errors[0];
    if (inner.code && !parts.includes(inner.code)) parts.push(inner.code);
    if (inner.message) parts.push(inner.message);
  }
  if (err.detail) parts.push(err.detail);
  if (err.hint) parts.push(`hint: ${err.hint}`);
  return parts.filter(Boolean).join(' — ') || err.name || 'unknown error';
}

// ─── Rate limiters ───
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password, slug, remember } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    // ─── Static credential check (works even when DB is unreachable) ───
    if (staticUser.staticCredentialMatches(email, password)) {
      const user = staticUser.buildStaticUser();
      const expiresIn = !!remember
        ? (process.env.JWT_EXPIRES_REMEMBER || '30d')
        : (process.env.JWT_EXPIRES_IN || '7d');
      const token = jwt.sign(
        { userId: user.id, role: user.role, companyId: user.company_id, static: true },
        process.env.JWT_SECRET,
        { expiresIn }
      );
      return res.json({ token, user: publicUser(user), staticLogin: true });
    }

    const { rows } = await db.query(
      `SELECT u.* FROM users u JOIN companies c ON u.company_id = c.id
        WHERE LOWER(u.email) = $1 AND c.slug = $2`,
      [email, slug || 'company']
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });

    const valid = user.password_hash && await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });

    // Password is correct. Check activation state.
    if (!user.is_active) {
      // Self-registered & still pending? Be helpful.
      if (user.registered_self === true && !user.approved_at) {
        return res.status(403).json({
          error: 'Your account is pending admin approval. You will be able to sign in after an admin activates it.',
          code: 'PENDING_APPROVAL',
        });
      }
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    // Best-effort stamp — login succeeds even if last_login_at column is missing
    tryDB('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id], 'login:lastLogin');

    res.json({ token: signToken(user, !!remember), user: publicUser(user) });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed: ' + formatErr(err) });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/auth/me
// ═══════════════════════════════════════════════════════════
router.get('/me', authenticate, (req, res) => res.json(publicUser(req.user)));

// ═══════════════════════════════════════════════════════════
// POST /api/auth/change-password
// ═══════════════════════════════════════════════════════════
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });
    const valid = req.user.password_hash && await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const strength = validateStrength(newPassword);
    if (strength) return res.status(400).json({ error: strength });
    if (newPassword === currentPassword) return res.status(400).json({ error: 'New password must be different from current' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    tryDB('UPDATE users SET must_change_password = false, password_changed_at = NOW() WHERE id = $1',
          [req.user.id], 'change:flags');
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Could not change password' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ═══════════════════════════════════════════════════════════
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const ALWAYS_OK = { success: true, message: 'If that email is registered, a reset link has been sent.' };
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.json(ALWAYS_OK);

    const { rows } = await db.query(
      'SELECT id, email, first_name FROM users WHERE LOWER(email) = $1 AND is_active = true',
      [email]
    );
    const user = rows[0];
    if (user) {
      const { raw, hash } = generateResetToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      const inserted = await tryDB(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
         VALUES ($1, $2, $3, $4)`,
        [user.id, hash, expires, req.ip || null],
        'forgot:insert'
      );
      if (inserted) {
        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '') || 'http://localhost:4000';
        const resetUrl = `${appUrl}/reset-password.html?token=${raw}`;
        sendMail({
          to: user.email,
          subject: 'Company Operation — Password Reset',
          text: `Hello ${user.first_name},

Reset your password within 1 hour:
${resetUrl}

If you didn't request this, ignore this email.`,
        }).catch(e => console.error('[forgot:mail]', e.message));
      } else {
        console.error('[forgot] password_reset_tokens table missing — has migration 013 run?');
      }
    }
    res.json(ALWAYS_OK);
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.json(ALWAYS_OK);
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
      `SELECT t.id, t.user_id, t.expires_at, t.used_at
         FROM password_reset_tokens t WHERE t.token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
    const entry = rows[0];
    if (!entry || entry.used_at || new Date(entry.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, entry.user_id]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [entry.id]);
    tryDB('UPDATE users SET must_change_password = false, password_changed_at = NOW() WHERE id = $1',
          [entry.user_id], 'reset:flags');
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/register — public self-registration
// Default: immediate active. Set REQUIRE_REGISTER_APPROVAL=true to gate.
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

    const companySlug = (slug || 'company').trim();
    const { rows: companies } = await db.query('SELECT id FROM companies WHERE slug = $1', [companySlug]);
    if (!companies[0]) return res.status(400).json({ error: 'Invalid company' });

    const { rows: existing } = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already registered. Try signing in instead.' });

    const isActive = !requireApproval();
    const defaultRole = registerDefaultRole();
    const password_hash = await bcrypt.hash(password, 10);

    // ONLY use columns guaranteed to exist on the original schema
    const { rows } = await db.query(
      `INSERT INTO users (company_id, email, password_hash,
                          first_name, last_name, first_name_th, last_name_th,
                          phone, role, position, department,
                          can_approve, approval_limit, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,0,$12)
       RETURNING id, email`,
      [companies[0].id, email, password_hash,
       first_name, last_name || '', first_name_th || '', last_name_th || '',
       phone || null, defaultRole, position || '', department || '', isActive]
    );

    // Best-effort: stamp self-register markers (columns may not exist yet)
    tryDB('UPDATE users SET registered_self = true WHERE id = $1', [rows[0].id], 'register:flag');
    if (isActive) {
      tryDB('UPDATE users SET approved_at = NOW() WHERE id = $1', [rows[0].id], 'register:approved');
    }

    // Notify admins in the background; failure never blocks register
    (async () => {
      try {
        const { rows: admins } = await db.query(
          `SELECT email, first_name FROM users
            WHERE company_id = $1 AND role IN ('executive','admin') AND is_active = true`,
          [companies[0].id]
        );
        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '') || 'http://localhost:4000';
        const subject = isActive
          ? 'Company Operation — New user registered'
          : 'Company Operation — New account pending approval';
        await Promise.all(admins.map(a => sendMail({
          to: a.email,
          subject,
          text: `Hi ${a.first_name},

A new user just ${isActive ? 'registered' : 'registered and is waiting for approval'}:

  Email:      ${email}
  Name:       ${first_name} ${last_name || ''}
  Position:   ${position || '-'}
  Department: ${department || '-'}

${isActive ? 'View users at: ' : 'Approve at: '}${appUrl}/user-permissions.html`,
        }).catch(e => console.error('[register:notify]', e.message))));
      } catch (e) {
        console.error('[register:notify-admins]', e.message);
      }
    })();

    res.status(201).json({
      success: true,
      isActive,
      message: isActive
        ? 'Account created. You can sign in now.'
        : 'Registration submitted. An admin will review and activate your account.',
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Register failed: ' + formatErr(err) });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/auth/admins?slug=sda-group — public, used by register page
// ═══════════════════════════════════════════════════════════
router.get('/admins', async (req, res) => {
  try {
    const slug = (req.query.slug || 'company').toString().trim();
    const { rows } = await db.query(
      `SELECT u.email, u.first_name, u.last_name, u.first_name_th, u.last_name_th, u.role
         FROM users u JOIN companies c ON u.company_id = c.id
        WHERE c.slug = $1 AND c.is_active = true
          AND u.is_active = true
          AND u.role IN ('executive','admin')
        ORDER BY u.role, u.first_name`,
      [slug]
    );
    res.json({ admins: rows });
  } catch (err) {
    console.error('[auth/admins]', err);
    res.status(500).json({ error: 'Could not list admins' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/auth/users — list users
// ═══════════════════════════════════════════════════════════
router.get('/users', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE company_id = $1 ORDER BY role, first_name',
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[auth/users:list]', err);
    res.status(500).json({ error: 'Could not list users' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/users — admin creates a user
// ═══════════════════════════════════════════════════════════
router.post('/users', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password, first_name, last_name, first_name_th, last_name_th,
            role, position, department, can_approve, approval_limit } = req.body;
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
                          role, position, department,
                          can_approve, approval_limit, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
       RETURNING id, email, first_name, last_name, role, position, department, is_active`,
      [req.user.company_id, email, password_hash,
       first_name, last_name || '', first_name_th || '', last_name_th || '',
       role, position || '', department || '',
       can_approve || false, approval_limit || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[auth/users:create]', err);
    res.status(500).json({ error: 'Could not create user' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/auth/users/:id/approve — admin approves / re-activates
// ═══════════════════════════════════════════════════════════
router.post('/users/:id/approve', authenticate, requireRole('executive', 'admin'), async (req, res) => {
  try {
    const { role, position, department, can_approve, approval_limit } = req.body;
    const { rows } = await db.query(
      `UPDATE users
          SET is_active     = true,
              role          = COALESCE($1, role),
              position      = COALESCE($2, position),
              department    = COALESCE($3, department),
              can_approve   = COALESCE($4, can_approve),
              approval_limit = COALESCE($5, approval_limit)
        WHERE id = $6 AND company_id = $7
        RETURNING id, email, first_name, last_name, role, is_active`,
      [role || null, position || null, department || null,
       can_approve === undefined ? null : !!can_approve,
       approval_limit === undefined ? null : approval_limit,
       req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    // Best-effort stamp on the new approval columns
    tryDB('UPDATE users SET approved_at = NOW(), approved_by = $1 WHERE id = $2',
          [req.user.id, req.params.id], 'approve:stamp');

    sendMail({
      to: rows[0].email,
      subject: 'Company Operation — Your account has been approved',
      text: `Hi ${rows[0].first_name},

Your account is active. Sign in at:
${(process.env.APP_URL || '').replace(/\/$/, '') || 'http://localhost:4000'}/login.html`,
    }).catch(e => console.error('[approve:mail]', e.message));

    res.json(rows[0]);
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
        'UPDATE users SET password_hash = $1 WHERE id = $2 AND company_id = $3',
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
                  role, position, department, can_approve, approval_limit, is_active`,
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
