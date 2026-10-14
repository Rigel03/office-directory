const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// GET /api/org/tree - full hierarchical tree of divisions, sections, and units
router.get('/tree', (req, res) => {
  try {
    const orgUnits = db.prepare(`
      SELECT o.*,
        p.name as parent_name,
        p.short_code as parent_short_code
      FROM org_units o
      LEFT JOIN org_units p ON o.parent_id = p.id
      WHERE o.active = 1
      ORDER BY o.sort_order ASC, o.name ASC
    `).all();

    return res.json(orgUnits);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve org structure tree.' });
  }
});

// GET /api/org/divisions - division cards with head and unique staff counts
router.get('/divisions', (req, res) => {
  try {
    const divisions = db.prepare(`
      SELECT o.*
      FROM org_units o
      WHERE o.type = 'division' AND o.active = 1
      ORDER BY o.sort_order ASC, o.id ASC
    `).all();

    const result = divisions.map(div => {
      // Find all descendant IDs for this division (division -> sections -> units)
      const sections = db.prepare(`
        SELECT id FROM org_units WHERE parent_id = ? AND active = 1
      `).all(div.id).map(s => s.id);

      let unitIds = [];
      if (sections.length > 0) {
        unitIds = db.prepare(`
          SELECT id FROM org_units WHERE parent_id IN (${sections.map(() => '?').join(',')}) AND active = 1
        `).all(...sections).map(u => u.id);
      }

      const allOrgIds = [div.id, ...sections, ...unitIds];

      // Unique employee count across this entire division
      const uniqueCount = db.prepare(`
        SELECT COUNT(DISTINCT a.employee_id) as count
        FROM assignments a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.org_unit_id IN (${allOrgIds.map(() => '?').join(',')})
          AND e.is_archived = 0
      `).get(...allOrgIds).count;

      // Division head: find employee assigned to this division or section with role='head'
      const headAssignment = db.prepare(`
        SELECT e.id, e.full_name, e.title, a.role
        FROM assignments a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.org_unit_id = ? AND a.role = 'head' AND e.is_archived = 0
        LIMIT 1
      `).get(div.id) || db.prepare(`
        SELECT e.id, e.full_name, e.title, a.role
        FROM assignments a
        JOIN employees e ON a.employee_id = e.id
        JOIN org_units o ON a.org_unit_id = o.id
        WHERE o.parent_id = ? AND (o.name LIKE '%Division Head%' OR a.role = 'head') AND e.is_archived = 0
        LIMIT 1
      `).get(div.id);

      return {
        ...div,
        staff_count: uniqueCount,
        head_name: headAssignment ? (headAssignment.title ? `${headAssignment.title} ${headAssignment.full_name}` : headAssignment.full_name) : null,
        head_id: headAssignment ? headAssignment.id : null
      };
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve divisions.' });
  }
});

// GET /api/org/divisions/:id/details - full division view data: sections, units, counts, staff members
router.get('/divisions/:id/details', (req, res) => {
  try {
    const divId = Number(req.params.id);
    const division = db.prepare(`
      SELECT * FROM org_units WHERE id = ? AND type = 'division' AND active = 1
    `).get(divId);

    if (!division) {
      return res.status(404).json({ error: 'Division not found.' });
    }

    // Sections under this division
    const sections = db.prepare(`
      SELECT * FROM org_units WHERE parent_id = ? AND type = 'section' AND active = 1
      ORDER BY sort_order ASC, name ASC
    `).all(divId);

    const sectionIds = sections.map(s => s.id);

    // Units under these sections
    let units = [];
    if (sectionIds.length > 0) {
      units = db.prepare(`
        SELECT * FROM org_units WHERE parent_id IN (${sectionIds.map(() => '?').join(',')}) AND type = 'unit' AND active = 1
        ORDER BY sort_order ASC, name ASC
      `).all(...sectionIds);
    }

    const allBranchIds = [divId, ...sectionIds, ...units.map(u => u.id)];

    // Fetch all assignments with full employee details in this division
    const assignments = db.prepare(`
      SELECT
        a.id as assignment_id,
        a.employee_id,
        a.org_unit_id,
        a.is_primary,
        a.role as assignment_role,
        o.name as org_unit_name,
        o.short_code as org_unit_short_code,
        o.type as org_unit_type,
        o.parent_id as org_unit_parent_id,
        e.full_name,
        e.title,
        e.position,
        e.email,
        e.phone,
        e.floor,
        e.room,
        e.location,
        e.status,
        e.needs_review,
        e.review_notes
      FROM assignments a
      JOIN org_units o ON a.org_unit_id = o.id
      JOIN employees e ON a.employee_id = e.id
      WHERE a.org_unit_id IN (${allBranchIds.map(() => '?').join(',')})
        AND e.is_archived = 0
      ORDER BY e.full_name ASC
    `).all(...allBranchIds);

    // Also get primary assignment info for all employees involved to show breadcrumb link
    const employeeIds = [...new Set(assignments.map(a => a.employee_id))];
    const primaryPlacements = {};
    if (employeeIds.length > 0) {
      const primaries = db.prepare(`
        SELECT a.employee_id, a.org_unit_id, o.name as org_name, o.short_code, o.type, p.name as parent_name
        FROM assignments a
        JOIN org_units o ON a.org_unit_id = o.id
        LEFT JOIN org_units p ON o.parent_id = p.id
        WHERE a.employee_id IN (${employeeIds.map(() => '?').join(',')}) AND a.is_primary = 1
      `).all(...employeeIds);
      for (const p of primaries) {
        primaryPlacements[p.employee_id] = p;
      }
    }

    // Attach primary placement context and section heads
    const enrichedAssignments = assignments.map(a => ({
      ...a,
      primary_placement: primaryPlacements[a.employee_id] || null
    }));

    // Calculate counts for each section (including its units)
    const sectionCounts = {};
    for (const s of sections) {
      const childUnitIds = units.filter(u => u.parent_id === s.id).map(u => u.id);
      const targetIds = [s.id, ...childUnitIds];
      const count = db.prepare(`
        SELECT COUNT(DISTINCT a.employee_id) as c
        FROM assignments a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.org_unit_id IN (${targetIds.map(() => '?').join(',')}) AND e.is_archived = 0
      `).get(...targetIds).c;

      // Section Head
      const head = enrichedAssignments.find(a => (a.org_unit_id === s.id || childUnitIds.includes(a.org_unit_id)) && a.assignment_role === 'head');

      sectionCounts[s.id] = {
        count,
        head_name: head ? (head.title ? `${head.title} ${head.full_name}` : head.full_name) : null,
        head_id: head ? head.employee_id : null
      };
    }

    // Calculate counts for each unit
    const unitCounts = {};
    for (const u of units) {
      const count = db.prepare(`
        SELECT COUNT(DISTINCT a.employee_id) as c
        FROM assignments a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.org_unit_id = ? AND e.is_archived = 0
      `).get(u.id).c;
      unitCounts[u.id] = count;
    }

    // Unique division staff count
    const uniqueDivisionStaff = employeeIds.length;

    return res.json({
      division,
      sections: sections.map(s => ({
        ...s,
        staff_count: sectionCounts[s.id]?.count || 0,
        head_name: sectionCounts[s.id]?.head_name || null,
        head_id: sectionCounts[s.id]?.head_id || null,
        units: units.filter(u => u.parent_id === s.id).map(u => ({
          ...u,
          staff_count: unitCounts[u.id] || 0
        }))
      })),
      assignments: enrichedAssignments,
      unique_staff_count: uniqueDivisionStaff
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve division details: ' + err.message });
  }
});

// POST /api/org/units - create a section or unit under a parent (Admin/Editor only)
router.post('/units', requireRole('admin'), (req, res) => {
  try {
    const { name, short_code, type, parent_id, sort_order = 0, default_floor = '', description = '' } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!short_code || !short_code.trim()) return res.status(400).json({ error: 'Short code is required.' });
    if (!['division', 'section', 'unit'].includes(type)) {
      return res.status(400).json({ error: 'Invalid org unit type.' });
    }

    // Enforce structure rules:
    // unit parent must be section, section parent must be division, division has no parent
    if (type === 'unit') {
      if (!parent_id) return res.status(400).json({ error: "A unit's parent must be a section." });
      const parent = db.prepare('SELECT type FROM org_units WHERE id = ?').get(parent_id);
      if (!parent || parent.type !== 'section') {
        return res.status(400).json({ error: "A unit's parent must be an existing section." });
      }
    } else if (type === 'section') {
      if (!parent_id) return res.status(400).json({ error: "A section's parent must be a division." });
      const parent = db.prepare('SELECT type FROM org_units WHERE id = ?').get(parent_id);
      if (!parent || parent.type !== 'division') {
        return res.status(400).json({ error: "A section's parent must be an existing division." });
      }
    } else if (type === 'division') {
      if (parent_id) return res.status(400).json({ error: 'A division cannot have a parent.' });
    }

    const insert = db.prepare(`
      INSERT INTO org_units (name, short_code, type, parent_id, sort_order, active, default_floor, description)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);
    const result = insert.run(name.trim(), short_code.trim().toUpperCase(), type, parent_id || null, Number(sort_order) || 0, default_floor.trim(), description.trim());
    const newId = result.lastInsertRowid;

    logAudit(null, 'CREATE_ORG_UNIT', [{ field: 'org_unit', name, type, short_code }], req.user);

    const created = db.prepare('SELECT * FROM org_units WHERE id = ?').get(newId);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create org unit: ' + err.message });
  }
});

// PUT /api/org/units/:id - update/rename an org unit
router.put('/units/:id', requireRole('admin'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM org_units WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Org unit not found.' });

    const { name, short_code, sort_order, default_floor, description, head_employee_id } = req.body;

    const newName = name !== undefined ? name.trim() : existing.name;
    const newCode = short_code !== undefined ? short_code.trim().toUpperCase() : existing.short_code;
    const newSort = sort_order !== undefined ? Number(sort_order) : existing.sort_order;
    const newFloor = default_floor !== undefined ? default_floor.trim() : existing.default_floor;
    const newDesc = description !== undefined ? description.trim() : existing.description;

    db.prepare(`
      UPDATE org_units
      SET name = ?, short_code = ?, sort_order = ?, default_floor = ?, description = ?
      WHERE id = ?
    `).run(newName, newCode, newSort, newFloor, newDesc, id);

    // Also update legacy units table if renaming a division
    if (existing.type === 'division') {
      db.prepare(`
        UPDATE units SET name = ?, short_code = ? WHERE id = ? OR name = ? OR short_code = ?
      `).run(newName, newCode, id, existing.name, existing.short_code);

      db.prepare(`
        UPDATE employees SET unit = ?, unit_code = ? WHERE unit_id = ? OR unit = ? OR unit_code = ?
      `).run(newName, newCode, id, existing.name, existing.short_code);
    }

    // Set head if specified
    if (head_employee_id !== undefined) {
      if (head_employee_id) {
        // Demote previous heads of this org unit
        db.prepare("UPDATE assignments SET role = 'staff' WHERE org_unit_id = ? AND role = 'head'").run(id);

        // Assign or update target employee as head
        const existingAssn = db.prepare('SELECT id FROM assignments WHERE employee_id = ? AND org_unit_id = ?').get(head_employee_id, id);
        if (existingAssn) {
          db.prepare("UPDATE assignments SET role = 'head' WHERE id = ?").run(existingAssn.id);
        } else {
          // Add as secondary or primary if none
          const hasPrimary = db.prepare('SELECT id FROM assignments WHERE employee_id = ? AND is_primary = 1').get(head_employee_id);
          db.prepare('INSERT INTO assignments (employee_id, org_unit_id, is_primary, role) VALUES (?, ?, ?, ?)').run(
            head_employee_id,
            id,
            hasPrimary ? 0 : 1,
            'head'
          );
        }
      }
    }

    logAudit(null, 'UPDATE_ORG_UNIT', [{ field: 'name', old: existing.name, new: newName }], req.user);

    const updated = db.prepare('SELECT * FROM org_units WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update org unit: ' + err.message });
  }
});

// DELETE /api/org/units/:id - delete/archive an org unit (enforce: cannot delete if has members or children)
router.delete('/units/:id', requireRole('admin'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const orgUnit = db.prepare('SELECT * FROM org_units WHERE id = ?').get(id);
    if (!orgUnit) return res.status(404).json({ error: 'Org unit not found.' });

    // Check for child units
    const childrenCount = db.prepare('SELECT COUNT(*) as count FROM org_units WHERE parent_id = ? AND active = 1').get(id).count;
    if (childrenCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${orgUnit.name}" because it contains ${childrenCount} child ${orgUnit.type === 'division' ? 'sections' : 'units'}. Please move or delete the children first.`
      });
    }

    // Check for assigned members
    const memberCount = db.prepare(`
      SELECT COUNT(*) as count FROM assignments a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.org_unit_id = ? AND e.is_archived = 0
    `).get(id).count;

    if (memberCount > 0) {
      return res.status(400).json({
        error: `Cannot delete "${orgUnit.name}" because it has ${memberCount} staff assigned to it. Please reassign the members first.`
      });
    }

    // Safe to delete
    db.prepare('DELETE FROM org_units WHERE id = ?').run(id);

    logAudit(null, 'DELETE_ORG_UNIT', [{ name: orgUnit.name, type: orgUnit.type }], req.user);
    return res.json({ success: true, message: `Successfully deleted "${orgUnit.name}".` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete org unit: ' + err.message });
  }
});

// POST /api/org/assignments - manage employee assignment (set primary or secondary)
router.post('/assignments', requireRole('admin'), (req, res) => {
  try {
    const { employee_id, org_unit_id, is_primary, role = 'staff' } = req.body;
    if (!employee_id || !org_unit_id) {
      return res.status(400).json({ error: 'employee_id and org_unit_id are required.' });
    }

    const orgUnit = db.prepare('SELECT * FROM org_units WHERE id = ?').get(org_unit_id);
    if (!orgUnit) return res.status(404).json({ error: 'Org unit not found.' });

    const primaryFlag = is_primary ? 1 : 0;

    // Enforce: at most one primary assignment per employee
    if (primaryFlag === 1) {
      db.prepare('UPDATE assignments SET is_primary = 0 WHERE employee_id = ?').run(employee_id);
    }

    const existing = db.prepare('SELECT * FROM assignments WHERE employee_id = ? AND org_unit_id = ?').get(employee_id, org_unit_id);
    if (existing) {
      db.prepare('UPDATE assignments SET is_primary = ?, role = ? WHERE id = ?').run(primaryFlag, role, existing.id);
    } else {
      db.prepare('INSERT INTO assignments (employee_id, org_unit_id, is_primary, role) VALUES (?, ?, ?, ?)').run(
        employee_id,
        org_unit_id,
        primaryFlag,
        role
      );
    }

    logAudit(employee_id, 'UPDATE_ASSIGNMENT', [{ org_unit_id, is_primary: primaryFlag, role }], req.user);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update assignment: ' + err.message });
  }
});

// DELETE /api/org/assignments/:id - remove secondary assignment
router.delete('/assignments/:id', requireRole('admin'), (req, res) => {
  try {
    const assn = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    if (!assn) return res.status(404).json({ error: 'Assignment not found.' });

    if (assn.is_primary) {
      return res.status(400).json({ error: 'Cannot remove an employee\'s primary assignment. Reassign them to another primary section/unit instead.' });
    }

    db.prepare('DELETE FROM assignments WHERE id = ?').run(assn.id);
    logAudit(assn.employee_id, 'REMOVE_SECONDARY_ASSIGNMENT', [{ org_unit_id: assn.org_unit_id }], req.user);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove assignment: ' + err.message });
  }
});

module.exports = router;
