async function requireAuth(allowedRoles) {
  try {
    const { user } = await API.me();
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      window.location.href = user.role === 'admin' ? '/admin/dashboard.html' : '/staff/dashboard.html';
      return null;
    }
    return user;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

async function logout() {
  await API.logout();
  window.location.href = '/login.html';
}

function formatDate(str) {
  if (!str) return '—';
  return str.slice(0, 10);
}

function statusBadge(status) {
  const cls = status === 'completed' ? 'badge-success' : 'badge-warning';
  return `<span class="badge ${cls}">${status}</span>`;
}

function typeBadge(type) {
  const cls = type === 'inward' ? 'badge-inward' : 'badge-outward';
  return `<span class="badge ${cls}">${type}</span>`;
}

function showAlert(el, message, type = 'error') {
  el.textContent = message;
  el.className = `alert alert-${type}`;
  el.hidden = false;
}

function hideAlert(el) {
  el.hidden = true;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
