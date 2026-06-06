const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, adminRequired);

router.get('/', (_req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, full_name, active, created_at
    FROM users WHERE role = 'staff'
    ORDER BY created_at DESC
  `).all();
  res.json(users);
});

router.post('/', (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, active)
    VALUES (?, ?, 'staff', ?, 1)
  `).run(username.trim(), hash, full_name.trim());

  const user = db.prepare(`
    SELECT id, username, role, full_name, active, created_at FROM users WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(user);
});

router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'staff'").get(id);
  if (!user) {
    return res.status(404).json({ error: 'Staff user not found' });
  }

  const { full_name, password, active } = req.body;
  const updates = [];
  const values = [];

  if (full_name !== undefined) {
    updates.push('full_name = ?');
    values.push(full_name.trim());
  }
  if (password) {
    updates.push('password_hash = ?');
    values.push(bcrypt.hashSync(password, 10));
  }
  if (active !== undefined) {
    updates.push('active = ?');
    values.push(active ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`
    SELECT id, username, role, full_name, active, created_at FROM users WHERE id = ?
  `).get(id);

  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'staff'").get(id);
  if (!user) {
    return res.status(404).json({ error: 'Staff user not found' });
  }

  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
