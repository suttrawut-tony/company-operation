/**
 * Company Operation — Frontend API Client
 * Connects to backend at /api/*
 */

const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('sda_token');
  },

  setToken(token) {
    localStorage.setItem('sda_token', token);
  },

  getUser() {
    const raw = localStorage.getItem('sda_user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    localStorage.setItem('sda_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('sda_token');
    localStorage.removeItem('sda_user');
    window.location.href = 'login.html';
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  // Redirect to login if not authenticated
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${this.baseUrl}${path}`, opts);
    } catch (netErr) {
      throw new Error('Cannot reach server. Check your connection.');
    }

    // Auth-related side effects
    if (res.status === 401) {
      // Allow callers to handle their own 401 (e.g. login screen)
      if (path !== '/auth/login' && path !== '/auth/forgot-password' && path !== '/auth/reset-password') {
        this.logout();
        throw new Error('Session expired');
      }
    }

    // Safely parse a response that may not be JSON (proxy error pages, etc.)
    const ct = res.headers.get('content-type') || '';
    let data = null;
    if (ct.includes('application/json')) {
      try { data = await res.json(); }
      catch (_) { data = null; }
    } else {
      const text = await res.text().catch(() => '');
      data = text ? { error: `Server error (${res.status})` } : null;
    }

    if (res.status === 403 && data && data.code === 'MUST_CHANGE_PASSWORD') {
      if (!location.pathname.endsWith('change-password.html')) {
        window.location.href = 'change-password.html';
      }
      throw new Error('Password change required');
    }

    if (!res.ok) {
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }
    return data || {};
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // ─── Auth ───
  async login(email, password, slug = 'company', remember = false) {
    const data = await this.post('/auth/login', { email, password, slug, remember });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async getMe() { return this.get('/auth/me'); },
  async changePassword(currentPassword, newPassword) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  },
  async forgotPassword(email) {
    return this.post('/auth/forgot-password', { email });
  },
  async resetPassword(token, newPassword) {
    return this.post('/auth/reset-password', { token, newPassword });
  },
  async register(data) {
    return this.post('/auth/register', data);
  },
  async approveUser(id, body = {}) {
    return this.post(`/auth/users/${id}/approve`, body);
  },
  async getAdmins(slug = 'company') {
    return this.get(`/auth/admins?slug=${encodeURIComponent(slug)}`);
  },

  // ─── Dashboard ───
  async getDashboard() { return this.get('/dashboard'); },

  // ─── Projects ───
  async getProjects() { return this.get('/projects'); },
  async getProject(id) { return this.get(`/projects/${id}`); },
  async createProject(data) { return this.post('/projects', data); },

  // ─── Budget ───
  async getBudgets(projectId) {
    const q = projectId ? `?project_id=${projectId}` : '';
    return this.get(`/budget${q}`);
  },
  async getBudget(id) { return this.get(`/budget/${id}`); },
  async createBudget(data) { return this.post('/budget', data); },
  async submitBudget(id) { return this.post(`/budget/${id}/submit`); },
  async approveBudget(id) { return this.post(`/budget/${id}/approve`); },

  // ─── PR ───
  async getPRs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/pr${q ? '?' + q : ''}`);
  },
  async getPR(id) { return this.get(`/pr/${id}`); },
  async createPR(data) { return this.post('/pr', data); },
  async submitPR(id) { return this.post(`/pr/${id}/submit`); },
  async approvePR(id) { return this.post(`/pr/${id}/approve`); },

  // ─── PO ───
  async getPOs() { return this.get('/po'); },
  async getPO(id) { return this.get(`/po/${id}`); },
  async createPO(data) { return this.post('/po', data); },

  // ─── Expense ───
  async getExpenses(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/expense${q ? '?' + q : ''}`);
  },
  async createExpense(data) { return this.post('/expense', data); },
  async submitExpense(id) { return this.post(`/expense/${id}/submit`); },
  async approveExpense(id) { return this.post(`/expense/${id}/approve`); },

  // ─── Vehicle ───
  async getVehicles() { return this.get('/vehicle'); },
  async getVehicleBookings(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/vehicle/bookings${q ? '?' + q : ''}`);
  },
  async createVehicleBooking(data) { return this.post('/vehicle/bookings', data); },
  async checkoutVehicle(id, data) { return this.post(`/vehicle/bookings/${id}/checkout`, data); },
  async checkinVehicle(id, data) { return this.post(`/vehicle/bookings/${id}/checkin`, data); },
  async getVehicleInsurance(vid) { return this.get(`/vehicle/${vid}/insurance`); },
  async addVehicleInsurance(vid, data) { return this.post(`/vehicle/${vid}/insurance`, data); },
  async updateVehicleInsurance(insId, data) { return this.put(`/vehicle/insurance/${insId}`, data); },
  async getVehicleClaims(vid) { return this.get(`/vehicle/${vid}/claims`); },
  async addVehicleClaim(vid, data) { return this.post(`/vehicle/${vid}/claims`, data); },
  async updateVehicleClaim(claimId, data) { return this.put(`/vehicle/claims/${claimId}`, data); },
  async getVehicleMaintenance(vid) { return this.get(`/vehicle/${vid}/maintenance`); },
  async addVehicleMaintenance(vid, data) { return this.post(`/vehicle/${vid}/maintenance`, data); },
  async updateVehicleMaintenance(id, data) { return this.put(`/vehicle/maintenance/${id}`, data); },
  async getVehicleIssues(vid) { return this.get(`/vehicle/${vid}/issues`); },
  async addVehicleIssue(vid, data) { return this.post(`/vehicle/${vid}/issues`, data); },
  async updateVehicleIssue(id, data) { return this.put(`/vehicle/issues/${id}`, data); },
  async getVehicleAvailability(params) { const q = new URLSearchParams(params).toString(); return this.get(`/vehicle/availability${q ? '?' + q : ''}`); },
  async getVehicleSchedule(vid, months) { return this.get(`/vehicle/${vid}/schedule?months=${months||3}`); },
  async getVehicleAlerts() { return this.get('/vehicle/alerts'); },
  // ─── Bookings (Unified) ───
  async getBookings(params) { const q = new URLSearchParams(params).toString(); return this.get(`/bookings${q ? '?' + q : ''}`); },
  async createBooking(data) { return this.post('/bookings', data); },
  async updateBooking(id, data) { return this.put(`/bookings/${id}`, data); },
  async deleteBooking(id) { return this.del(`/bookings/${id}`); },
  async approveBooking(id) { return this.post(`/bookings/${id}/approve`); },
  async getTechnicians() { return this.get('/technicians'); },
  async createTechnician(data) { return this.post('/technicians', data); },
  async updateTechnician(id, data) { return this.put(`/technicians/${id}`, data); },

  // ─── Travel ───
  async getTravels() { return this.get('/travel'); },
  async getTravel(id) { return this.get(`/travel/${id}`); },
  async createTravel(data) { return this.post('/travel', data); },
  async confirmTravel(id) { return this.post(`/travel/${id}/confirm`); },
  async submitTravel(id) { return this.post(`/travel/${id}/submit`); },
  async approveTravel(id) { return this.post(`/travel/${id}/approve`); },

  // ─── OT ───
  async getOTs() { return this.get('/ot'); },
  async createOT(data) { return this.post('/ot', data); },
  async submitOT(id) { return this.post(`/ot/${id}/submit`); },

  // ─── Number Series ───
  async getNumberSeries() { return this.get('/number-series'); },
  async getNextNumber(docType) { return this.get(`/number-series/next/${docType}`); },

  // ─── Approvals ───
  async getPendingApprovals() { return this.get('/approvals/pending'); },

  // ─── Notifications ───
  async getNotifications() { return this.get('/notifications'); },
  async markRead(id) { return this.post(`/notifications/${id}/read`); },
  async markAllRead() { return this.post('/notifications/read-all'); },

  // ─── WebSocket Real-time ───
  _ws: null,
  _wsHandlers: [],
  _wsReconnectTimer: null,

  connectWS() {
    if (this._ws && this._ws.readyState <= 1) return;
    const token = this.getToken();
    if (!token) return;  // not authenticated — server now requires a token on WS connect
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = protocol + '//' + location.host + '?token=' + encodeURIComponent(token);
    try {
      this._ws = new WebSocket(url);
      this._ws.onopen = () => { console.log('[WS] Connected'); };
      this._ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          this._wsHandlers.forEach(fn => fn(msg));
        } catch(err) {}
      };
      this._ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting in 3s...');
        clearTimeout(this._wsReconnectTimer);
        this._wsReconnectTimer = setTimeout(() => this.connectWS(), 3000);
      };
      this._ws.onerror = () => {};
    } catch(e) {}
  },

  onRealtime(handler) {
    this._wsHandlers.push(handler);
    this.connectWS();
  },
};
