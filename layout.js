function renderAdminNav(activePage) {
  const pages = [
    { href: '/admin/dashboard.html', label: 'Dashboard', id: 'dashboard' },
    { href: '/admin/staff.html', label: 'Staff', id: 'staff' },
    { href: '/admin/customers.html', label: 'Customers', id: 'customers' },
    { href: '/admin/work-inward.html', label: 'Inward Work', id: 'work-inward' },
    { href: '/admin/work-outward.html', label: 'Outward Work', id: 'work-outward' },
    { href: '/admin/reports.html', label: 'Reports', id: 'reports' },
  ];

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">CRM Admin</div>
      <nav>
        ${pages.map(p => `
          <a href="${p.href}" class="nav-link ${p.id === activePage ? 'active' : ''}">${p.label}</a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <span id="userName"></span>
        <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>
      </div>
    </aside>
  `;
}

function renderStaffNav(activePage) {
  const pages = [
    { href: '/staff/dashboard.html', label: 'Dashboard', id: 'dashboard' },
    { href: '/staff/my-work.html', label: 'My Work', id: 'my-work' },
    { href: '/staff/reports.html', label: 'My Reports', id: 'reports' },
  ];

  return `
    <aside class="sidebar">
      <div class="sidebar-brand">CRM Staff</div>
      <nav>
        ${pages.map(p => `
          <a href="${p.href}" class="nav-link ${p.id === activePage ? 'active' : ''}">${p.label}</a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <span id="userName"></span>
        <button class="btn btn-sm btn-outline" onclick="logout()">Logout</button>
      </div>
    </aside>
  `;
}

async function initAdminPage(pageId, callback) {
  const user = await requireAuth(['admin']);
  if (!user) return;
  document.getElementById('layout').innerHTML = renderAdminNav(pageId);
  document.getElementById('userName').textContent = user.full_name;
  if (callback) await callback(user);
}

async function initStaffPage(pageId, callback) {
  const user = await requireAuth(['staff']);
  if (!user) return;
  document.getElementById('layout').innerHTML = renderStaffNav(pageId);
  document.getElementById('userName').textContent = user.full_name;
  if (callback) await callback(user);
}
