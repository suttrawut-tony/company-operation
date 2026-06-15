/**
 * ERP (SAP B1) Service Layer Client (singleton)
 *
 * Unified env vars (see .env.example — same names used by sapPush.js / routes/sap.js):
 *   SAP_BASE_URL      e.g. https://10.10.10.109:50000/b1s/v1   (includes /b1s/v1)
 *   SAP_COMPANY_DB    e.g. SBO_TONG
 *   SAP_USERNAME      B1 application user (NOT the HANA SYSTEM account)
 *   SAP_PASSWORD
 *   SAP_INSECURE_TLS  optional. "true" = skip TLS cert verification (self-signed).
 *                     Default (unset/anything else) = verify cert (secure).
 *
 * Uses Node's native fetch (powered by undici). NOTE: native fetch does NOT
 * honour a Node `https.Agent` passed as `agent`/`dispatcher` — it is silently
 * ignored. To accept a self-signed SAP cert we must pass an *undici* Agent as
 * the `dispatcher` option instead.
 */

const REQUEST_TIMEOUT_MS = 30000;      // 30s hard timeout per request
const MAX_TRANSIENT_RETRIES = 3;       // retries for network/5xx/429 (excludes 401 refresh)
const RETRY_BASE_DELAY_MS = 500;       // exponential backoff base

// ─── TLS dispatcher (lazy, opt-in) ──────────────────────────────────────────
// SECURITY WARNING: rejectUnauthorized:false disables TLS certificate
// verification and exposes the connection to man-in-the-middle (MITM) attacks.
// Only acceptable for a trusted SAP host on an internal network. In production
// you should install/pin the SAP server's CA certificate instead of disabling
// verification. This path is gated behind SAP_INSECURE_TLS=true; the default is
// to verify the certificate.
let _insecureDispatcher;
let _dispatcherResolved = false;
function getDispatcher() {
  // Secure by default: no custom dispatcher → native fetch verifies the cert.
  if (process.env.SAP_INSECURE_TLS !== 'true') return undefined;

  if (_dispatcherResolved) return _insecureDispatcher;
  _dispatcherResolved = true;
  try {
    // Lazy require so the module still loads when undici isn't installed.
    const { Agent } = require('undici');
    _insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    console.warn('[SAP] SAP_INSECURE_TLS=true — TLS certificate verification is DISABLED (MITM risk). Use only for trusted internal SAP hosts; pin the SAP CA in production.');
  } catch (e) {
    _insecureDispatcher = undefined;
    console.warn('[SAP] SAP_INSECURE_TLS=true but the "undici" package is not installed; cannot disable cert verification. Run `npm install undici`. Falling back to default TLS verification. (' + e.message + ')');
  }
  return _insecureDispatcher;
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function isTransientError(err) {
  if (!err) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true; // request timed out
  return /fetch failed|network|socket|ECONN|ETIMEDOUT|EAI_AGAIN/i.test(err.message || '');
}

class SAPClient {
  constructor() {
    this.baseUrl = process.env.SAP_BASE_URL;
    this.companyDB = process.env.SAP_COMPANY_DB;
    this.username = process.env.SAP_USERNAME;
    this.password = process.env.SAP_PASSWORD;
    this.sessionId = null;
    this.sessionExpiry = null;
  }

  isConfigured() {
    return !!(this.baseUrl && this.companyDB && this.username && this.password);
  }

  // Single place that adds timeout + (optional) insecure-TLS dispatcher to fetch.
  _fetch(url, opts) {
    const fetchOpts = Object.assign({}, opts, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const dispatcher = getDispatcher();
    if (dispatcher) fetchOpts.dispatcher = dispatcher;
    return fetch(url, fetchOpts);
  }

  async login() {
    if (!this.isConfigured()) throw new Error('SAP not configured');
    if (this.sessionId && this.sessionExpiry > Date.now()) return this.sessionId;

    const resp = await this._fetch(this.baseUrl + '/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CompanyDB: this.companyDB,
        UserName: this.username,
        Password: this.password,
      }),
    });
    if (!resp.ok) throw new Error('SAP Login failed: ' + await resp.text());
    const data = await resp.json();
    this.sessionId = data.SessionId;
    this.sessionExpiry = Date.now() + 25 * 60 * 1000; // 25 min (SAP default 30)
    return this.sessionId;
  }

  async request(method, endpoint, body) {
    let lastErr;
    for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
      try {
        const session = await this.login();
        const opts = {
          method,
          headers: { 'Content-Type': 'application/json', 'Cookie': 'B1SESSION=' + session },
        };
        if (body) opts.body = JSON.stringify(body);

        let resp = await this._fetch(this.baseUrl + endpoint, opts);

        // Session expired → refresh once (separate from transient retries).
        if (resp.status === 401) {
          this.sessionId = null;
          const s2 = await this.login();
          opts.headers.Cookie = 'B1SESSION=' + s2;
          resp = await this._fetch(this.baseUrl + endpoint, opts);
        }

        // Transient server-side conditions → backoff + retry.
        if ((resp.status >= 500 || resp.status === 429) && attempt < MAX_TRANSIENT_RETRIES) {
          lastErr = new Error('SAP transient error (' + resp.status + ')');
          await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        if (!resp.ok) throw new Error('SAP Error (' + resp.status + '): ' + await resp.text());
        return resp.json();
      } catch (err) {
        // Network failure / timeout → backoff + retry. Business errors bubble up.
        if (isTransientError(err) && attempt < MAX_TRANSIENT_RETRIES) {
          lastErr = err;
          await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error('SAP request failed after ' + MAX_TRANSIENT_RETRIES + ' retries');
  }

  async createJournalEntry(data) { return this.request('POST', '/JournalEntries', data); }
}

module.exports = new SAPClient();
