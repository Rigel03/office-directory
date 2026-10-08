const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'directory.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for reliability
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

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

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      position TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      location TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'on leave', 'detached')),
      needs_review INTEGER NOT NULL DEFAULT 0,
      last_verified_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    
    // admin / admin123 and viewer / viewer123
    const adminHash = bcrypt.hashSync('admin123', 10);
    const viewerHash = bcrypt.hashSync('viewer123', 10);
    
    insertUser.run('admin', adminHash, 'admin', 'Alex Rivera (Admin)');
    insertUser.run('viewer', viewerHash, 'viewer', 'Jordan Lee (Viewer)');
  }

  const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  if (employeeCount === 0) {
    const insertEmp = db.prepare(`
      INSERT INTO employees (full_name, position, unit, email, phone, location, status, needs_review, last_verified_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Notice some have empty position/unit to showcase needs_review auto-flag!
    const sampleEmployees = [
      ['SANTOS, Maria C.', 'Senior Operations Officer', 'Operations Division', 'm.santos@office.gov', 'Ext. 401', '3rd Floor - Desk 312', 'active', 0, '2026-09-15', 'Lead contact for ISO audits'],
      ['DELA CRUZ, Juan P.', 'Administrative Assistant', 'Human Resources', 'j.delacruz@office.gov', 'Ext. 102', '2nd Floor - HR Bay 4', 'active', 0, '2026-08-20', 'Onboarding coordinator'],
      ['REYES, Antonio B.', 'Information Systems Analyst', 'IT Services', 'a.reyes@office.gov', 'Ext. 550', 'Server Room Annex B', 'active', 0, '2026-09-30', 'Network lead'],
      ['GARCIA, Elena M.', 'Records Officer II', 'Records & Archives', 'e.garcia@office.gov', 'Ext. 204', 'Ground Floor - Archive Room', 'active', 0, '2026-07-10', ''],
      ['BAUTISTA, Carlos R.', '', 'Finance & Budget', 'c.bautista@office.gov', 'Ext. 310', '3rd Floor - Finance Rm 302', 'active', 1, null, 'Transferred from Treasury; position pending confirmation'],
      ['AQUINO, Patricia D.', 'Project Evaluation Officer', '', 'p.aquino@office.gov', 'Ext. 415', '4th Floor - Room 408', 'active', 1, null, 'Unit realignment pending management memo'],
      ['MENDOZA, Roberto S.', 'Executive Director', 'Office of the Director', 'r.mendoza@office.gov', 'Ext. 100', '5th Floor - Suite 501', 'active', 0, '2026-10-01', 'Director'],
      ['OCAMPO, Teresa V.', 'Senior Accountant', 'Finance & Budget', 't.ocampo@office.gov', 'Ext. 312', '3rd Floor - Finance Rm 301', 'on leave', 0, '2026-06-18', 'Maternity leave until Nov 2026'],
      ['VILLANUEVA, Gabriel L.', 'IT Support Specialist', 'IT Services', 'g.villanueva@office.gov', 'Ext. 552', '2nd Floor - Helpdesk Desk 1', 'active', 0, '2026-09-12', 'Helpdesk shift lead'],
      ['RAMOS, Sofia N.', '', '', 's.ramos@office.gov', 'Ext. 210', '1st Floor - Front Desk', 'active', 1, null, 'Newly appointed contractual staff, details incomplete'],
      ['CRUZ, Dennis F.', 'Logistics Coordinator', 'General Services', 'd.cruz@office.gov', 'Ext. 120', 'Basement - Supply Warehouse', 'detached', 0, '2026-05-04', 'Detached to regional task force'],
      ['FERNANDEZ, Clara T.', 'Human Resource Officer I', 'Human Resources', 'c.fernandez@office.gov', 'Ext. 105', '2nd Floor - HR Bay 2', 'active', 0, '2026-09-22', 'Training and development in-charge']
    ];

    for (const emp of sampleEmployees) {
      insertEmp.run(...emp);
    }

    // Groups
    const insertGroup = db.prepare('INSERT INTO groups (name, type, description) VALUES (?, ?, ?)');
    const g1 = insertGroup.run('Batch 2026 Q1 Induction', 'training batch', 'New hires and mandatory civil service orientation').lastInsertRowid;
    const g2 = insertGroup.run('Digital Transformation Committee', 'committee', 'Oversees migration to paperless directory and workflows').lastInsertRowid;
    const g3 = insertGroup.run('Emergency Response Team', 'team', 'Floor marshals and first-aid response team').lastInsertRowid;
    const g4 = insertGroup.run('Quarterly ISO Audit Taskforce', 'other', 'Internal audit team for Q3/Q4 ISO review').lastInsertRowid;

    // Member links
    const insertMember = db.prepare('INSERT INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
    insertMember.run(1, g2); // Maria Santos in IT committee
    insertMember.run(1, g4); // Maria Santos in ISO taskforce
    insertMember.run(2, g1); // Juan Dela Cruz in Batch
    insertMember.run(3, g2); // Antonio Reyes in IT committee
    insertMember.run(9, g2); // Gabriel Villanueva in IT committee
    insertMember.run(9, g3); // Gabriel in Emergency Team
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
  calculateQuarter,
  logAudit
};
