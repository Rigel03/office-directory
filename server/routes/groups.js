const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// GET /api/groups
router.get('/', (req, res) => {
  try {
    const { type } = req.query;
    let query = `
      SELECT g.*, COUNT(eg.employee_id) as member_count
      FROM groups g
      LEFT JOIN employee_groups eg ON g.id = eg.group_id
    `;
    const params = [];
    if (type) {
      query += ` WHERE g.type = ?`;
      params.push(type);
    }
    query += ` GROUP BY g.id ORDER BY g.name ASC`;
    const rows = db.prepare(query).all(...params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve groups.' });
  }
});

// GET /api/groups/:id (with member details)
router.get('/:id', (req, res) => {
  try {
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    const members = db.prepare(`
      SELECT e.id, e.full_name, e.position, e.unit, e.status, e.email, e.location
      FROM employees e
      JOIN employee_groups eg ON e.id = eg.employee_id
      WHERE eg.group_id = ?
      ORDER BY e.full_name ASC
    `).all(req.params.id);

    return res.json({ ...group, members });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch group details.' });
  }
});

// POST /api/groups
router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { name, type, description = '', memberIds = [] } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required.' });
    if (!['training batch', 'team', 'committee', 'other'].includes(type)) {
      return res.status(400).json({ error: 'Invalid group type.' });
    }

    const insert = db.prepare('INSERT INTO groups (name, type, description) VALUES (?, ?, ?)');
    const result = insert.run(name.trim(), type, description.trim());
    const newId = result.lastInsertRowid;

    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const insertMem = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
      for (const empId of memberIds) {
        insertMem.run(empId, newId);
      }
    }

    const created = db.prepare('SELECT * FROM groups WHERE id = ?').get(newId);
    return res.status(201).json(created);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A group with this name already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create group.' });
  }
});

// PUT /api/groups/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { name, type, description = '' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required.' });

    const update = db.prepare('UPDATE groups SET name = ?, type = ?, description = ? WHERE id = ?');
    update.run(name.trim(), type, description.trim(), req.params.id);

    const updated = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update group.' });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Group deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete group.' });
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
