/**
 * SDA Operation — Import seed data into Postgres
 *
 * วิธีใช้:
 *   node api/seed/import.js                          # ใช้ DATABASE_URL จาก .env
 *   DATABASE_URL=postgresql://... node api/seed/import.js   # ระบุเอง
 *   node api/seed/import.js --clean                  # ลบ data เก่าก่อน import
 *
 * สิ่งที่ทำ:
 *   1. Run migrations ก่อน (สร้าง table ถ้ายังไม่มี)
 *   2. (ถ้า --clean) ลบ data เก่าทุก table
 *   3. Execute seed_data.sql
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../db');

const SEED_FILE = path.join(__dirname, 'seed_data.sql');
const isClean = process.argv.includes('--clean');

// Tables in deletion order (respect FK constraints)
const TABLES_DELETE_ORDER = [
  'activity_log',
  'notifications',
  'attachments',
  'approvals',
  'discussions',
  'notes',
  'calendar_events',
  'travel_members',
  'po_lines',
  'pr_lines',
  'budget_lines',
  'phase_steps',
  'expense_line_items',   // may not exist
  'ot_requests',
  'vehicle_bookings',
  'travel_requests',
  'purchase_orders',
  'purchase_requests',
  'expenses',
  'budgets',
  'tasks',
  'phases',
  'project_members',
  'projects',
  'number_series',
  'approval_matrix',
  'vehicles',
  'password_reset_tokens',
  'users',
  'companies',
];

async function main() {
  console.log('═══ SDA Operation — Seed Import ═══');

  // 1. Check seed file exists
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`Seed file not found: ${SEED_FILE}`);
    console.error('');
    console.error('เพื่อนต้อง export ก่อน:');
    console.error('  chmod +x api/seed/export.sh');
    console.error('  ./api/seed/export.sh');
    process.exit(1);
  }

  // 2. Run migrations first
  console.log('[1/3] Running migrations...');
  try {
    const { runAll } = require('../migrate');
    const result = await runAll();
    if (result.error) {
      console.error('Migration error:', result.error);
      console.error('Continuing anyway — seed may fail if tables are missing.');
    } else {
      console.log(`      ${result.ran} migration(s) applied`);
    }
  } catch (err) {
    console.error('Migration runner failed:', err.message);
  }

  const client = await db.pool.connect();

  try {
    // 3. Clean if requested
    if (isClean) {
      console.log('[2/3] Cleaning existing data...');
      await client.query('SET session_replication_role = \'replica\'');
      for (const table of TABLES_DELETE_ORDER) {
        try {
          await client.query(`DELETE FROM "${table}"`);
          console.log(`      Cleared: ${table}`);
        } catch (err) {
          // Table might not exist — skip silently
          if (err.code !== '42P01') { // 42P01 = undefined_table
            console.warn(`      Warning on ${table}: ${err.message}`);
          }
        }
      }
      await client.query('SET session_replication_role = \'origin\'');
    } else {
      console.log('[2/3] Skip clean (use --clean to wipe first)');
    }

    // 4. Execute seed SQL
    console.log('[3/3] Importing seed data...');
    const sql = fs.readFileSync(SEED_FILE, 'utf8');

    await client.query(sql);

    console.log('');
    console.log('Done! Seed data imported successfully.');
    console.log('');

    // Quick verification
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM companies) AS companies,
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM projects) AS projects
    `);
    const c = counts.rows[0];
    console.log(`Verification: ${c.companies} companies, ${c.users} users, ${c.projects} projects`);

  } catch (err) {
    console.error('');
    console.error('Import failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    console.error('');
    console.error('Tips:');
    console.error('  - ถ้า duplicate key → ใช้ --clean flag: node api/seed/import.js --clean');
    console.error('  - ถ้า table not found → check ว่า migrations run ครบหรือยัง');
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

main();
