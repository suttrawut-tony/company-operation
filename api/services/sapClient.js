/**
 * SAP B1 Service Layer Client (singleton)
 * Env vars: SAP_HOST, SAP_COMPANY_DB, SAP_USER, SAP_PASSWORD
 */
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

class SAPClient {
  constructor() {
    this.host = process.env.SAP_HOST;
    this.companyDB = process.env.SAP_COMPANY_DB;
    this.username = process.env.SAP_USER;
    this.password = process.env.SAP_PASSWORD;
    this.sessionId = null;
    this.sessionExpiry = null;
  }

  isConfigured() {
    return !!(this.host && this.companyDB && this.username && this.password);
  }

  async login() {
    if (!this.isConfigured()) throw new Error('SAP not configured');
    if (this.sessionId && this.sessionExpiry > Date.now()) return this.sessionId;

    const resp = await fetch(this.host + '/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CompanyDB: this.companyDB,
        UserName: this.username,
        Password: this.password
      }),
      dispatcher: agent
    });
    if (!resp.ok) throw new Error('SAP Login failed: ' + await resp.text());
    const data = await resp.json();
    this.sessionId = data.SessionId;
    this.sessionExpiry = Date.now() + 25 * 60 * 1000;
    return this.sessionId;
  }

  async request(method, endpoint, body) {
    const session = await this.login();
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Cookie': 'B1SESSION=' + session },
      dispatcher: agent
    };
    if (body) opts.body = JSON.stringify(body);

    let resp = await fetch(this.host + endpoint, opts);
    // Session expired: retry once
    if (resp.status === 401) {
      this.sessionId = null;
      const s2 = await this.login();
      opts.headers.Cookie = 'B1SESSION=' + s2;
      resp = await fetch(this.host + endpoint, opts);
    }
    if (!resp.ok) throw new Error('SAP Error (' + resp.status + '): ' + await resp.text());
    return resp.json();
  }

  async createJournalEntry(data) { return this.request('POST', '/JournalEntries', data); }
}

module.exports = new SAPClient();
