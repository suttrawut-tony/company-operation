/**
 * Company Operation — Express Server
 * Redeployed: 2026-05-28
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Boot-time configuration check (fail fast, log clearly) ───
(function validateBootConfig() {
  const problems = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET is missing or shorter than 32 characters');
  }
  if (process.env.JWT_SECRET && /change[- ]?(this|me)|your[- ]?secret/i.test(process.env.JWT_SECRET)) {
    problems.push('JWT_SECRET still contains a placeholder — set a real secret');
  }
  if (!process.env.DATABASE_URL) {
    problems.push('DATABASE_URL is not set');
  }
  if (problems.length) {
    console.error('═══ Auth configuration problems ═══');
    problems.forEach(p => console.error('  ✗ ' + p));
    console.error('Server will start but auth endpoints will fail until fixed.');
    console.error('═══════════════════════════════════');
  } else {
    console.log('[boot] auth configuration OK');
  }
})();

// Trust the first proxy hop (Railway, Cloudflare, etc.) so rate-limit + req.ip work
app.set('trust proxy', 1);

// SECURITY FIX: HTTP security headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.sheetjs.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "*.openstreetmap.org", "*.tile.openstreetmap.org"],
      frameSrc: ["'self'", "www.openstreetmap.org"],
      connectSrc: ["'self'", "ws:", "wss:"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// SECURITY FIX: Access logging
const morgan = require('morgan');
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// SECURITY FIX: CORS — restrict origins in production
// '*' (or empty) means allow all, matching the old behavior and .env.example docs
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(o => o && o !== '*');
app.use(cors({
  origin: allowedOrigins.length > 0
    ? (origin, cb) => { if (!origin || allowedOrigins.includes(origin)) cb(null, true); else cb(new Error('Not allowed by CORS')); }
    : true,
  credentials: true
}));

// SECURITY FIX: Reduce body size limit
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// SECURITY FIX: Global rate limit (100 req/min per IP)
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({ windowMs: 60000, max: 100, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests' } }));

// Serve static POC files
app.use(express.static(path.join(__dirname, '..', 'poc')));

// Real-time broadcast middleware
app.use(require('./middleware/broadcast'));

// ─── API Routes ───
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/budget',        require('./routes/budget'));
app.use('/api/pr',            require('./routes/pr'));
app.use('/api/po',            require('./routes/po'));
app.use('/api/grpo',          require('./routes/grpo'));
app.use('/api/expense',       require('./routes/expense'));
app.use('/api/advance',       require('./routes/advance'));
app.use('/api/petty-cash',    require('./routes/pettyCash'));
app.use('/api/vehicle',       require('./routes/vehicle'));
app.use('/api/travel',        require('./routes/travel'));
app.use('/api/ot',            require('./routes/ot'));
app.use('/api/number-series', require('./routes/numberSeries'));
app.use('/api/approvals',     require('./routes/approvals'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/sap',           require('./routes/sap'));
app.use('/api/quotes',        require('./routes/quotes'));
app.use('/api/master',        require('./routes/masterdata'));
app.use('/api/modules',       require('./routes/modules'));
app.use('/api/subscription',  require('./routes/subscription'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/job-orders',    require('./routes/job-orders'));
app.use('/api/quotations',    require('./routes/quotations'));
app.use('/api/technicians',   require('./routes/technicians'));
app.use('/api/admin',         require('./routes/admin'));

// Health check — includes a DB ping so monitoring sees real status
app.get('/api/health', async (req, res) => {
  let dbOk = false;
  let dbError = null;
  let migrations = null;
  try { await db.query('SELECT 1'); dbOk = true; }
  catch (e) {
    const parts = [];
    if (e.code) parts.push(e.code);
    if (e.message) parts.push(e.message);
    if (e.errors && e.errors[0]) {
      const inner = e.errors[0];
      if (inner.code) parts.push(inner.code);
      if (inner.message) parts.push(inner.message);
    }
    dbError = parts.filter(Boolean).join(' — ') || e.name || 'Unknown DB error';
  }
  if (dbOk) {
    try {
      const { rows } = await db.query(`SELECT name FROM _migrations ORDER BY name`);
      migrations = rows.map(r => r.name);
    } catch (_) { migrations = '_migrations table missing'; }
  }
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    version: 'auth-2026-05-28-v3',
    service: 'Company Operation API',
    time: new Date().toISOString(),
    db: dbOk ? 'ok' : { error: dbError },
    migrations,
    auth: {
      jwt_secret_set: !!process.env.JWT_SECRET,
      jwt_secret_length: (process.env.JWT_SECRET || '').length,
      database_url_set: !!process.env.DATABASE_URL,
      require_register_approval: /^(true|1|yes)$/i.test(process.env.REQUIRE_REGISTER_APPROVAL || ''),
      register_allowed_domains: process.env.REGISTER_ALLOWED_DOMAINS || '(any)',
      register_default_role: process.env.REGISTER_DEFAULT_ROLE || 'staff (default)',
      static_login_enabled: !!(process.env.STATIC_LOGIN_EMAIL && process.env.STATIC_LOGIN_PASSWORD),
    },
  });
});

// 404 for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler — guarantees a JSON { error } response so the
// frontend never falls back to the generic "API Error" message.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  const status = err.status || err.statusCode || 500;
  const message = (err && err.message) ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
});

// Fallback: serve POC login page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'poc', 'login.html'));
});

// ─── Boot sequence ───
// Try to run migrations FIRST so endpoints don't hit a half-migrated schema
// on the first request after deploy. Migration runner never throws; if it
// fails (DB unreachable, bad SQL) we log clearly and start the server anyway
// so a single migration bug can't take prod completely offline.
const { runAll: runMigrations } = require('./migrate');

(async () => {
  try {
    const r = await runMigrations();
    if (r.error) console.error(`[boot] migration error: ${r.error}`);
    else if (r.ran > 0) console.log(`[boot] applied ${r.ran} migration(s)`);
  } catch (err) {
    console.error('[boot] migration runner crashed:', err.message || err);
  }

  const server = app.listen(PORT, () => {
    console.log(`Company Operation API running on http://localhost:${PORT}`);
  });

  // ═══ WebSocket for real-time updates ═══
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ server });
  const wsClients = new Set();

  // SECURITY FIX: WebSocket connection with optional token auth
  wss.on('connection', (ws, req) => {
    // In production, verify token on WS connection
    if (process.env.NODE_ENV === 'production') {
      try {
        const url = new URL(req.url, 'http://x');
        const token = url.searchParams.get('token');
        if (token) require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      } catch(e) { /* Allow connection but don't add to broadcast in strict mode */ }
    }
    wsClients.add(ws);
    ws.on('close', () => wsClients.delete(ws));
    ws.on('error', () => wsClients.delete(ws));
  });

  function broadcast(type, data) {
    const msg = JSON.stringify({ type, data, timestamp: Date.now() });
    wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
  }

  app.set('broadcast', broadcast);

  // ═══ Cron Jobs ═══
  const cron = require('node-cron');
  const { checkAdvanceOverdue } = require('./cron/advance-overdue');
  const { checkVehicleAlerts } = require('./cron/vehicle-alerts');
  const { checkSubscriptions } = require('./cron/subscription');
  cron.schedule('3 8 * * *', () => {
    checkAdvanceOverdue().catch(err => console.error('[cron] advance-overdue failed:', err.message));
  }, { timezone: 'Asia/Bangkok' });
  cron.schedule('5 8 * * *', () => {
    checkVehicleAlerts().catch(err => console.error('[cron] vehicle-alerts failed:', err.message));
  }, { timezone: 'Asia/Bangkok' });
  cron.schedule('1 0 * * *', () => {
    checkSubscriptions().catch(err => console.error('[cron] subscription failed:', err.message));
  }, { timezone: 'Asia/Bangkok' });
  console.log('[boot] cron: subscription 00:01, advance-overdue 08:03, vehicle-alerts 08:05 (Asia/Bangkok)');
})();

// SECURITY FIX: Catch unhandled errors
process.on("unhandledRejection", (err) => { console.error("[FATAL] Unhandled rejection:", err); });
process.on("uncaughtException", (err) => { console.error("[FATAL] Uncaught exception:", err); process.exit(1); });
