/**
 * SDA Operation — Express Server
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

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Health check — includes a DB ping so monitoring sees real status
app.get('/api/health', async (req, res) => {
  let dbOk = false;
  let dbError = null;
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
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'SDA Operation API',
    time: new Date().toISOString(),
    db: dbOk ? 'ok' : { error: dbError },
    auth: {
      jwt_secret: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
      database_url: !!process.env.DATABASE_URL,
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

const server = app.listen(PORT, () => {
  console.log(`SDA Operation API running on http://localhost:${PORT}`);
});

// ═══ WebSocket for real-time updates ═══
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

const wsClients = new Set();

wss.on('connection', (ws) => {
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
