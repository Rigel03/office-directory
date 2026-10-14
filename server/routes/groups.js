const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// GET /api/groups
router.get('/', (req, res) => {
  try {
    const { type, scope, search } = req.query;
    let query = `
      SELECT g.*,
        o.name as scope_division_name,
        o.short_code as scope_division_short_code,
        COUNT(eg.employee_id) as member_count
      FROM groups g
      LEFT JOIN org_units o ON g.scope_division_id = o.id
      LEFT JOIN employee_groups eg ON g.id = eg.group_id
      WHERE g.active = 1
    `;
    const params = [];
    if (type && type !== 'all') {
      query += ` AND g.type = ?`;
      params.push(type);
    }
    if (scope && scope !== 'all') {
      query += ` AND g.scope = ?`;
      params.push(scope);
    }
    if (search && search.trim()) {
      query += ` AND (g.name LIKE ? OR g.description LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` GROUP BY g.id ORDER BY g.name ASC`;
    const rows = db.prepare(query).all(...params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve groups: ' + err.message });
  }
});

// GET /api/groups/:id (with member details, division, and section info)
router.get('/:id', (req, res) => {
  try {
    const group = db.prepare(`
      SELECT g.*,
        o.name as scope_division_name,
        o.short_code as scope_division_short_code
      FROM groups g
      LEFT JOIN org_units o ON g.scope_division_id = o.id
      WHERE g.id = ?
    `).get(req.params.id);

    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const members = db.prepare(`
      SELECT
        e.id,
        e.full_name,
        e.title,
        e.position,
        e.email,
        e.phone,
        e.location,
        e.status,
        e.unit,
        e.unit_code,
        e.section,
        e.sub_unit,
        o_div.name as division_name,
        o_div.short_code as division_short_code,
        o_sec.name as section_name,
        o_sec.short_code as section_short_code
      FROM employees e
      JOIN employee_groups eg ON e.id = eg.employee_id
      LEFT JOIN assignments a_prim ON (e.id = a_prim.employee_id AND a_prim.is_primary = 1)
      LEFT JOIN org_units o_prim ON a_prim.org_unit_id = o_prim.id
      LEFT JOIN org_units o_sec ON (
        CASE
          WHEN o_prim.type = 'section' THEN o_prim.id
          WHEN o_prim.type = 'unit' THEN o_prim.parent_id
          ELSE NULL
        END = o_sec.id
      )
      LEFT JOIN org_units o_div ON (
        CASE
          WHEN o_prim.type = 'division' THEN o_prim.id
          WHEN o_prim.type = 'section' THEN o_prim.parent_id
          WHEN o_prim.type = 'unit' THEN (SELECT parent_id FROM org_units WHERE id = o_prim.parent_id)
          ELSE NULL
        END = o_div.id
      )
      WHERE eg.group_id = ? AND e.is_archived = 0
      ORDER BY e.full_name ASC
    `).all(req.params.id);

    return res.json({ ...group, members });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch group details: ' + err.message });
  }
});

// POST /api/groups (Admin only)
router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { name, type, description = '', scope = 'office-wide', scope_division_id = null, memberIds = [] } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required.' });
    if (!['training batch', 'team', 'committee', 'other'].includes(type)) {
      return res.status(400).json({ error: 'Invalid group type.' });
    }
    if (!['office-wide', 'division'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid group scope.' });
    }

    const divisionId = scope === 'division' ? (scope_division_id || null) : null;

    const insert = db.prepare(`
      INSERT INTO groups (name, type, description, scope, scope_division_id, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const result = insert.run(name.trim(), type, description.trim(), scope, divisionId);
    const newId = result.lastInsertRowid;

    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const insertMem = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
      for (const empId of memberIds) {
        insertMem.run(empId, newId);
      }
    }

    logAudit(null, 'CREATE_GROUP', [{ group_id: newId, name, type, scope }], req.user);

    const created = db.prepare('SELECT * FROM groups WHERE id = ?').get(newId);
    return res.status(201).json(created);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A group with this name already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create group: ' + err.message });
  }
});

// PUT /api/groups/:id (Admin only)
router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Group not found.' });

    const { name, type, description = '', scope = 'office-wide', scope_division_id = null } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required.' });

    const divisionId = scope === 'division' ? (scope_division_id || null) : null;

    const update = db.prepare(`
      UPDATE groups
      SET name = ?, type = ?, description = ?, scope = ?, scope_division_id = ?
      WHERE id = ?
    `);
    update.run(name.trim(), type, description.trim(), scope, divisionId, id);

    logAudit(null, 'UPDATE_GROUP', [{ group_id: id, name, type, scope }], req.user);

    const updated = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update group: ' + err.message });
  }
});

// DELETE /api/groups/:id (Admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    db.prepare('DELETE FROM employee_groups WHERE group_id = ?').run(req.params.id);
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);

    logAudit(null, 'DELETE_GROUP', [{ group_id: req.params.id, name: group.name }], req.user);
    return res.json({ success: true, message: 'Group deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete group: ' + err.message });
  }
});

// POST /api/groups/:id/members (add member IDs)
router.post('/:id/members', requireRole('admin'), (req, res) => {
  try {
    const groupId = req.params.id;
    const { employeeIds } = req.body;
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'employeeIds array is required.' });
    }

    const insert = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
    for (const eid of employeeIds) {
      insert.run(eid, groupId);
    }

    return res.json({ success: true, count: employeeIds.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add members to group.' });
  }
});

// DELETE /api/groups/:id/members/:employeeId (remove member)
router.delete('/:id/members/:employeeId', requireRole('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM employee_groups WHERE group_id = ? AND employee_id = ?').run(
      req.params.id,
      req.params.employeeId
    );
    return res.json({ success: true, message: 'Member removed from group.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// POST /api/groups/:id/move-members (move members from this group to another group or remove from source)
router.post('/:id/move-members', requireRole('admin'), (req, res) => {
  try {
    const sourceGroupId = Number(req.params.id);
    const { targetGroupId, employeeIds, removeFromSource = true } = req.body;

    if (!targetGroupId || !Array.isArray(employeeIds)) {
      return res.status(400).json({ error: 'targetGroupId and employeeIds are required.' });
    }

    const transaction = db.transaction(() => {
      const insert = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
      const remove = db.prepare('DELETE FROM employee_groups WHERE group_id = ? AND employee_id = ?');

      for (const eid of employeeIds) {
        insert.run(eid, targetGroupId);
        if (removeFromSource) {
          remove.run(sourceGroupId, eid);
        }
      }
    });

    transaction();
    return res.json({ success: true, movedCount: employeeIds.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to move members between groups.' });
  }
});

module.exports = router;
