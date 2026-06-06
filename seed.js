const bcrypt = require('bcryptjs');
const db = require('./db');

function seedAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existing) return;

  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (username, password_hash, role, full_name, active)
    VALUES (?, ?, 'admin', 'Administrator', 1)
  `).run('admin', hash);

  console.log('Default admin created: username=admin');
}

module.exports = { seedAdmin };
