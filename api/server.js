/**
 * SDA Operation — Express Server
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SDA Operation API', time: new Date().toISOString() });
});

// 404
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Fallback: serve POC index
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

// Broadcast function — call this after any data change
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// Make broadcast available to routes
app.set('broadcast', broadcast);
