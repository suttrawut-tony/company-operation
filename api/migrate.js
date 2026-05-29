/**
 * Company Operation — Auto-migration runner
 *
 * Scans api/migrations/*.sql, tracks applied filenames in a `_migrations`
 * table, runs anything not yet applied in filename order.
 *
 * On a brand-new DB it will run everything from 001 up.
 * On an existing DB (set up via setup.sh / database.sql before this runner
 * existed), it backfills the legacy migrations (001–012) as already-applied
 * so they aren't re-run against populated tables.
 *
 * Called from server.js on boot. Also runnable directly:
 *   node api/migrate.js
 */
const fs = require('fs');
const path = require('path');
const db = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDS_DIR      = path.join(__dirname, 'seeds');
const POC_SEED_FILE  = path.join(SEEDS_DIR, 'poc-demo.sql');
const LEGACY_BASELINE_MAX = 12; // 001..012 were applied via database.sql before this runner existed

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.+\.sql$/i.test(f)) // strict NNN_*.sql, skips backup_*.sql
    .sort();
}

function fileNumber(name) {
  const m = name.match(/^(\d{3})_/);
  return m ? parseInt(m[1], 10) : -1;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name        VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * If RESET_DB=true is set, wipe the entire public schema before migrating.
 * Useful when a previous migration attempt left orphaned objects (e.g. an
 * ENUM type) that block re-running migration 001. Logs loudly so it isn't
 * triggered accidentally.
 */
async function maybeResetSchema(client) {
  if (process.env.RESET_DB !== 'true') return false;
  console.log('═══════════════════════════════════════════════════════');
  console.log('[migrate] RESET_DB=true — wiping public schema (ALL DATA LOST)');
  console.log('[migrate] If this is not intended, REMOVE the RESET_DB env var now');
  console.log('═══════════════════════════════════════════════════════');
  await client.query('DROP SCHEMA IF EXISTS public CASCADE');
  await client.query('CREATE SCHEMA public');
  console.log('[migrate] public schema reset complete — migrations will run from scratch');
  return true;
}

/**
 * Postgres 15+ stopped granting CREATE / USAGE on schema public to the
 * `public` role by default. After a DROP+CREATE SCHEMA, even the schema's
 * owner sometimes needs the grants re-applied so subsequent CREATE EXTENSION
 * / CREATE TYPE / CREATE TABLE don't fail with 42501 "permission denied
 * for schema public". Best-effort: if we don't own the schema, this no-ops.
 */
async function ensureSchemaPermissions(client) {
  try {
    await client.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
  } catch (err) {
    console.warn(`[migrate] grant CURRENT_USER on schema public failed: ${err.message}`);
  }
  try {
    await client.query('GRANT ALL ON SCHEMA public TO public');
  } catch (err) {
    console.warn(`[migrate] grant public on schema public failed: ${err.message}`);
  }
}

async function tableExists(client, name) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return rows.length > 0;
}

async function backfillLegacyIfNeeded(client, allFiles) {
  // If _migrations is empty BUT users table already exists, the DB was
  // initialized via setup.sh before this runner existed — record the
  // legacy migrations as applied so we don't try to re-run them.
  const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM _migrations');
  if (rows[0].c > 0) return 0;

  const hasUsers = await tableExists(client, 'users');
  if (!hasUsers) return 0; // fresh DB — run everything from scratch

  const legacy = allFiles.filter(f => fileNumber(f) > 0 && fileNumber(f) <= LEGACY_BASELINE_MAX);
  if (legacy.length === 0) return 0;

  console.log(`[migrate] existing DB detected — marking ${legacy.length} legacy migration(s) as applied without running:`);
  legacy.forEach(f => console.log(`           · ${f}`));
  for (const name of legacy) {
    await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
  }
  return legacy.length;
}

async function applyMigration(client, name) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
  await client.query(sql);
  await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
}

// Marker stored in _migrations once the POC seed has been applied. Lets
// us re-run migrate.js without re-truncating + reseeding the DB.
const POC_SEED_MARKER = '__poc_seed_loaded';

const STATIC_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
const SEED_COMPANY_ID      = '11111111-1111-1111-1111-111111111111';

/**
 * Load api/seeds/poc-demo.sql into the DB if it has real SQL in it AND
 * we haven't already loaded it on this DB.
 *
 * Handles the quirks of a pg_dump 17 --data-only export:
 *  - Strips \restrict / \unrestrict psql meta-commands (node-postgres can't parse them)
 *  - TRUNCATE companies CASCADE first so sample data inserted by the schema
 *    migrations (002, 003, 004, 005, 006, 009, 012) doesn't duplicate / conflict
 *    with the dump
 *  - After loading, ensures the static-login admin user exists in `users` so
 *    writes that reference its UUID don't fail FK constraints
 *
 * Returns { loaded: bool, reason: string }
 */
async function maybeSeedPocDemo(client) {
  if (!fs.existsSync(POC_SEED_FILE)) {
    return { loaded: false, reason: 'no seed file' };
  }
  const rawSql = fs.readFileSync(POC_SEED_FILE, 'utf8');
  const meaningful = rawSql
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('--'))
    .join('\n')
    .trim();
  if (!meaningful) {
    return { loaded: false, reason: 'seed file is empty / comment-only' };
  }
  if (!(await tableExists(client, 'projects'))) {
    return { loaded: false, reason: 'projects table not set up yet' };
  }

  // Idempotency — once loaded, never re-truncate
  const { rows: marker } = await client.query(
    'SELECT 1 FROM _migrations WHERE name = $1',
    [POC_SEED_MARKER]
  );
  if (marker.length > 0) {
    return { loaded: false, reason: 'POC seed already applied (marker present)' };
  }

  // Strip pg_dump 17 psql meta-commands the node-postgres parser rejects
  const cleanSql = rawSql
    .replace(/^\\restrict.*$/gm,   '-- stripped psql \\restrict')
    .replace(/^\\unrestrict.*$/gm, '-- stripped psql \\unrestrict');

  // Run the destructive seed atomically. If the dump fails (e.g. it references
  // a table the migrations don't create, like business_partners), ROLL BACK so
  // the data seeded by migrations (002–012) is preserved rather than left
  // truncated — keeping the app usable and the admin login intact.
  console.log(`[migrate] preparing POC seed (transactional) — loading ${(rawSql.length / 1024).toFixed(0)} KB...`);
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE companies CASCADE');
    await client.query(cleanSql);
    // pg_dump sets search_path='' on this connection — restore it so the
    // unqualified statements below (and ensureAdminLogin) resolve `public`.
    await client.query('SET search_path TO public');

    // The static-login admin user (admin@local) needs to exist in the users
    // table so write operations referencing its UUID pass FK checks.
    await client.query(
      `INSERT INTO users (id, company_id, email, password_hash,
                          first_name, last_name, first_name_th, last_name_th,
                          role, position, department, is_active, created_at)
       VALUES ($1, $2, $3, '',
               $4, $5, $6, $7,
               'executive', 'System Administrator', 'IT', true, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        STATIC_ADMIN_USER_ID, SEED_COMPANY_ID, 'admin@local',
        'Admin', 'Local', 'แอดมิน', 'ระบบ',
      ]
    );

    await client.query(
      'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
      [POC_SEED_MARKER]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client.query('SET search_path TO public').catch(() => {});
    throw err;
  }

  const { rows: r2 } = await client.query('SELECT COUNT(*)::int AS c FROM projects');
  console.log(`[migrate] ✓ POC demo loaded — ${r2[0].c} project(s) now present`);
  return { loaded: true, reason: 'fresh DB seeded with POC data' };
}

/**
 * Self-healing super-admin. Runs on EVERY boot (after migrations + seed) so the
 * primary admin can ALWAYS log in — even if the POC seed excludes users, the
 * dump failed/rolled back, a password was changed, or the account was disabled.
 *   Login: admin@sala-daeng.com / 111111   (company slug: company)
 * Self-sufficient: creates/normalises the company (slug 'company') then upserts
 * the admin. Best-effort — never throws.
 */
async function ensureAdminLogin(client) {
  if (!(await tableExists(client, 'users')) || !(await tableExists(client, 'companies'))) {
    console.log('[migrate] ensure-admin skipped: users/companies table missing');
    return;
  }
  try {
    // A prior pg_dump load may have cleared search_path on this connection.
    await client.query('SET search_path TO public');
    // Guarantee the company (slug='company') exists (login joins on slug).
    // Force the slug on the seed company id so an earlier 'sda-group' value
    // (from migration 002 / poc-demo) is normalised to 'company'.
    await client.query(
      `INSERT INTO companies (id, name, slug)
       VALUES ($1, 'บริษัท เอส.ดี.เอ. กรุ๊ป จำกัด', 'company')
       ON CONFLICT (id) DO UPDATE SET slug = 'company'`,
      [SEED_COMPANY_ID]
    );
    await client.query(`
      INSERT INTO users (company_id, email, password_hash,
                         first_name, last_name, first_name_th, last_name_th,
                         role, position, department, can_approve, approval_limit, is_active)
      SELECT c.id, 'admin@sala-daeng.com', crypt('111111', gen_salt('bf')),
             'Admin', 'Sala-Daeng', 'แอดมิน', 'ศาลาแดง',
             'executive', 'System Administrator', 'IT', true, 999999999, true
      FROM companies c WHERE c.slug = 'company'
      ON CONFLICT (email) DO UPDATE SET
        password_hash = crypt('111111', gen_salt('bf')),
        is_active     = true,
        role          = 'executive'
    `);
    // Keep 111111 usable — don't force a password change on this seed account.
    try {
      await client.query(
        "UPDATE users SET must_change_password = false WHERE email = 'admin@sala-daeng.com'"
      );
    } catch (_) { /* column may not exist on older schema — ignore */ }
    console.log('[migrate] ✓ ensured admin@sala-daeng.com / 111111 login');
  } catch (err) {
    console.error('[migrate] ensure-admin failed:', err.message);
  }
}

/**
 * Fix orphaned user references — runs every boot.
 * Reassigns created_by, assigned_to, pm_user_id etc. that point to
 * deleted/missing users to actual existing users. Best-effort.
 */
async function fixOrphanUsers(client) {
  try {
    await client.query('SET search_path TO public');
    const { rows: users } = await client.query(
      `SELECT id, role FROM users WHERE is_active = true ORDER BY
       CASE role WHEN 'pm' THEN 1 WHEN 'finance' THEN 2 WHEN 'procurement' THEN 3
       WHEN 'accounting' THEN 4 WHEN 'staff' THEN 5 WHEN 'admin' THEN 6 ELSE 7 END LIMIT 6`
    );
    if (users.length === 0) return;
    const pm = users.find(u => u.role === 'pm') || users[0];
    const fin = users.find(u => u.role === 'finance') || users[0];
    const fallback = users[0].id;
    const ids = users.map(u => u.id);
    const pick = () => ids[Math.floor(Math.random() * ids.length)];

    let fixed = 0;
    const tables = [
      { t: 'projects', col: 'pm_user_id', val: pm.id },
      { t: 'purchase_requests', col: 'created_by' },
      { t: 'purchase_orders', col: 'created_by' },
      { t: 'advance_requests', col: 'created_by' },
      { t: 'advance_payments', col: 'paid_by', val: fin.id },
      { t: 'expenses', col: 'created_by' },
      { t: 'tasks', col: 'assigned_to' },
      { t: 'travel_requests', col: 'created_by', val: pm.id },
      { t: 'ot_requests', col: 'user_id' },
      { t: 'vehicle_bookings', col: 'booked_by' },
    ];
    for (const { t, col, val } of tables) {
      try {
        const { rowCount } = await client.query(
          `UPDATE ${t} SET ${col} = $1 WHERE ${col} IS NOT NULL AND ${col} NOT IN (SELECT id FROM users)`,
          [val || pick()]
        );
        fixed += rowCount;
      } catch (_) { /* table/column may not exist */ }
    }
    // Also fix advance employee_id
    try { await client.query(`UPDATE advance_requests SET employee_id = created_by WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id FROM users)`); } catch (_) {}
    // Also fix ot created_by
    try { await client.query(`UPDATE ot_requests SET created_by = user_id WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users)`); } catch (_) {}
    // Ensure all users in all projects
    try {
      const cid = (await client.query(`SELECT company_id FROM users WHERE is_active = true LIMIT 1`)).rows[0]?.company_id;
      if (cid) {
        await client.query(
          `INSERT INTO project_members (project_id, user_id, role)
           SELECT p.id, u.id, u.role::text FROM projects p CROSS JOIN users u
           WHERE u.company_id = $1 AND u.is_active = true ON CONFLICT DO NOTHING`, [cid]
        );
      }
    } catch (_) {}
    if (fixed > 0) console.log(`[migrate] ✓ fixed ${fixed} orphaned user reference(s)`);
  } catch (err) {
    console.error('[migrate] fix-orphans failed:', err.message);
  }
}

/**
 * Runs pending migrations. Returns a summary.
 * Throws nothing — caller decides what to do if migrations failed.
 */
async function runAll() {
  const allFiles = listMigrationFiles();
  if (allFiles.length === 0) {
    console.log('[migrate] no migration files found');
    return { ran: 0, failed: 0, skipped: 0, error: null };
  }

  let client;
  try {
    client = await db.pool.connect();
  } catch (err) {
    console.error('[migrate] cannot connect to DB:', err.code || err.message);
    console.error('[migrate] migrations will NOT run. Auth endpoints may fail until DB is reachable.');
    return { ran: 0, failed: 0, skipped: 0, error: err.code || err.message };
  }

  try {
    await maybeResetSchema(client);
    await ensureSchemaPermissions(client);
    await ensureMigrationsTable(client);
    await backfillLegacyIfNeeded(client, allFiles);

    const { rows } = await client.query('SELECT name FROM _migrations');
    const applied = new Set(rows.map(r => r.name));
    const pending = allFiles.filter(f => !applied.has(f));

    let ran = 0, failed = 0, firstError = null;
    if (pending.length === 0) {
      // Don't return early — seed + ensure-admin below must still run so the
      // primary login is re-affirmed on every boot.
      console.log(`[migrate] all ${allFiles.length} migration(s) already applied`);
    } else {
      console.log(`[migrate] applying ${pending.length} pending migration(s):`);
      for (const name of pending) {
        try {
          console.log(`[migrate] → ${name}`);
          await applyMigration(client, name);
          console.log(`[migrate] ✓ ${name}`);
          ran++;
        } catch (err) {
          failed++;
          if (!firstError) firstError = `${name}: ${err.message}`;
          console.error(`[migrate] ✗ ${name}: ${err.message}`);
          // Stop on first failure — subsequent migrations may depend on this one.
          break;
        }
      }
    }

    // After successful migrations, try to seed POC demo data (best-effort)
    let seeded = false;
    if (failed === 0) {
      try {
        const r = await maybeSeedPocDemo(client);
        seeded = r.loaded;
        if (!r.loaded) console.log(`[migrate] seed skipped: ${r.reason}`);
      } catch (err) {
        console.error(`[migrate] seed failed: ${err.message}`);
      }
    }

    // Always re-affirm the primary admin login (self-healing, every boot).
    if (failed === 0) await ensureAdminLogin(client);

    // Fix orphaned user references (self-healing, every boot).
    if (failed === 0) await fixOrphanUsers(client);

    return { ran, failed, skipped: 0, seeded, error: firstError };
  } finally {
    client.release();
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  runAll()
    .then(r => {
      console.log('[migrate] done:', r);
      process.exit(r.failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('[migrate] fatal:', err);
      process.exit(1);
    });
}

module.exports = { runAll };
