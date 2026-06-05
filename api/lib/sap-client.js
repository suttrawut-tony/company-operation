/**
 * Company Operation — SAP B1 Service Layer Client
 * Based on SAP Blueprint: Version 10.0
 *
 * SAP Service Layer base URL: https://<server>:50000/b1s/v1
 * Auth: Session-based (Login → get SessionId → use as cookie)
 *
 * ⚠️ Requires confirmation from client:
 *   - SAP B1 version (9.3+ with Service Layer)
 *   - HANA or SQL Server backend
 *   - Service Layer URL + credentials
 */

const https = require('https');

class SAPClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.SAP_BASE_URL;
    this.companyDB = config.companyDB || process.env.SAP_COMPANY_DB;
    this.username = config.username || process.env.SAP_USERNAME;
    this.password = config.password || process.env.SAP_PASSWORD;
    this.sessionId = null;
    this.sessionExpiry = null;

    // FIXED: Only allow self-signed certs if explicitly configured (dev only)
    this.agent = new https.Agent({ rejectUnauthorized: process.env.SAP_ALLOW_SELFSIGNED !== 'true' });
  }

  // ─── Authentication ───

  async login() {
    const resp = await this._request('POST', '/Login', {
      CompanyDB: this.companyDB,
      UserName: this.username,
      Password: this.password,
    });
    this.sessionId = resp.SessionId;
    this.sessionExpiry = Date.now() + 25 * 60 * 1000; // 25 min (SAP default 30)
    return resp;
  }

  async logout() {
    if (this.sessionId) {
      await this._request('POST', '/Logout');
      this.sessionId = null;
    }
  }

  async ensureSession() {
    if (!this.sessionId || Date.now() > this.sessionExpiry) {
      await this.login();
    }
  }

  // ─── Purchase Request (OPRQ) ───

  async createPurchaseRequest(prData) {
    await this.ensureSession();
    // Map web PR → SAP OPRQ format
    const sapDoc = {
      DocType: 'dDocument_Items',
      DocDate: prData.doc_date,
      CardCode: prData.vendor_code,       // BP code
      Comments: prData.remarks || '',
      DocumentLines: (prData.lines || []).map((line, i) => ({
        LineNum: i,
        ItemCode: line.item_code || null,
        ItemDescription: line.item_name,
        Quantity: line.quantity,
        UnitPrice: line.unit_price,
        AccountCode: line.sap_account,
        TaxCode: line.tax_code || 'IG07',
        // ProjectCode: prData.sap_project_code,  // if OPRJ exists
      })),
    };
    return this._request('POST', '/PurchaseRequests', sapDoc);
  }

  // ─── Purchase Order (OPOR) ───

  async createPurchaseOrder(poData) {
    await this.ensureSession();
    const sapDoc = {
      DocType: 'dDocument_Items',
      DocDate: poData.doc_date,
      CardCode: poData.vendor_code,
      Comments: poData.remarks || '',
      DocumentLines: (poData.lines || []).map((line, i) => ({
        LineNum: i,
        ItemCode: line.item_code || null,
        ItemDescription: line.item_name,
        Quantity: line.quantity,
        UnitPrice: line.unit_price,
        AccountCode: line.sap_account,
        TaxCode: line.tax_code || 'IG07',
      })),
    };
    return this._request('POST', '/PurchaseOrders', sapDoc);
  }

  // ─── AP Invoice / Expense (OPCH) ───

  async createAPInvoice(expenseData) {
    await this.ensureSession();
    const sapDoc = {
      DocType: 'dDocument_Service',         // Service type for expenses
      DocDate: expenseData.doc_date,
      CardCode: expenseData.vendor_code || 'VD0001',  // default vendor or employee
      Comments: expenseData.description || '',
      DocumentLines: [{
        LineNum: 0,
        ItemDescription: expenseData.description,
        UnitPrice: expenseData.amount,
        AccountCode: expenseData.sap_account,
        TaxCode: expenseData.tax_code || 'IS07',
      }],
    };
    return this._request('POST', '/PurchaseInvoices', sapDoc);
  }

  // ─── Lookups (Read-only) ───

  async getVendors(filter = '') {
    await this.ensureSession();
    let url = "/BusinessPartners?$filter=CardType eq 'S'&$select=CardCode,CardName,Phone1,EmailAddress&$top=100";
    // FIXED: Escape single quotes to prevent OData injection
    if (filter) url += ` and contains(CardName,'${filter.replace(/'/g, "''")}')`;
    return this._request('GET', url);
  }

  async getChartOfAccounts() {
    await this.ensureSession();
    return this._request('GET', '/ChartOfAccounts?$select=Code,Name&$filter=ActiveAccount eq \'Y\'&$top=500');
  }

  async getProjects() {
    await this.ensureSession();
    return this._request('GET', '/Projects?$select=Code,Name,Active');
  }

  async getDocumentStatus(objectType, docEntry) {
    await this.ensureSession();
    const endpoints = {
      OPRQ: '/PurchaseRequests',
      OPOR: '/PurchaseOrders',
      OPCH: '/PurchaseInvoices',
    };
    const endpoint = endpoints[objectType];
    if (!endpoint) throw new Error(`Unknown SAP object type: ${objectType}`);
    return this._request('GET', `${endpoint}(${docEntry})?$select=DocEntry,DocNum,DocumentStatus`);
  }

  async getActualByProject(projectCode) {
    await this.ensureSession();
    return this._request('GET',
      `/JournalEntries?$filter=ProjectCode eq '${projectCode}'&$select=JdtNum,RefDate,Memo,TransactionCode`
    );
  }

  // ─── Internal HTTP ───

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.sessionId) {
      headers['Cookie'] = `B1SESSION=${this.sessionId}`;
    }

    const options = {
      method,
      headers,
      agent: this.agent,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`SAP Error ${res.statusCode}: ${json.error?.message?.value || data}`));
            } else {
              resolve(json);
            }
          } catch {
            if (res.statusCode >= 400) reject(new Error(`SAP Error ${res.statusCode}: ${data}`));
            else resolve(data);
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
}

module.exports = SAPClient;
