const { db } = require('./db');

console.log('=== TEST SUITE VERIFICATION ===');

// 1. Six divisions exist
const divisions = db.prepare("SELECT id, short_code, name FROM org_units WHERE type = 'division'").all();
console.log('Divisions count:', divisions.length, divisions.map(d => d.short_code));

// 2. Sections and units exist under TPMD
const tpmd = db.prepare("SELECT id FROM org_units WHERE short_code = 'TPMD'").get();
const sections = db.prepare("SELECT id, short_code, name FROM org_units WHERE parent_id = ? AND type = 'section'").all(tpmd.id);
console.log('TPMD sections count:', sections.length, sections.map(s => s.name));

const units = db.prepare("SELECT o.name as unit, p.name as section FROM org_units o JOIN org_units p ON o.parent_id = p.id WHERE o.type = 'unit'").all();
console.log('TPMD units count:', units.length, units);

// 3. Exactly one primary assignment per employee
const primaryIssues = db.prepare("SELECT employee_id, SUM(is_primary) as prim_count FROM assignments GROUP BY employee_id HAVING prim_count != 1").all();
console.log('Primary assignment violations (should be empty):', primaryIssues);

// 4. Secondary assignments exist
const secondaryAssns = db.prepare("SELECT a.id, e.full_name, o.name as unit_name FROM assignments a JOIN employees e ON a.employee_id = e.id JOIN org_units o ON a.org_unit_id = o.id WHERE a.is_primary = 0").all();
console.log('Secondary assignments count:', secondaryAssns.length, secondaryAssns.map(s => `${s.full_name} -> ${s.unit_name}`));

// 5. Migrated sections no longer in groups table
const groups = db.prepare("SELECT id, name, type, scope FROM groups").all();
console.log('Active genuine groups count:', groups.length, groups.map(g => `${g.name} (${g.type}, ${g.scope})`));

// 6. TPMD total unique personnel
const uniqueTpmd = db.prepare("SELECT COUNT(DISTINCT employee_id) as count FROM assignments a JOIN org_units o ON a.org_unit_id = o.id WHERE o.id = ? OR o.parent_id = ? OR o.parent_id IN (SELECT id FROM org_units WHERE parent_id = ?)").get(tpmd.id, tpmd.id, tpmd.id);
console.log('Unique TPMD staff count:', uniqueTpmd.count);
