const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

const workSelect = `
  SELECT w.*,
    c.name AS customer_name,
    c.phone AS customer_phone,
    s.full_name AS staff_name,
    cr.full_name AS created_by_name
  FROM work_records w
  JOIN customers c ON w.customer_id = c.id
  LEFT JOIN users s ON w.assigned_to = s.id
  LEFT JOIN users cr ON w.created_by = cr.id
`;

router.use(authRequired);

router.get('/', adminRequired, (req, res) => {
  let sql = workSelect + ' WHERE 1=1';
  const params = [];

  if (req.query.type) {
    sql += ' AND w.type = ?';
    params.push(req.query.type);
  }
  if (req.query.status) {
    sql += ' AND w.status = ?';
    params.push(req.query.status);
  }
  if (req.query.assigned_to) {
    sql += ' AND w.assigned_to = ?';
    params.push(parseInt(req.query.assigned_to, 10));
  }

  sql += ' ORDER BY w.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get('/mine', (req, res) => {
  const rows = db.prepare(workSelect + ' WHERE w.assigned_to = ? ORDER BY w.created_at DESC').all(req.user.id);
  res.json(rows);
});

router.get('/stats', (req, res) => {
  if (req.user.role === 'admin') {
    const stats = {
      total: db.prepare('SELECT COUNT(*) AS c FROM work_records').get().c,
      pending: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE status = 'pending'").get().c,
      completed: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE status = 'completed'").get().c,
      inward: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE type = 'inward'").get().c,
      outward: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE type = 'outward'").get().c,
      customers: db.prepare('SELECT COUNT(*) AS c FROM customers').get().c,
      staff: db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'staff' AND active = 1").get().c,
    };
    return res.json(stats);
  }

  const stats = {
    total: db.prepare('SELECT COUNT(*) AS c FROM work_records WHERE assigned_to = ?').get(req.user.id).c,
    pending: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE assigned_to = ? AND status = 'pending'").get(req.user.id).c,
    completed: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE assigned_to = ? AND status = 'completed'").get(req.user.id).c,
    inward: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE assigned_to = ? AND type = 'inward'").get(req.user.id).c,
    outward: db.prepare("SELECT COUNT(*) AS c FROM work_records WHERE assigned_to = ? AND type = 'outward'").get(req.user.id).c,
  };
  res.json(stats);
});

router.post('/', adminRequired, (req, res) => {
  const { customer_id, type, title, description, assigned_to, due_date, status } = req.body;

  if (!customer_id || !type || !title) {
    return res.status(400).json({ error: 'Customer, type, and title required' });
  }
  if (!['inward', 'outward'].includes(type)) {
    return res.status(400).json({ error: 'Type must be inward or outward' });
  }

  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  if (assigned_to) {
    const staff = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'staff' AND active = 1").get(assigned_to);
    if (!staff) {
      return res.status(400).json({ error: 'Invalid staff assignment' });
    }
  }

  const workStatus = status === 'completed' ? 'completed' : 'pending';
  const completedAt = workStatus === 'completed' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null;

  const result = db.prepare(`
    INSERT INTO work_records (customer_id, type, title, description, assigned_to, status, due_date, completed_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    customer_id,
    type,
    title.trim(),
    description || null,
    assigned_to || null,
    workStatus,
    due_date || null,
    completedAt,
    req.user.id
  );

  const row = db.prepare(workSelect + ' WHERE w.id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', adminRequired, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM work_records WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Work record not found' });
  }

  const { title, description, assigned_to, due_date, status, completion_notes } = req.body;

  if (assigned_to !== undefined && assigned_to !== null) {
    const staff = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'staff' AND active = 1").get(assigned_to);
    if (!staff) {
      return res.status(400).json({ error: 'Invalid staff assignment' });
    }
  }

  let completedAt = existing.completed_at;
  let newStatus = status !== undefined ? status : existing.status;
  if (newStatus === 'completed' && existing.status !== 'completed') {
    completedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  } else if (newStatus === 'pending') {
    completedAt = null;
  }

  db.prepare(`
    UPDATE work_records SET
      title = ?, description = ?, assigned_to = ?, due_date = ?,
      status = ?, completion_notes = ?, completed_at = ?
    WHERE id = ?
  `).run(
    title !== undefined ? title.trim() : existing.title,
    description !== undefined ? description : existing.description,
    assigned_to !== undefined ? assigned_to : existing.assigned_to,
    due_date !== undefined ? due_date : existing.due_date,
    newStatus,
    completion_notes !== undefined ? completion_notes : existing.completion_notes,
    completedAt,
    id
  );

  const row = db.prepare(workSelect + ' WHERE w.id = ?').get(id);
  res.json(row);
});

router.patch('/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM work_records WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Work record not found' });
  }

  if (req.user.role === 'staff' && existing.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Not assigned to you' });
  }

  const { status, completion_notes } = req.body;
  if (!['pending', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending or completed' });
  }

  const completedAt = status === 'completed'
    ? new Date().toISOString().replace('T', ' ').slice(0, 19)
    : null;

  db.prepare(`
    UPDATE work_records SET status = ?, completion_notes = ?, completed_at = ?
    WHERE id = ?
  `).run(status, completion_notes || null, completedAt, id);

  const row = db.prepare(workSelect + ' WHERE w.id = ?').get(id);
  res.json(row);
});

module.exports = router;
