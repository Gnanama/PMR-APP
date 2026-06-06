const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

router.get('/', (req, res) => {
  if (req.user.role === 'admin') {
    const customers = db.prepare(`
      SELECT c.*, u.full_name AS created_by_name
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `).all();
    return res.json(customers);
  }

  const customers = db.prepare(`
    SELECT DISTINCT c.*, u.full_name AS created_by_name
    FROM customers c
    JOIN work_records w ON w.customer_id = c.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE w.assigned_to = ?
    ORDER BY c.name
  `).all(req.user.id);

  res.json(customers);
});

router.post('/', adminRequired, (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Customer name required' });
  }

  const result = db.prepare(`
    INSERT INTO customers (name, phone, email, address, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), phone || null, email || null, address || null, notes || null, req.user.id);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(customer);
});

router.patch('/:id', adminRequired, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const { name, phone, email, address, notes } = req.body;
  db.prepare(`
    UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : existing.name,
    phone !== undefined ? phone : existing.phone,
    email !== undefined ? email : existing.email,
    address !== undefined ? address : existing.address,
    notes !== undefined ? notes : existing.notes,
    id
  );

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json(customer);
});

module.exports = router;
