const API = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'same-origin',
      ...options,
    });

    if (res.status === 401 && !url.includes('/auth/login')) {
      window.location.href = '/login.html';
      throw new Error('Unauthorized');
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }

    if (!res.ok) throw new Error('Request failed');
    return res;
  },

  login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  },

  me() {
    return this.request('/api/auth/me');
  },

  getUsers() {
    return this.request('/api/users');
  },

  createUser(data) {
    return this.request('/api/users', { method: 'POST', body: JSON.stringify(data) });
  },

  updateUser(id, data) {
    return this.request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  deactivateUser(id) {
    return this.request(`/api/users/${id}`, { method: 'DELETE' });
  },

  getCustomers() {
    return this.request('/api/customers');
  },

  createCustomer(data) {
    return this.request('/api/customers', { method: 'POST', body: JSON.stringify(data) });
  },

  updateCustomer(id, data) {
    return this.request(`/api/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  getWork(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/work${qs ? '?' + qs : ''}`);
  },

  getMyWork() {
    return this.request('/api/work/mine');
  },

  getStats() {
    return this.request('/api/work/stats');
  },

  createWork(data) {
    return this.request('/api/work', { method: 'POST', body: JSON.stringify(data) });
  },

  updateWork(id, data) {
    return this.request(`/api/work/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  updateWorkStatus(id, data) {
    return this.request(`/api/work/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  getReportSummary(period, date) {
    const qs = new URLSearchParams({ period, date }).toString();
    return this.request(`/api/reports/summary?${qs}`);
  },

  exportReport(format, period, date) {
    const qs = new URLSearchParams({ format, period, date }).toString();
    window.open(`/api/reports/export?${qs}`, '_blank');
  },
};
