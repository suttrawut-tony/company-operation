/**
 * SDA Operation — Frontend API Client
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

    const res = await fetch(`${this.baseUrl}${path}`, opts);

    if (res.status === 401) {
      this.logout();
      throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // ─── Auth ───
  async login(email, password, slug = 'sda-group') {
    const data = await this.post('/auth/login', { email, password, slug });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async getMe() { return this.get('/auth/me'); },

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
  async getBookings(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/vehicle/bookings${q ? '?' + q : ''}`);
  },
  async createBooking(data) { return this.post('/vehicle/bookings', data); },
  async checkoutVehicle(id, data) { return this.post(`/vehicle/bookings/${id}/checkout`, data); },
  async checkinVehicle(id, data) { return this.post(`/vehicle/bookings/${id}/checkin`, data); },

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
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = protocol + '//' + location.host;
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
