function getDateRange(period, dateStr) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  if (isNaN(base.getTime())) {
    throw new Error('Invalid date');
  }

  let start, end, label;

  if (period === 'daily') {
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    start = `${y}-${m}-${d} 00:00:00`;
    end = `${y}-${m}-${d} 23:59:59`;
    label = `Daily Report — ${y}-${m}-${d}`;
  } else if (period === 'monthly') {
    const y = base.getFullYear();
    const m = base.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const ms = String(m + 1).padStart(2, '0');
    start = `${y}-${ms}-01 00:00:00`;
    end = `${y}-${ms}-${String(lastDay).padStart(2, '0')} 23:59:59`;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    label = `Monthly Report — ${monthNames[m]} ${y}`;
  } else if (period === 'yearly') {
    const y = base.getFullYear();
    start = `${y}-01-01 00:00:00`;
    end = `${y}-12-31 23:59:59`;
    label = `Yearly Report — ${y}`;
  } else {
    throw new Error('Invalid period');
  }

  return { start, end, label };
}

function buildWorkQuery(filters) {
  const { period, date, type, status, assignedTo, staffOnly } = filters;
  const { start, end, label } = getDateRange(period, date);

  let sql = `
    SELECT w.*,
      c.name AS customer_name,
      c.phone AS customer_phone,
      s.full_name AS staff_name,
      cr.full_name AS created_by_name
    FROM work_records w
    JOIN customers c ON w.customer_id = c.id
    LEFT JOIN users s ON w.assigned_to = s.id
    LEFT JOIN users cr ON w.created_by = cr.id
    WHERE w.created_at >= ? AND w.created_at <= ?
  `;
  const params = [start, end];

  if (type) {
    sql += ' AND w.type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND w.status = ?';
    params.push(status);
  }
  if (assignedTo) {
    sql += ' AND w.assigned_to = ?';
    params.push(assignedTo);
  }
  if (staffOnly) {
    sql += ' AND w.assigned_to = ?';
    params.push(staffOnly);
  }

  sql += ' ORDER BY w.created_at DESC';

  return { sql, params, label, start, end };
}

function summarizeRows(rows) {
  const summary = {
    total: rows.length,
    inward: rows.filter(r => r.type === 'inward').length,
    outward: rows.filter(r => r.type === 'outward').length,
    pending: rows.filter(r => r.status === 'pending').length,
    completed: rows.filter(r => r.status === 'completed').length,
    byStaff: {},
  };

  for (const row of rows) {
    const name = row.staff_name || 'Unassigned';
    if (!summary.byStaff[name]) {
      summary.byStaff[name] = { total: 0, pending: 0, completed: 0 };
    }
    summary.byStaff[name].total++;
    summary.byStaff[name][row.status]++;
  }

  return summary;
}

module.exports = { getDateRange, buildWorkQuery, summarizeRows };
