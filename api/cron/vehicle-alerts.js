/**
 * Vehicle alerts checker — runs daily at 08:05 Bangkok time
 * Idempotent: checks NOT EXISTS before creating alerts
 */
const db = require('../db');

async function checkVehicleAlerts() {
  console.log(`[cron:vehicle-alerts] running at ${new Date().toISOString()}`);
  let created = 0;
  try {
    // Helper: create alert if not already exists for this vehicle+type+date
    async function createAlert(vehicleId, alertType, message, refId) {
      const { rows: existing } = await db.query(
        `SELECT 1 FROM vehicle_alerts WHERE vehicle_id=$1 AND alert_type=$2 AND alert_date=CURRENT_DATE LIMIT 1`,
        [vehicleId, alertType]);
      if (existing.length) return;
      await db.query(
        `INSERT INTO vehicle_alerts (vehicle_id, alert_type, message, reference_id) VALUES ($1,$2,$3,$4)`,
        [vehicleId, alertType, message, refId || null]);
      created++;
    }

    // 1. Insurance expiry (30d warning, 7d warning, expired)
    const { rows: insurances } = await db.query(`
      SELECT vi.*, v.plate_number, v.name AS vehicle_name
      FROM vehicle_insurance vi JOIN vehicles v ON vi.vehicle_id = v.id
      WHERE vi.status = 'active' AND vi.coverage_end IS NOT NULL`);
    for (const i of insurances) {
      const daysLeft = Math.ceil((new Date(i.coverage_end) - new Date()) / 86400000);
      if (daysLeft <= 0) {
        await db.query("UPDATE vehicle_insurance SET status='expired', updated_at=NOW() WHERE id=$1", [i.id]);
        await createAlert(i.vehicle_id, 'insurance_expiry', `ประกัน ${i.policy_number||''} ของรถ ${i.plate_number} หมดอายุแล้ว`, i.id);
      } else if (daysLeft <= 7) {
        await createAlert(i.vehicle_id, 'insurance_expiry', `ประกัน ${i.policy_number||''} ของรถ ${i.plate_number} จะหมดอายุในอีก ${daysLeft} วัน!`, i.id);
      } else if (daysLeft <= 30) {
        await createAlert(i.vehicle_id, 'insurance_expiry', `ประกัน ${i.policy_number||''} ของรถ ${i.plate_number} จะหมดอายุในอีก ${daysLeft} วัน (${i.coverage_end})`, i.id);
      }
    }

    // 2. Registration expiry (30d warning)
    const { rows: regVehicles } = await db.query(`
      SELECT id, plate_number, name, registration_expiry FROM vehicles
      WHERE registration_expiry IS NOT NULL AND status != 'retired'`);
    for (const v of regVehicles) {
      const daysLeft = Math.ceil((new Date(v.registration_expiry) - new Date()) / 86400000);
      if (daysLeft <= 30 && daysLeft >= 0) {
        await createAlert(v.id, 'registration_expiry', `ทะเบียนรถ ${v.plate_number} จะหมดอายุวันที่ ${v.registration_expiry} (เหลือ ${daysLeft} วัน)`, null);
      }
    }

    // 3. Lease expiry (60d warning)
    const { rows: leasedVehicles } = await db.query(`
      SELECT id, plate_number, name, lease_end FROM vehicles
      WHERE ownership_type IN ('leased','rented') AND lease_end IS NOT NULL AND status != 'retired'`);
    for (const v of leasedVehicles) {
      const daysLeft = Math.ceil((new Date(v.lease_end) - new Date()) / 86400000);
      if (daysLeft <= 60 && daysLeft >= 0) {
        await createAlert(v.id, 'lease_expiry', `สัญญาเช่ารถ ${v.plate_number} จะสิ้นสุดวันที่ ${v.lease_end} (เหลือ ${daysLeft} วัน)`, null);
      }
    }

    // 4. Maintenance due (KM or date, whichever comes first)
    const { rows: maintDue } = await db.query(`
      SELECT DISTINCT ON (vm.vehicle_id) vm.*, v.plate_number, v.name AS vehicle_name, v.current_km
      FROM vehicle_maintenance vm JOIN vehicles v ON vm.vehicle_id = v.id
      WHERE vm.status = 'completed' AND (vm.next_service_km IS NOT NULL OR vm.next_service_date IS NOT NULL)
      ORDER BY vm.vehicle_id, vm.completed_date DESC`);
    for (const m of maintDue) {
      const currentKm = parseFloat(m.current_km || 0);
      const nextKm = parseFloat(m.next_service_km || 999999);
      const kmDue = currentKm >= (nextKm - 1000);
      const nextDate = m.next_service_date ? new Date(m.next_service_date) : null;
      const dateDue = nextDate ? Math.ceil((nextDate - new Date()) / 86400000) <= 14 : false;

      if (kmDue) {
        await createAlert(m.vehicle_id, 'maintenance_due_km', `รถ ${m.plate_number} ใกล้ถึง KM เข้าศูนย์ (${currentKm.toLocaleString()}/${nextKm.toLocaleString()} km)`, m.id);
      } else if (dateDue) {
        await createAlert(m.vehicle_id, 'maintenance_due_date', `รถ ${m.plate_number} ถึงกำหนดเข้าศูนย์วันที่ ${m.next_service_date}`, m.id);
      }
    }

    if (created > 0) console.log(`[cron:vehicle-alerts] created ${created} alerts`);
    else console.log('[cron:vehicle-alerts] no new alerts');
  } catch (err) {
    console.error('[cron:vehicle-alerts] error:', err.message);
  }
}

module.exports = { checkVehicleAlerts };
