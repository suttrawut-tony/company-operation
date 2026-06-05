const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, [req.user.id]);
    res.json({ unread: parseInt(count), items: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/read-all', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false', [req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIXED: Added DELETE /clear-all
router.delete('/', async (req, res) => {
  try {
    await db.query('DELETE FROM notifications WHERE user_id=$1', [req.user.id]);
    res.json({ cleared: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
