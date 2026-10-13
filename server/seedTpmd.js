const { db, formatLocation } = require('./db');

function seedTpmdData() {
  console.log('--- Migrating and Seeding TPMD Directory ---');

  // 1. Ensure new columns exist
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

  // 2. Ensure TPMD Unit exists
  let tpmdUnit = db.prepare("SELECT * FROM units WHERE short_code = 'TPMD'").get();
  if (!tpmdUnit) {
    db.prepare(`
      INSERT INTO units (name, short_code, default_floor, description)
      VALUES (?, ?, ?, ?)
    `).run(
      'Transport Planning and Management Division',
      'TPMD',
      '4th Floor',
      'Comprehensive transport planning, traffic studies, data analytics, and route management'
    );
    tpmdUnit = db.prepare("SELECT * FROM units WHERE short_code = 'TPMD'").get();
  }

  // 3. Ensure 4th Floor Rooms exist
  const tpmdRooms = [
    ['Office of the Division Head (Room 401)', '4th Floor'],
    ['Transport Planning Bay (Room 402)', '4th Floor'],
    ['Transport Management Bay (Room 403)', '4th Floor'],
    ['Administrative Services Bay (Room 404)', '4th Floor'],
    ['Development Plans Unit Desk', '4th Floor'],
    ['Research & Stats Unit Desk', '4th Floor'],
    ['TPMD Urban Transport Bay', '4th Floor'],
    ['TPMD Survey & Data Analytics Rm', '4th Floor']
  ];
  const insertRoom = db.prepare('INSERT OR IGNORE INTO rooms (name, floor) VALUES (?, ?)');
  for (const [rName, rFloor] of tpmdRooms) {
    insertRoom.run(rName, rFloor);
  }

  // 4. Clear old employees, their group relations, and old training records
  db.exec(`
    DELETE FROM employee_groups;
    DELETE FROM training_records;
    DELETE FROM audit_logs;
    DELETE FROM employees;
  `);

  // 5. Official TPMD Personnel Roster from User Directory
  const tpmdRoster = [
    {
      full_name: 'SANTOS, Gina R.',
      title: 'Engr.',
      position: 'Planning Officer IV',
      section: 'Office of the Division Head',
      sub_unit: '',
      role: 'Division Head',
      also_assigned_to: '',
      email: 'gina.santos@davaocity.gov.ph',
      phone: '0923 809 7383',
      floor: '4th Floor',
      room: 'Office of the Division Head (Room 401)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Division Head - Transport Planning and Management Division'
    },
    {
      full_name: 'PEREZ IV, Eduardo B.',
      title: 'Atty.',
      position: 'Planning Officer II/Acting Assistant Division Head',
      section: 'Transport Planning',
      sub_unit: '',
      role: 'Section Head',
      also_assigned_to: '',
      email: 'eduardo4.perez@davaocity.gov.ph',
      phone: '0998 980 4251',
      floor: '4th Floor',
      room: 'Transport Planning Bay (Room 402)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Section Head - Transport Planning / Acting Assistant Division Head'
    },
    {
      full_name: 'GUTIERREZ, Tyrone D.',
      title: '',
      position: 'Senior Transportation Regulation Officer',
      section: 'Transport Management',
      sub_unit: '',
      role: 'Section Head',
      also_assigned_to: '',
      email: 'tyrone.gutierrez@davaocity.gov.ph',
      phone: '0969 503 9672',
      floor: '4th Floor',
      room: 'Transport Management Bay (Room 403)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Section Head - Transport Management'
    },
    {
      full_name: 'ALVIOLA, Princess Guillen A.',
      title: '',
      position: 'Planning Officer I',
      section: 'Administrative Services',
      sub_unit: '',
      role: 'Section Head',
      also_assigned_to: 'Transport Planning (Research and Stats Unit)',
      email: 'guillen.albano@gmail.com',
      phone: '0907 732 4847',
      floor: '4th Floor',
      room: 'Administrative Services Bay (Room 404)',
      status: 'active',
      needs_review: 1,
      review_notes: 'Email (guillen.albano@…) does not match surname - verify; Has a second assignment - confirm primary section',
      notes: 'Section Head - Administrative Services; Second assignment in Transport Planning (Research and Stats Unit)'
    },
    {
      full_name: 'DIOSANA, Ma. Viktoria Louissa L.',
      title: '',
      position: 'Planning Officer I',
      section: 'Transport Planning',
      sub_unit: 'Development Plans Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'mvldiosana.cttmo@gmail.com',
      phone: '0961 580 9842',
      floor: '4th Floor',
      room: 'Development Plans Unit Desk',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Development Plans Unit'
    },
    {
      full_name: 'GREGORIO, Jay Arvin H.',
      title: 'Engr.',
      position: 'Engineer II',
      section: 'Transport Management',
      sub_unit: 'Transport Services Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'jgeorgejayarvin@gmail.com',
      phone: '0922 988 1673',
      floor: '4th Floor',
      room: 'Transport Management Bay (Room 403)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Transport Services Unit'
    },
    {
      full_name: 'FELISCUZO, Rusel M.',
      title: '',
      position: 'Traffic Operations Officer I',
      section: 'Transport Management',
      sub_unit: 'Transport Services Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'trafcon85feliscuzo@gmail.com',
      phone: '0948 803 4429',
      floor: '4th Floor',
      room: 'Transport Management Bay (Room 403)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Transport Services Unit'
    },
    {
      full_name: 'SIMPOL, Sheena P.',
      title: 'Engr.',
      position: 'Electrical Engineer I',
      section: 'Transport Management',
      sub_unit: 'Transport Systems Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'simpolsheena@gmail.com',
      phone: '0927 325 4471',
      floor: '4th Floor',
      room: 'Transport Management Bay (Room 403)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Transport Systems Unit'
    },
    {
      full_name: 'LUAYON, Jomarie E.',
      title: '',
      position: 'Administrative Officer I',
      section: 'Transport Management',
      sub_unit: 'Transport Services Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'jomarieluayon1400@gmail.com',
      phone: '0968 571 7237',
      floor: '4th Floor',
      room: 'Transport Management Bay (Room 403)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Transport Services Unit'
    },
    {
      full_name: 'ESTOQUIA, Merry Dawn M.',
      title: '',
      position: 'Personnel Management Assistant I',
      section: 'Administrative Services',
      sub_unit: '',
      role: 'Staff',
      also_assigned_to: 'Transport Planning (Research and Stats Unit)',
      email: 'merrydawn25@gmail.com',
      phone: '0936 462 9320',
      floor: '4th Floor',
      room: 'Administrative Services Bay (Room 404)',
      status: 'active',
      needs_review: 1,
      review_notes: 'Has a second assignment - confirm primary section',
      notes: 'Staff - Administrative Services; Second assignment in Transport Planning (Research and Stats Unit)'
    },
    {
      full_name: 'BEDREJO, Ivy G.',
      title: '',
      position: 'Strategic Intelligence Aide I',
      section: 'Transport Planning',
      sub_unit: 'Development Plans Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'ivygbedrejo@gmail.com',
      phone: '0935 294 0753',
      floor: '4th Floor',
      room: 'Development Plans Unit Desk',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Development Plans Unit'
    },
    {
      full_name: 'SOSOBRADO, John Kevin G.',
      title: '',
      position: 'Record Custodian I',
      section: 'Administrative Services',
      sub_unit: '',
      role: 'Staff',
      also_assigned_to: '',
      email: 'sosobradojohnkevin2@gmail.com',
      phone: '0948 050 7247',
      floor: '4th Floor',
      room: 'Administrative Services Bay (Room 404)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Administrative Services'
    },
    {
      full_name: 'JUMAMOY, John Michael L.',
      title: '',
      position: 'Traffic Aide I',
      section: 'Administrative Services',
      sub_unit: '',
      role: 'Staff',
      also_assigned_to: '',
      email: 'jmjumamoy1218@gmail.com',
      phone: '0946 902 1844',
      floor: '4th Floor',
      room: 'Administrative Services Bay (Room 404)',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Administrative Services'
    },
    {
      full_name: 'LICO, Argie B.',
      title: '',
      position: 'Information Systems Designer I',
      section: 'Transport Planning',
      sub_unit: 'Research and Stats Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'argielico3@gmail.com',
      phone: '0966 750 7358',
      floor: '4th Floor',
      room: 'Research & Stats Unit Desk',
      status: 'active',
      needs_review: 0,
      review_notes: '',
      notes: 'Staff - Research and Stats Unit'
    },
    {
      full_name: 'PONTULAN, Milca C.',
      title: '',
      position: 'Program Assistant I',
      section: 'Transport Planning',
      sub_unit: 'Development Plans Unit',
      role: 'Staff',
      also_assigned_to: '',
      email: 'pontulanm@gmail.com',
      phone: '',
      floor: '4th Floor',
      room: 'Development Plans Unit Desk',
      status: 'active',
      needs_review: 1,
      review_notes: 'Missing contact number',
      notes: 'Staff - Development Plans Unit'
    }
  ];

  const insertEmp = db.prepare(`
    INSERT INTO employees (
      full_name, title, position, unit_id, unit, unit_code,
      section, sub_unit, role, also_assigned_to, review_notes,
      floor, room, location, email, phone, status, needs_review,
      is_archived, last_verified_at, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      0, datetime('now'), ?, datetime('now'), datetime('now')
    )
  `);

  const insertedIds = {};

  for (const emp of tpmdRoster) {
    const loc = formatLocation(emp.floor, emp.room);
    const res = insertEmp.run(
      emp.full_name,
      emp.title,
      emp.position,
      tpmdUnit.id,
      tpmdUnit.name,
      tpmdUnit.short_code,
      emp.section,
      emp.sub_unit,
      emp.role,
      emp.also_assigned_to,
      emp.review_notes,
      emp.floor,
      emp.room,
      loc,
      emp.email,
      emp.phone,
      emp.status,
      emp.needs_review,
      emp.notes
    );
    insertedIds[emp.full_name] = res.lastInsertRowid;
  }

  // 6. Seed Functional Teams / Groups for TPMD Sections and Units
  db.exec('DELETE FROM groups;');
  const insertGroup = db.prepare('INSERT INTO groups (name, type, description) VALUES (?, ?, ?)');
  
  const gDivisionHead = insertGroup.run('Office of the Division Head', 'team', 'Executive leadership, strategic direction, and overall division administration').lastInsertRowid;
  const gPlanningSection = insertGroup.run('Transport Planning Section', 'team', 'Master planning, public transport route studies, and transport network design').lastInsertRowid;
  const gDevPlansUnit = insertGroup.run('Development Plans Unit', 'team', 'Formulation of comprehensive local transport plans and feasibility studies').lastInsertRowid;
  const gResearchStats = insertGroup.run('Research and Stats Unit', 'team', 'Traffic counts, passenger volume telemetry, and transport statistical modeling').lastInsertRowid;
  const gTransportMgmt = insertGroup.run('Transport Management Section', 'team', 'Operational oversight, transit services monitoring, and transport systems coordination').lastInsertRowid;
  const gServicesUnit = insertGroup.run('Transport Services Unit', 'team', 'Public conveyance operations, route compliance, and transport services management').lastInsertRowid;
  const gSystemsUnit = insertGroup.run('Transport Systems Unit', 'team', 'Intelligent transport systems, traffic signal telemetry, and electronic monitoring').lastInsertRowid;
  const gAdminServices = insertGroup.run('Administrative Services', 'team', 'Internal division personnel, records custody, procurement, and administrative support').lastInsertRowid;
  const gDigitalComm = insertGroup.run('Digital Transformation Committee', 'committee', 'Modernization of office directory, spatial databases, and automated reporting').lastInsertRowid;

  // 7. Associate Employees to Groups (Primary & Secondary Assignments)
  const insertMember = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');

  // Office of Division Head
  insertMember.run(insertedIds['SANTOS, Gina R.'], gDivisionHead);
  insertMember.run(insertedIds['SANTOS, Gina R.'], gDigitalComm);

  // Transport Planning Section
  insertMember.run(insertedIds['PEREZ IV, Eduardo B.'], gPlanningSection);
  insertMember.run(insertedIds['DIOSANA, Ma. Viktoria Louissa L.'], gPlanningSection);
  insertMember.run(insertedIds['BEDREJO, Ivy G.'], gPlanningSection);
  insertMember.run(insertedIds['PONTULAN, Milca C.'], gPlanningSection);
  insertMember.run(insertedIds['LICO, Argie B.'], gPlanningSection);

  // Development Plans Unit (3 members)
  insertMember.run(insertedIds['DIOSANA, Ma. Viktoria Louissa L.'], gDevPlansUnit);
  insertMember.run(insertedIds['BEDREJO, Ivy G.'], gDevPlansUnit);
  insertMember.run(insertedIds['PONTULAN, Milca C.'], gDevPlansUnit);

  // Research & Stats Unit (3 members: 1 primary + 2 secondary)
  insertMember.run(insertedIds['LICO, Argie B.'], gResearchStats);
  insertMember.run(insertedIds['ALVIOLA, Princess Guillen A.'], gResearchStats); // cross-assigned
  insertMember.run(insertedIds['ESTOQUIA, Merry Dawn M.'], gResearchStats); // cross-assigned
  insertMember.run(insertedIds['LICO, Argie B.'], gDigitalComm);

  // Transport Management Section
  insertMember.run(insertedIds['GUTIERREZ, Tyrone D.'], gTransportMgmt);
  insertMember.run(insertedIds['GREGORIO, Jay Arvin H.'], gTransportMgmt);
  insertMember.run(insertedIds['FELISCUZO, Rusel M.'], gTransportMgmt);
  insertMember.run(insertedIds['LUAYON, Jomarie E.'], gTransportMgmt);
  insertMember.run(insertedIds['SIMPOL, Sheena P.'], gTransportMgmt);

  // Transport Services Unit (3 members)
  insertMember.run(insertedIds['GREGORIO, Jay Arvin H.'], gServicesUnit);
  insertMember.run(insertedIds['FELISCUZO, Rusel M.'], gServicesUnit);
  insertMember.run(insertedIds['LUAYON, Jomarie E.'], gServicesUnit);

  // Transport Systems Unit (1 member)
  insertMember.run(insertedIds['SIMPOL, Sheena P.'], gSystemsUnit);

  // Administrative Services (4 members)
  insertMember.run(insertedIds['ALVIOLA, Princess Guillen A.'], gAdminServices);
  insertMember.run(insertedIds['ESTOQUIA, Merry Dawn M.'], gAdminServices);
  insertMember.run(insertedIds['SOSOBRADO, John Kevin G.'], gAdminServices);
  insertMember.run(insertedIds['JUMAMOY, John Michael L.'], gAdminServices);

  // 8. Seed Realistic Training Records for TPMD Personnel
  const insertTrain = db.prepare(`
    INSERT INTO training_records (employee_id, title, date, hours, provider, quarter)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertTrain.run(insertedIds['SANTOS, Gina R.'], 'Comprehensive Urban Transport Master Planning (JICA)', '2026-02-10', 24, 'Japan International Cooperation Agency', 'Q1 2026');
  insertTrain.run(insertedIds['SANTOS, Gina R.'], 'Public Service Leadership and Executive Accountability', '2026-05-14', 16, 'Civil Service Commission', 'Q2 2026');
  insertTrain.run(insertedIds['PEREZ IV, Eduardo B.'], 'Legal Framework of Local Government Public Transport Franchising', '2026-03-22', 16, 'Department of Transportation', 'Q1 2026');
  insertTrain.run(insertedIds['GUTIERREZ, Tyrone D.'], 'Modern Transit Route Rationalization & Network Optimization', '2026-04-18', 20, 'UP National Center for Transportation Studies', 'Q2 2026');
  insertTrain.run(insertedIds['SIMPOL, Sheena P.'], 'Intelligent Traffic Signal Control & Sensor Telemetry', '2026-06-08', 32, 'Advanced Electronics & Automation Institute', 'Q2 2026');
  insertTrain.run(insertedIds['LICO, Argie B.'], 'Geographic Information Systems (GIS) for Transit Analysis', '2026-03-12', 40, 'Geospatial Research Center', 'Q1 2026');
  insertTrain.run(insertedIds['LICO, Argie B.'], 'Relational Database Security & Audit Log Management', '2026-07-20', 24, 'OpenTech Academy', 'Q3 2026');
  insertTrain.run(insertedIds['GREGORIO, Jay Arvin H.'], 'Road Safety Engineering & Geometric Inspection Protocols', '2026-04-25', 16, 'Department of Public Works and Highways', 'Q2 2026');
  insertTrain.run(insertedIds['ALVIOLA, Princess Guillen A.'], 'Government Procurement Reform Act (RA 9184) Updates', '2026-02-15', 16, 'Government Procurement Policy Board', 'Q1 2026');

  console.log(`Successfully populated 15 official TPMD staff records, 9 teams/groups, and 9 training logs.`);
}

if (require.main === module) {
  seedTpmdData();
}

module.exports = { seedTpmdData };
