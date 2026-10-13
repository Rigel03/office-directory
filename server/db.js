const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'directory.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for reliability
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function formatLocation(floor, room) {
  const f = (floor || '').trim();
  const r = (room || '').trim();
  if (f && r) return `${f} · ${r}`;
  return f || r || '';
}

function parseLocation(locStr) {
  if (!locStr) return { floor: '', room: '' };
  const s = String(locStr).trim();
  // Match standard delimiter " · " or " - " or " / "
  const parts = s.split(/\s+[·\-\/]\s+/);
  if (parts.length >= 2) {
    let floor = parts[0].trim();
    let room = parts.slice(1).join(' - ').trim();
    return { floor, room };
  }
  // Check if starts with a floor pattern
  const floorMatch = s.match(/^(Ground Floor|Basement|[1-9](?:st|nd|rd|th)?\s*Floor)/i);
  if (floorMatch) {
    const floor = floorMatch[0].trim();
    const room = s.replace(floorMatch[0], '').replace(/^[\s,\-·\/]+/, '').trim();
    return { floor, room };
  }
  return { floor: '', room: s };
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      default_floor TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      floor TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      position TEXT DEFAULT '',
      unit_id INTEGER,
      unit TEXT DEFAULT '',
      unit_code TEXT DEFAULT '',
      floor TEXT DEFAULT '',
      room TEXT DEFAULT '',
      location TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'on leave', 'detached')),
      needs_review INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      last_verified_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('training batch', 'team', 'committee', 'other')),
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employee_groups (
      employee_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (employee_id, group_id),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS training_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      provider TEXT DEFAULT '',
      quarter TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      action TEXT NOT NULL,
      changes TEXT DEFAULT '[]',
      user_id INTEGER,
      user_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure structured columns exist
  const safeCols = [
    `ALTER TABLE employees ADD COLUMN title TEXT DEFAULT ''`,
    `ALTER TABLE employees ADD COLUMN section TEXT DEFAULT ''`,
    `ALTER TABLE employees ADD COLUMN sub_unit TEXT DEFAULT ''`,
    `ALTER TABLE employees ADD COLUMN role TEXT DEFAULT 'Staff'`,
    `ALTER TABLE employees ADD COLUMN also_assigned_to TEXT DEFAULT ''`,
    `ALTER TABLE employees ADD COLUMN review_notes TEXT DEFAULT ''`
  ];
  for (const q of safeCols) {
    try { db.exec(q); } catch (e) {}
  }
}

function calculateQuarter(dateStr) {
  if (!dateStr) return 'Q1 ' + new Date().getFullYear();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Q1 ' + new Date().getFullYear();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const q = Math.ceil(month / 3);
  return `Q${q} ${year}`;
}

function logAudit(employeeId, action, changes, user) {
  try {
    const insert = db.prepare(`
      INSERT INTO audit_logs (employee_id, action, changes, user_id, user_name, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    insert.run(
      employeeId,
      action,
      JSON.stringify(changes || []),
      user?.id || null,
      user?.name || user?.username || 'System'
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, name)
      VALUES (?, ?, ?, ?)
    `);
    const adminHash = bcrypt.hashSync('admin123', 10);
    const viewerHash = bcrypt.hashSync('viewer123', 10);
    insertUser.run('admin', adminHash, 'admin', 'Alex Rivera (Admin)');
    insertUser.run('viewer', viewerHash, 'viewer', 'Jordan Lee (Viewer)');
  }

  // Seed Units (Official Divisions)
  const unitCount = db.prepare('SELECT COUNT(*) as count FROM units').get().count;
  if (unitCount === 0) {
    const insertUnit = db.prepare(`
      INSERT INTO units (name, short_code, default_floor, description)
      VALUES (?, ?, ?, ?)
    `);
    const units = [
      ['Administrative and Support Division', 'ASD', '2nd Floor', 'Personnel, financial administration, budget, records, and general support'],
      ['Motorized Vehicle and Franchising Regulatory Division', 'MVFRD', 'Ground Floor', 'Franchising regulatory services, motorized tricycle and public conveyance regulation'],
      ['Facilities Management and Operations Division', 'FMOD', 'Basement', 'Logistics, physical facilities, traffic equipment maintenance, and field operations'],
      ['Traffic Engineering and Infrastructure Division', 'TEID', '3rd Floor', 'Traffic signal systems, road infrastructure design, geometric improvements, and electronics'],
      ['Traffic Enforcement and Street Management Division', 'TESMD', 'Ground Floor', 'Field traffic law enforcement, street parking regulation, and road clearing operations'],
      ['Transport Planning and Management Division', 'TPMD', '4th Floor', 'Comprehensive transport planning, traffic studies, data analytics, and route management']
    ];
    for (const u of units) {
      insertUnit.run(...u);
    }
  }

  // Seed Rooms
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomCount === 0) {
    const insertRoom = db.prepare('INSERT INTO rooms (name, floor) VALUES (?, ?)');
    const sampleRooms = [
      ['MVFRD Licensing Bay 1', 'Ground Floor'],
      ['TESMD Dispatch Station', 'Ground Floor'],
      ['Front Reception Desk', 'Ground Floor'],
      ['Public Assistance Counter', 'Ground Floor'],
      ['ASD Administrative Suite', '2nd Floor'],
      ['ASD Human Resource Bay', '2nd Floor'],
      ['ASD Records & Archives Vault', '2nd Floor'],
      ['Finance & Budget Office 204', '2nd Floor'],
      ['TEID Traffic Signals Lab', '3rd Floor'],
      ['TEID Geometric Design Room', '3rd Floor'],
      ['Command & Traffic Control Center 301', '3rd Floor'],
      ['TPMD Urban Transport Bay', '4th Floor'],
      ['TPMD Survey & Data Analytics Rm', '4th Floor'],
      ['Executive Conference Hall A', '4th Floor'],
      ['Director & Division Chiefs Suite', '5th Floor'],
      ['Executive Board Room 502', '5th Floor'],
      ['FMOD Logistics Workshop', 'Basement'],
      ['FMOD Supply Warehouse', 'Basement'],
      ['Traffic Equipment Depo', 'Basement']
    ];
    for (const r of sampleRooms) {
      insertRoom.run(...r);
    }
  }

  // Seed Employees using official TPMD roster
  const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  if (employeeCount === 0) {
    const { seedTpmdData } = require('./seedTpmd');
    seedTpmdData();
  }
}

initSchema();
seedData();

module.exports = {
  db,
  formatLocation,
  parseLocation,
  calculateQuarter,
  logAudit
};
