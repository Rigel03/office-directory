const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'directory.db');
const backupPath = path.join(__dirname, 'directory.backup_before_org.db');

// Step 0: Ensure physical file backup
fs.copyFileSync(dbPath, backupPath);
console.log(`[Migration] Created physical database backup at: ${backupPath}`);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function runMigration() {
  console.log('[Migration] Starting organization and assignments migration...');

  // Create reversible backup tables inside SQLite
  db.exec(`
    CREATE TABLE IF NOT EXISTS _backup_groups AS SELECT * FROM groups;
    CREATE TABLE IF NOT EXISTS _backup_employee_groups AS SELECT * FROM employee_groups;
    CREATE TABLE IF NOT EXISTS _backup_employees AS SELECT * FROM employees;
    CREATE TABLE IF NOT EXISTS _backup_units AS SELECT * FROM units;
  `);
  console.log('[Migration] Created backup tables (_backup_groups, _backup_employee_groups, _backup_employees, _backup_units)');

  // 1. Create org_units table
  db.exec(`
    CREATE TABLE IF NOT EXISTS org_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('division', 'section', 'unit')),
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      default_floor TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES org_units(id) ON DELETE RESTRICT
    );
  `);

  // 2. Create assignments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      org_unit_id INTEGER NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 1 CHECK(is_primary IN (0, 1)),
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('head', 'staff')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (org_unit_id) REFERENCES org_units(id) ON DELETE RESTRICT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_unique
      ON assignments(employee_id, org_unit_id);
  `);

  // 3. Migrate or update groups table with scope and scope_division_id
  const groupCols = db.prepare("PRAGMA table_info(groups)").all().map(c => c.name);
  if (!groupCols.includes('scope')) {
    db.exec(`ALTER TABLE groups ADD COLUMN scope TEXT DEFAULT 'office-wide' CHECK(scope IN ('office-wide', 'division'))`);
  }
  if (!groupCols.includes('scope_division_id')) {
    db.exec(`ALTER TABLE groups ADD COLUMN scope_division_id INTEGER REFERENCES org_units(id) ON DELETE SET NULL`);
  }
  if (!groupCols.includes('active')) {
    db.exec(`ALTER TABLE groups ADD COLUMN active INTEGER DEFAULT 1`);
  }

  // 4. Populate org_units with official divisions from `units` table
  const existingUnits = db.prepare('SELECT * FROM units ORDER BY id ASC').all();
  const insertOrgUnit = db.prepare(`
    INSERT INTO org_units (id, name, short_code, type, parent_id, sort_order, active, default_floor, description)
    VALUES (?, ?, ?, 'division', NULL, ?, 1, ?, ?)
  `);

  for (const [idx, u] of existingUnits.entries()) {
    const exists = db.prepare("SELECT id FROM org_units WHERE type = 'division' AND (short_code = ? OR name = ?)").get(u.short_code, u.name);
    if (!exists) {
      insertOrgUnit.run(u.id, u.name, u.short_code, idx + 1, u.default_floor || '', u.description || '');
    }
  }

  const tpmd = db.prepare("SELECT id FROM org_units WHERE short_code = 'TPMD'").get();
  if (!tpmd) {
    throw new Error('TPMD division not found in org_units');
  }
  const tpmdId = tpmd.id;

  // 5. Create Sections and Units under TPMD
  // Structure:
  // TPMD (division)
  //   ├─ Office of the Division Head (section)
  //   ├─ Transport Planning (section)
  //   │    ├─ Development Plans Unit (unit)
  //   │    └─ Research and Stats Unit (unit)
  //   ├─ Transport Management (section)
  //   │    ├─ Transport Services Unit (unit)
  //   │    └─ Transport Systems Unit (unit)
  //   └─ Administrative Services (section)

  function ensureChildOrgUnit(name, shortCode, type, parentId, sortOrder, defaultFloor, desc) {
    let row = db.prepare("SELECT * FROM org_units WHERE name = ? AND parent_id = ?").get(name, parentId);
    if (!row) {
      const res = db.prepare(`
        INSERT INTO org_units (name, short_code, type, parent_id, sort_order, active, default_floor, description)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(name, shortCode, type, parentId, sortOrder, defaultFloor || '4th Floor', desc || '');
      row = db.prepare("SELECT * FROM org_units WHERE id = ?").get(res.lastInsertRowid);
    }
    return row;
  }

  const sDivisionHead = ensureChildOrgUnit('Office of the Division Head', 'ODH', 'section', tpmdId, 1, '4th Floor', 'Executive leadership and general direction');
  const sPlanning = ensureChildOrgUnit('Transport Planning', 'TP', 'section', tpmdId, 2, '4th Floor', 'Master planning and transport network analysis');
  const uDevPlans = ensureChildOrgUnit('Development Plans Unit', 'DPU', 'unit', sPlanning.id, 1, '4th Floor', 'Local transport plans and feasibility studies');
  const uResearchStats = ensureChildOrgUnit('Research and Stats Unit', 'RSU', 'unit', sPlanning.id, 2, '4th Floor', 'Surveys, passenger volume statistics, and GIS');

  const sManagement = ensureChildOrgUnit('Transport Management', 'TM', 'section', tpmdId, 3, '4th Floor', 'Operational transit management and oversight');
  const uServices = ensureChildOrgUnit('Transport Services Unit', 'TSU', 'unit', sManagement.id, 1, '4th Floor', 'Conveyance regulation and service quality');
  const uSystems = ensureChildOrgUnit('Transport Systems Unit', 'SYSU', 'unit', sManagement.id, 2, '4th Floor', 'Intelligent transport systems and telemetry');

  const sAdmin = ensureChildOrgUnit('Administrative Services', 'AS', 'section', tpmdId, 4, '4th Floor', 'Division personnel, records custody, and supply');

  console.log('[Migration] Seeded TPMD sections and units in org_units successfully.');

  // 6. Migrate Employees into assignments table
  // Clear any current assignments to prevent duplicates
  db.exec('DELETE FROM assignments;');

  const insertAssignment = db.prepare(`
    INSERT OR IGNORE INTO assignments (employee_id, org_unit_id, is_primary, role)
    VALUES (?, ?, ?, ?)
  `);

  const employees = db.prepare('SELECT * FROM employees').all();

  for (const emp of employees) {
    const roleVal = (emp.role === 'Division Head' || emp.role === 'Section Head') ? 'head' : 'staff';

    // Determine primary org_unit
    let primaryOrgUnitId = null;

    if (emp.sub_unit) {
      if (emp.sub_unit.toLowerCase().includes('development plans')) primaryOrgUnitId = uDevPlans.id;
      else if (emp.sub_unit.toLowerCase().includes('research and stats')) primaryOrgUnitId = uResearchStats.id;
      else if (emp.sub_unit.toLowerCase().includes('transport services')) primaryOrgUnitId = uServices.id;
      else if (emp.sub_unit.toLowerCase().includes('transport systems')) primaryOrgUnitId = uSystems.id;
    }

    if (!primaryOrgUnitId && emp.section) {
      if (emp.section.toLowerCase().includes('division head')) primaryOrgUnitId = sDivisionHead.id;
      else if (emp.section.toLowerCase().includes('transport planning')) primaryOrgUnitId = sPlanning.id;
      else if (emp.section.toLowerCase().includes('transport management')) primaryOrgUnitId = sManagement.id;
      else if (emp.section.toLowerCase().includes('administrative services')) primaryOrgUnitId = sAdmin.id;
    }

    if (!primaryOrgUnitId) {
      // Fallback to division
      primaryOrgUnitId = tpmdId;
    }

    insertAssignment.run(emp.id, primaryOrgUnitId, 1, roleVal);

    // If Division Head, also ensure assignment to division
    if (emp.role === 'Division Head' && primaryOrgUnitId !== tpmdId) {
      insertAssignment.run(emp.id, tpmdId, 0, 'head');
    }

    // Process secondary assignment in also_assigned_to
    if (emp.also_assigned_to) {
      let secondaryUnitId = null;
      if (emp.also_assigned_to.toLowerCase().includes('research and stats')) {
        secondaryUnitId = uResearchStats.id;
      } else if (emp.also_assigned_to.toLowerCase().includes('development plans')) {
        secondaryUnitId = uDevPlans.id;
      } else if (emp.also_assigned_to.toLowerCase().includes('transport services')) {
        secondaryUnitId = uServices.id;
      } else if (emp.also_assigned_to.toLowerCase().includes('transport systems')) {
        secondaryUnitId = uSystems.id;
      }

      if (secondaryUnitId && secondaryUnitId !== primaryOrgUnitId) {
        insertAssignment.run(emp.id, secondaryUnitId, 0, 'staff');
      }
    }
  }

  // 7. Clean up groups table:
  // Remove groups that were mistakenly created as sections or units!
  // Genuine groups to keep: 'Digital Transformation Committee', and create extra genuine sample groups
  const sectionOrUnitNames = [
    'Office of the Division Head',
    'Transport Planning Section',
    'Development Plans Unit',
    'Research and Stats Unit',
    'Transport Management Section',
    'Transport Services Unit',
    'Transport Systems Unit',
    'Administrative Services'
  ];

  // Remove member relations for converted section groups
  const groupsToConvert = db.prepare(`SELECT id, name FROM groups WHERE name IN (${sectionOrUnitNames.map(() => '?').join(',')})`).all(...sectionOrUnitNames);
  for (const g of groupsToConvert) {
    db.prepare('DELETE FROM employee_groups WHERE group_id = ?').run(g.id);
    db.prepare('DELETE FROM groups WHERE id = ?').run(g.id);
  }
  console.log(`[Migration] Cleaned up ${groupsToConvert.length} misplaced section/unit groups.`);

  // Update remaining groups with scope
  db.prepare("UPDATE groups SET scope = 'office-wide', active = 1 WHERE scope IS NULL").run();

  // Add sample realistic cross-cutting groups (Spec testing requirements)
  const insertG = db.prepare(`
    INSERT OR IGNORE INTO groups (name, type, description, scope, scope_division_id, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  insertG.run(
    'Q1 2026 Orientation Batch',
    'training batch',
    'Mandatory public service ethics and office workflow induction',
    'office-wide',
    null
  );

  insertG.run(
    'Emergency Traffic Operations Taskforce',
    'team',
    'Rapid response unit for severe transit disruptions, parades, and state events',
    'office-wide',
    null
  );

  insertG.run(
    'TPMD Technical Review Committee',
    'committee',
    'Division-level evaluation of transport impact assessments and traffic circulation studies',
    'division',
    tpmdId
  );

  // Link members to sample groups
  const gInduction = db.prepare("SELECT id FROM groups WHERE name = 'Q1 2026 Orientation Batch'").get();
  const gTaskforce = db.prepare("SELECT id FROM groups WHERE name = 'Emergency Traffic Operations Taskforce'").get();
  const gTpmdReview = db.prepare("SELECT id FROM groups WHERE name = 'TPMD Technical Review Committee'").get();

  const insertEG = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
  
  // Add sample members
  const sampleEmps = db.prepare('SELECT id, full_name FROM employees').all();
  for (const e of sampleEmps) {
    if (gTpmdReview) {
      if (['SANTOS, Gina R.', 'PEREZ IV, Eduardo B.', 'GUTIERREZ, Tyrone D.', 'SIMPOL, Sheena P.'].includes(e.full_name)) {
        insertEG.run(e.id, gTpmdReview.id);
      }
    }
    if (gInduction) {
      if (['DIOSANA, Ma. Viktoria Louissa L.', 'BEDREJO, Ivy G.', 'JUMAMOY, John Michael L.'].includes(e.full_name)) {
        insertEG.run(e.id, gInduction.id);
      }
    }
    if (gTaskforce) {
      if (['GREGORIO, Jay Arvin H.', 'FELISCUZO, Rusel M.', 'LUAYON, Jomarie E.'].includes(e.full_name)) {
        insertEG.run(e.id, gTaskforce.id);
      }
    }
  }

  // Audit the migration
  db.prepare(`
    INSERT INTO audit_logs (employee_id, action, changes, user_id, user_name, created_at)
    VALUES (NULL, 'MIGRATION_COMPLETED', ?, 1, 'System Migration', datetime('now'))
  `).run(JSON.stringify({
    message: 'Migrated sections and units to permanent org_units and assignments structure',
    divisions: db.prepare("SELECT COUNT(*) as count FROM org_units WHERE type = 'division'").get().count,
    sections: db.prepare("SELECT COUNT(*) as count FROM org_units WHERE type = 'section'").get().count,
    units: db.prepare("SELECT COUNT(*) as count FROM org_units WHERE type = 'unit'").get().count,
    assignments: db.prepare("SELECT COUNT(*) as count FROM assignments").get().count,
    groups: db.prepare("SELECT COUNT(*) as count FROM groups").get().count
  }));

  console.log('[Migration] Migration complete!');
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
