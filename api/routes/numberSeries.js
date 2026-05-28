const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM number_series WHERE company_id = $1 ORDER BY doc_type, year_month DESC', [req.user.company_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/number-series/next/:docType — preview next number
router.get('/next/:docType', async (req, res) => {
  try {
    const yearMonth = new Date().toISOString().slice(2, 4) + String(new Date().getMonth() + 1).padStart(2, '0');
    const { rows } = await db.query(
      `SELECT * FROM number_series WHERE company_id = $1 AND doc_type = $2 AND year_month = $3`,
      [req.user.company_id, req.params.docType.toUpperCase(), yearMonth]);
    const next = rows[0] ? rows[0].current_number + 1 : 1;
    const prefix = req.params.docType.toUpperCase();
    res.json({ docType: prefix, yearMonth, nextNumber: next, preview: `${prefix}${yearMonth}${String(next).padStart(4, '0')}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
