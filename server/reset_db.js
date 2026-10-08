const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'directory.db');
const dbWalPath = path.join(__dirname, 'directory.db-wal');
const dbShmPath = path.join(__dirname, 'directory.db-shm');

try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(dbWalPath)) fs.unlinkSync(dbWalPath);
  if (fs.existsSync(dbShmPath)) fs.unlinkSync(dbShmPath);
  console.log('Old database removed.');
} catch (e) {
  console.error('Failed to unlink db:', e.message);
}

// Re-import db to re-run schema and seed
require('./db');
console.log('Database pristine re-initialization complete.');
