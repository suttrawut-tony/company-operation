/**
 * Company Operation — Database Connection (PostgreSQL)
 * src/api/db.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // TCP keep-alive on each pooled connection. Railway PG sits behind a proxy/NAT
  // that silently drops idle TCP sockets; without keep-alive the next query on a
  // "dead" pooled connection eats a full reconnect (TCP + TLS handshake) latency
  // spike. This is a socket-level option only — it does NOT change query,
  // transaction, or pooling behavior in any way (100% backward-compatible).
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
