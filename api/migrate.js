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
    return { ran, failed, skipped: 0, error: firstError };
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
