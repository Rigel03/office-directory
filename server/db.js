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

  // Seed Employees
  const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  if (employeeCount === 0) {
    const insertEmp = db.prepare(`
      INSERT INTO employees (
        full_name, position, unit_id, unit, unit_code, floor, room, location,
        email, phone, status, needs_review, is_archived, last_verified_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    // Lookup unit helper
    const getUnitInfo = (code) => {
      if (!code) return { id: null, name: '', short_code: '' };
      const row = db.prepare('SELECT id, name, short_code FROM units WHERE short_code = ?').get(code);
      return row || { id: null, name: '', short_code: '' };
    };

    const rawEmployees = [
      {
        name: 'SANTOS, Maria C.',
        position: 'Senior Transport Planning Officer',
        unitCode: 'TPMD',
        floor: '4th Floor',
        room: 'TPMD Urban Transport Bay',
        email: 'm.santos@office.gov',
        phone: 'Ext. 401',
        status: 'active',
        verified: '2026-09-15',
        notes: 'Lead focal for public transport route rationalization'
      },
      {
        name: 'DELA CRUZ, Juan P.',
        position: 'Administrative Assistant',
        unitCode: 'ASD',
        floor: '2nd Floor',
        room: 'ASD Administrative Suite',
        email: 'j.delacruz@office.gov',
        phone: 'Ext. 102',
        status: 'active',
        verified: '2026-08-20',
        notes: 'Division document tracking and communications officer'
      },
      {
        name: 'REYES, Antonio B.',
        position: 'Traffic Systems Analyst',
        unitCode: 'TEID',
        floor: '3rd Floor',
        room: 'Command & Traffic Control Center 301',
        email: 'a.reyes@office.gov',
        phone: 'Ext. 550',
        status: 'active',
        verified: '2026-09-30',
        notes: 'Traffic signals optimization & CCTV telemetry lead'
      },
      {
        name: 'GARCIA, Elena M.',
        position: 'Franchising Regulatory Officer II',
        unitCode: 'MVFRD',
        floor: 'Ground Floor',
        room: 'MVFRD Licensing Bay 1',
        email: 'e.garcia@office.gov',
        phone: 'Ext. 204',
        status: 'active',
        verified: '2026-07-10',
        notes: 'Tricycle franchise renewals evaluator'
      },
      {
        // Missing position -> needs_review = 1
        name: 'BAUTISTA, Carlos R.',
        position: '',
        unitCode: 'ASD',
        floor: '2nd Floor',
        room: 'Finance & Budget Office 204',
        email: 'c.bautista@office.gov',
        phone: 'Ext. 310',
        status: 'active',
        verified: null,
        notes: 'Transferred from Treasury; position title awaiting civil service confirmation'
      },
      {
        // Missing unit -> needs_review = 1
        name: 'AQUINO, Patricia D.',
        position: 'Project Evaluation Officer',
        unitCode: '',
        floor: '4th Floor',
        room: 'Executive Conference Hall A',
        email: 'p.aquino@office.gov',
        phone: 'Ext. 415',
        status: 'active',
        verified: null,
        notes: 'Division reassignment pending executive order'
      },
      {
        name: 'MENDOZA, Roberto S.',
        position: 'Division Chief / Officer-in-Charge',
        unitCode: 'ASD',
        floor: '2nd Floor',
        room: 'ASD Administrative Suite',
        email: 'r.mendoza@office.gov',
        phone: 'Ext. 100',
        status: 'active',
        verified: '2026-10-01',
        notes: 'Administrative and Support Division Chief'
      },
      {
        // Status on leave
        name: 'OCAMPO, Teresa V.',
        position: 'Senior Accountant',
        unitCode: 'ASD',
        floor: '2nd Floor',
        room: 'Finance & Budget Office 204',
        email: 't.ocampo@office.gov',
        phone: 'Ext. 312',
        status: 'on leave',
        verified: '2026-06-18',
        notes: 'Maternity leave through Nov 2026'
      },
      {
        // Location mismatch for soft warning demo: TEID default floor is 3rd Floor, but stationed at 4th Floor!
        name: 'VILLANUEVA, Gabriel L.',
        position: 'Traffic Signal Specialist',
        unitCode: 'TEID',
        floor: '4th Floor',
        room: 'TPMD Urban Transport Bay',
        email: 'g.villanueva@office.gov',
        phone: 'Ext. 552',
        status: 'active',
        verified: '2026-09-12',
        notes: 'Cross-assigned to 4th floor inter-agency task team'
      },
      {
        // Missing both position and unit -> needs_review = 1
        name: 'RAMOS, Sofia N.',
        position: '',
        unitCode: '',
        floor: 'Ground Floor',
        room: 'Front Reception Desk',
        email: 's.ramos@office.gov',
        phone: 'Ext. 210',
        status: 'active',
        verified: null,
        notes: 'Newly onboarded personnel, details incomplete'
      },
      {
        // Status detached
        name: 'CRUZ, Dennis F.',
        position: 'Traffic Enforcement Supervisor',
        unitCode: 'TESMD',
        floor: 'Ground Floor',
        room: 'TESMD Dispatch Station',
        email: 'd.cruz@office.gov',
        phone: 'Ext. 120',
        status: 'detached',
        verified: '2026-05-04',
        notes: 'Detached to regional inter-agency traffic task group'
      },
      {
        name: 'FERNANDEZ, Clara T.',
        position: 'Human Resource Management Officer I',
        unitCode: 'ASD',
        floor: '2nd Floor',
        room: 'ASD Human Resource Bay',
        email: 'c.fernandez@office.gov',
        phone: 'Ext. 105',
        status: 'active',
        verified: '2026-09-22',
        notes: 'Personnel records, training coordinator'
      }
    ];


    for (const emp of rawEmployees) {
      const u = getUnitInfo(emp.unitCode);
      const loc = formatLocation(emp.floor, emp.room);
      const needsRev = (!emp.position || !u.name) ? 1 : 0;
      insertEmp.run(
        emp.name,
        emp.position,
        u.id,
        u.name,
        u.short_code,
        emp.floor,
        emp.room,
        loc,
        emp.email,
        emp.phone,
        emp.status,
        needsRev,
        emp.verified,
        emp.notes
      );
    }

    // Groups
    const insertGroup = db.prepare('INSERT INTO groups (name, type, description) VALUES (?, ?, ?)');
    const g1 = insertGroup.run('Batch 2026 Q1 Induction', 'training batch', 'New hires and mandatory civil service orientation').lastInsertRowid;
    const g2 = insertGroup.run('Digital Transformation Committee', 'committee', 'Oversees paperless directory migration and digital workflows').lastInsertRowid;
    const g3 = insertGroup.run('Emergency Response Team', 'team', 'Floor marshals and first-aid response team').lastInsertRowid;
    const g4 = insertGroup.run('Quarterly ISO Audit Taskforce', 'other', 'Internal audit team for Q3/Q4 ISO review').lastInsertRowid;

    // Member links
    const insertMember = db.prepare('INSERT INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
    insertMember.run(1, g2); // Maria Santos in IT committee
    insertMember.run(1, g4); // Maria Santos in ISO taskforce (multi-group)
    insertMember.run(2, g1); // Juan Dela Cruz in Batch
    insertMember.run(3, g2); // Antonio Reyes in IT committee
    insertMember.run(9, g2); // Gabriel Villanueva in IT committee
    insertMember.run(9, g3); // Gabriel in Emergency Team (multi-group)
    insertMember.run(12, g1); // Clara Fernandez in Induction

    // Training records
    const insertTrain = db.prepare(`
      INSERT INTO training_records (employee_id, title, date, hours, provider, quarter)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertTrain.run(1, 'ISO 9001:2015 Lead Auditor Course', '2026-01-15', 16, 'Quality Excellence Institute', 'Q1 2026');
    insertTrain.run(1, 'Public Service Ethics and Accountability', '2026-04-10', 8, 'Civil Service Academy', 'Q2 2026');
    insertTrain.run(2, 'Records Management System Training', '2026-02-20', 8, 'National Archives', 'Q1 2026');
    insertTrain.run(3, 'Cybersecurity Incident Response Workshop', '2026-03-05', 24, 'Cyber Defense Center', 'Q1 2026');
    insertTrain.run(3, 'Advanced Linux System Administration', '2026-07-12', 40, 'OpenTech Academy', 'Q3 2026');
    insertTrain.run(4, 'Digital Archiving and Preservation', '2026-02-18', 12, 'National Archives', 'Q1 2026');
    insertTrain.run(7, 'Executive Leadership and Strategic Planning', '2026-05-18', 16, 'Graduate School of Governance', 'Q2 2026');
    insertTrain.run(9, 'Network Security Essentials', '2026-03-05', 24, 'Cyber Defense Center', 'Q1 2026');
    insertTrain.run(12, 'Competency-Based Interviewing Techniques', '2026-08-14', 16, 'Civil Service Academy', 'Q3 2026');
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
