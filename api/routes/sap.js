const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
router.use(authenticate);

// FIXED: SAP proxy routes — stubs with clear status flag
// Real connection requires SAP_HOST/SAP_USER/SAP_PASSWORD env vars
const sapConfigured = !!(process.env.SAP_HOST && process.env.SAP_USER);

// GET /api/sap/vendors — search SAP BusinessPartners
// GET /api/sap/status — check if SAP is configured
router.get('/status', (req, res) => {
  res.json({ connected: sapConfigured, message: sapConfigured ? 'SAP configured' : 'SAP not configured — set SAP_HOST + SAP_USER env vars' });
});

router.get('/vendors', async (req, res) => {
  if (!sapConfigured) return res.json({ connected: false, data: [] });
  res.json({ message: 'SAP vendor lookup — requires SAP Service Layer connection', data: [] });
});

// GET /api/sap/accounts — Chart of Accounts
router.get('/accounts', async (req, res) => {
  res.json({ message: 'SAP Chart of Accounts — requires connection', data: [] });
});

// GET /api/sap/projects — SAP OPRJ
router.get('/projects', async (req, res) => {
  res.json({ message: 'SAP Projects — requires connection', data: [] });
});

// POST /api/sap/push-pr/:id — push approved PR to SAP
router.post('/push-pr/:id', requireRole('procurement', 'finance', 'executive'), async (req, res) => {
  res.json({ message: 'Push PR to SAP OPRQ — requires SAP Service Layer connection' });
});

// POST /api/sap/push-po/:id
router.post('/push-po/:id', requireRole('procurement', 'finance', 'executive'), async (req, res) => {
  res.json({ message: 'Push PO to SAP OPOR — requires SAP Service Layer connection' });
});

// POST /api/sap/push-expense/:id
router.post('/push-expense/:id', requireRole('finance', 'executive'), async (req, res) => {
  res.json({ message: 'Push Expense to SAP OPCH — requires SAP Service Layer connection' });
});

module.exports = router;
