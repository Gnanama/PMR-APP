let workType = 'inward';
let navPage = 'work-inward';
let workList = [];
let staffList = [];
let customerList = [];

function initWorkPage(type, pageId) {
  workType = type;
  navPage = pageId;
  initAdminPage(pageId, async () => {
    [customerList, staffList] = await Promise.all([API.getCustomers(), API.getUsers()]);
    populateSelects();
    loadWork();
    bindWorkForm();
  });
}

function populateSelects() {
  const custSel = document.getElementById('customer_id');
  custSel.innerHTML = customerList.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    || '<option value="">No customers — add one first</option>';

  const staffSel = document.getElementById('assigned_to');
  staffSel.innerHTML = '<option value="">Unassigned</option>' +
    staffList.filter(s => s.active).map(s => `<option value="${s.id}">${s.full_name}</option>`).join('');
}

function openModal(work) {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('formAlert').hidden = true;
  const label = workType.charAt(0).toUpperCase() + workType.slice(1);
  if (work) {
    document.getElementById('modalTitle').textContent = `Edit ${label} Record`;
    document.getElementById('workId').value = work.id;
    document.getElementById('customer_id').value = work.customer_id;
    document.getElementById('title').value = work.title;
    document.getElementById('description').value = work.description || '';
    document.getElementById('assigned_to').value = work.assigned_to || '';
    document.getElementById('due_date').value = work.due_date || '';
    document.getElementById('status').value = work.status;
  } else {
    document.getElementById('modalTitle').textContent = `New ${label} Record`;
    document.getElementById('workForm').reset();
    document.getElementById('workId').value = '';
  }
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

async function loadWork() {
  const status = document.getElementById('filterStatus').value;
  const params = { type: workType };
  if (status) params.status = status;
  workList = await API.getWork(params);

  document.getElementById('workTable').innerHTML = workList.map(w => `
    <tr>
      <td>${w.customer_name}</td>
      <td>${w.title}</td>
      <td>${w.staff_name || 'Unassigned'}</td>
      <td>${statusBadge(w.status)}</td>
      <td>${formatDate(w.due_date)}</td>
      <td>${formatDate(w.created_at)}</td>
      <td><button class="btn btn-sm btn-outline" data-edit="${w.id}">Edit</button></td>
    </tr>
  `).join('') || `<tr><td colspan="7">No ${workType} records yet.</td></tr>`;

  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = workList.find(x => x.id === parseInt(btn.dataset.edit, 10));
      if (w) openModal(w);
    });
  });
}

function bindWorkForm() {
  document.getElementById('workForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert = document.getElementById('formAlert');
    hideAlert(alert);
    const id = document.getElementById('workId').value;
    const assignedVal = document.getElementById('assigned_to').value;
    const data = {
      customer_id: parseInt(document.getElementById('customer_id').value, 10),
      type: workType,
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      assigned_to: assignedVal ? parseInt(assignedVal, 10) : null,
      due_date: document.getElementById('due_date').value || null,
      status: document.getElementById('status').value,
    };
    try {
      if (id) await API.updateWork(id, data);
      else await API.createWork(data);
      closeModal();
      showAlert(document.getElementById('alert'), 'Work record saved.', 'success');
      loadWork();
    } catch (err) {
      showAlert(alert, err.message);
    }
  });
}
