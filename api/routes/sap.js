const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
router.use(authenticate);

// SAP proxy routes — forward to SAP Service Layer via sap-client.js
// These are placeholders until SAP credentials are confirmed

// GET /api/sap/vendors — search SAP BusinessPartners
router.get('/vendors', async (req, res) => {
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
