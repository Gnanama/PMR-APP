const fs = require('fs');
const path = require('path');

const required = [
  'index.js',
  'package.json',
  'server/app.js',
  'server/index.js',
  'server/db.js',
  'server/routes/auth.js',
  'public/login.html',
];

const missing = required.filter((file) => !fs.existsSync(path.join(__dirname, '..', file)));

if (missing.length) {
  console.error('CRM deploy check FAILED. Missing files:');
  missing.forEach((file) => console.error(`  - ${file}`));
  console.error('Push all project folders to GitHub before deploying.');
  process.exit(1);
}

console.log('CRM deploy check OK');
