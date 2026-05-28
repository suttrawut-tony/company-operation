/**
 * SDA Operation — Auto-migration runner
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

  console.log('[migrate] preparing POC seed — wiping data inserted by schema migrations...');
  await client.query('TRUNCATE companies CASCADE');

  // Strip pg_dump 17 psql meta-commands the node-postgres parser rejects
  const cleanSql = rawSql
    .replace(/^\\restrict.*$/gm,   '-- stripped psql \\restrict')
    .replace(/^\\unrestrict.*$/gm, '-- stripped psql \\unrestrict');

  console.log(`[migrate] loading POC demo data (${(rawSql.length / 1024).toFixed(0)} KB)...`);
  await client.query(cleanSql);

  // The static-login admin user (admin@local) needs to exist in the users
  // table so write operations referencing its UUID pass FK checks.
  // Static login itself bypasses DB entirely — this is purely for writes.
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

  const { rows: r2 } = await client.query('SELECT COUNT(*)::int AS c FROM projects');
  console.log(`[migrate] ✓ POC demo loaded — ${r2[0].c} project(s) now present`);
  return { loaded: true, reason: 'fresh DB seeded with POC data' };
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

    if (pending.length === 0) {
      console.log(`[migrate] all ${allFiles.length} migration(s) already applied`);
      return { ran: 0, failed: 0, skipped: 0, error: null };
    }

    console.log(`[migrate] applying ${pending.length} pending migration(s):`);
    let ran = 0, failed = 0, firstError = null;
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
