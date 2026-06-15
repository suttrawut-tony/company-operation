const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const db = require('../db');
const sapClient = require('../services/sapClient');
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// Company settings (per-tenant). settings.erp_integration drives
// whether Business Partner master is managed locally or pulled
// from an ERP / accounting system.
//   settings.erp_integration = { enabled: bool, system: string }
//   enabled=false → BP added/edited inside Company Operation
//   enabled=true  → BP is read-only here, synced from the ERP
// ─────────────────────────────────────────────────────────────

// GET /api/company/settings — current company settings + ERP connection status
router.get('/settings', async (req, res) => {
  try {
    const { rows: [c] } = await db.query(
      'SELECT id, name, settings FROM companies WHERE id=$1', [req.user.company_id]);
    if (!c) return res.status(404).json({ error: 'Company not found' });
    res.json({
      settings: c.settings || {},
      sap_configured: sapClient.isConfigured(),  // server-side ERP connection ready?
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/company/settings — shallow-merge a settings patch (exec/admin only)
router.put('/settings', requireRole('executive', 'admin'), async (req, res) => {
  try {
    const patch = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const { rows: [c] } = await db.query(
      `UPDATE companies
         SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING settings`,
      [JSON.stringify(patch), req.user.company_id]);
    if (!c) return res.status(404).json({ error: 'Company not found' });
    res.json({ settings: c.settings });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/company/sync-bp — pull Business Partners from the connected ERP
router.post('/sync-bp', requireRole('executive', 'admin', 'procurement'), async (req, res) => {
  try {
    const { rows: [c] } = await db.query('SELECT settings FROM companies WHERE id=$1', [req.user.company_id]);
    const erp = (c && c.settings && c.settings.erp_integration) || {};
    if (!erp.enabled) {
      return res.status(400).json({ ok: false, reason: 'ERP_DISABLED', synced: 0,
        message: 'บริษัทนี้ไม่ได้เปิดการเชื่อมต่อ ERP — จัดการ Business Partner ในระบบได้โดยตรง' });
    }
    if (!sapClient.isConfigured()) {
      return res.json({ ok: false, reason: 'ERP_NOT_CONNECTED', synced: 0,
        message: 'เปิดโหมด ERP ไว้ แต่ยังไม่ได้ตั้งค่าการเชื่อมต่อ (SAP_* env) บนเซิร์ฟเวอร์ — ติดต่อผู้ดูแลระบบ' });
    }

    // SAP B1 Service Layer — OCRD (BusinessPartners)
    let partners = [];
    try {
      const data = await sapClient.request('GET',
        "/BusinessPartners?$select=CardCode,CardName,CardType,Phone1,EmailAddress,FederalTaxID&$top=500");
      partners = (data && data.value) || [];
    } catch (err) {
      return res.status(502).json({ ok: false, reason: 'ERP_FETCH_FAILED', synced: 0,
        message: 'ดึงข้อมูลจาก ERP ไม่สำเร็จ: ' + err.message });
    }

    let synced = 0;
    for (const p of partners) {
      if (!p.CardCode) continue;
      const bp_type = p.CardType === 'cCustomer' ? 'customer' : 'vendor';
      // ON CONFLICT scoped so a code collision from another tenant never overwrites their record
      await db.query(
        `INSERT INTO business_partners (company_id, bp_code, bp_name, bp_type, phone, email, tax_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (bp_code) DO UPDATE
           SET bp_name = EXCLUDED.bp_name, bp_type = EXCLUDED.bp_type,
               phone = EXCLUDED.phone, email = EXCLUDED.email, tax_id = EXCLUDED.tax_id
         WHERE business_partners.company_id = EXCLUDED.company_id`,
        [req.user.company_id, p.CardCode, p.CardName || p.CardCode, bp_type,
         p.Phone1 || '', p.EmailAddress || '', p.FederalTaxID || '']);
      synced++;
    }
    res.json({ ok: true, synced, message: `ซิงค์ ${synced} รายการจาก ERP สำเร็จ` });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/company/sync-items — pull Items (OITM) from the connected ERP
router.post('/sync-items', requireRole('executive', 'admin', 'procurement'), async (req, res) => {
  try {
    const { rows: [c] } = await db.query('SELECT settings FROM companies WHERE id=$1', [req.user.company_id]);
    const erp = (c && c.settings && c.settings.erp_integration) || {};
    if (!erp.enabled) {
      return res.status(400).json({ ok: false, reason: 'ERP_DISABLED', synced: 0,
        message: 'บริษัทนี้ไม่ได้เปิดการเชื่อมต่อ ERP — จัดการ Item ในระบบได้โดยตรง' });
    }
    if (!sapClient.isConfigured()) {
      return res.json({ ok: false, reason: 'ERP_NOT_CONNECTED', synced: 0,
        message: 'เปิดโหมด ERP ไว้ แต่ยังไม่ได้ตั้งค่าการเชื่อมต่อ (SAP_* env) บนเซิร์ฟเวอร์ — ติดต่อผู้ดูแลระบบ' });
    }

    // SAP B1 Service Layer — OITM (Items)
    let items = [];
    try {
      const data = await sapClient.request('GET',
        "/Items?$select=ItemCode,ItemName,InventoryUOM&$top=500");
      items = (data && data.value) || [];
    } catch (err) {
      return res.status(502).json({ ok: false, reason: 'ERP_FETCH_FAILED', synced: 0,
        message: 'ดึงข้อมูลจาก ERP ไม่สำเร็จ: ' + err.message });
    }

    let synced = 0;
    for (const it of items) {
      if (!it.ItemCode) continue;
      await db.query(
        `INSERT INTO items (company_id, item_code, item_name, uom)
           VALUES ($1,$2,$3,$4)
         ON CONFLICT (item_code) DO UPDATE
           SET item_name = EXCLUDED.item_name, uom = EXCLUDED.uom
         WHERE items.company_id = EXCLUDED.company_id`,
        [req.user.company_id, it.ItemCode, it.ItemName || it.ItemCode, it.InventoryUOM || 'EA']);
      synced++;
    }
    res.json({ ok: true, synced, message: `ซิงค์ ${synced} รายการจาก ERP สำเร็จ` });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
