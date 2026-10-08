const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { normalizeName } = require('../nameNormalizer');

// All routes require authentication
router.use(authMiddleware);

// GET /api/employees
router.get('/', (req, res) => {
  try {
    const {
      search,
      unit,
      groupId,
      status,
      needsReview,
      sortBy = 'full_name',
      sortOrder = 'asc'
    } = req.query;

    let query = `
      SELECT e.*,
        GROUP_CONCAT(DISTINCT g.name) AS group_names,
        GROUP_CONCAT(DISTINCT g.id) AS group_ids
      FROM employees e
      LEFT JOIN employee_groups eg ON e.id = eg.employee_id
      LEFT JOIN groups g ON eg.group_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (e.full_name LIKE ? OR e.position LIKE ? OR e.unit LIKE ? OR e.email LIKE ? OR e.location LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    if (unit && unit.trim()) {
      query += ` AND e.unit = ?`;
      params.push(unit.trim());
    }

    if (status && status.trim()) {
      query += ` AND e.status = ?`;
      params.push(status.trim());
    }

    if (needsReview === 'true' || needsReview === '1') {
      query += ` AND e.needs_review = 1`;
    }

    if (groupId) {
      query += ` AND e.id IN (SELECT employee_id FROM employee_groups WHERE group_id = ?)`;
      params.push(Number(groupId));
    }

    query += ` GROUP BY e.id`;

    // Validate sort column to avoid SQL injection
    const allowedSortCols = ['full_name', 'position', 'unit', 'status', 'location', 'last_verified_at', 'created_at', 'needs_review'];
    const safeSortCol = allowedSortCols.includes(sortBy) ? sortBy : 'full_name';
    const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    query += ` ORDER BY e.${safeSortCol} ${safeSortOrder}`;

    const employees = db.prepare(query).all(...params);

    // Format group list
    const formatted = employees.map(emp => ({
      ...emp,
      needs_review: Boolean(emp.needs_review),
      groups: emp.group_names
        ? emp.group_names.split(',').map((name, i) => ({
            id: Number(emp.group_ids.split(',')[i]),
            name: name.trim()
          }))
        : []
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('Fetch employees failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve employee directory.' });
  }
});

// GET /api/employees/units
router.get('/units', (req, res) => {
  try {
    const rows = db.prepare(`SELECT DISTINCT unit FROM employees WHERE unit IS NOT NULL AND unit != '' ORDER BY unit ASC`).all();
    return res.json(rows.map(r => r.unit));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve units.' });
  }
});

// GET /api/employees/units/summary (with employee counts)
router.get('/units/summary', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT unit, COUNT(*) as member_count
      FROM employees
      WHERE unit IS NOT NULL AND unit != ''
      GROUP BY unit
      ORDER BY unit ASC
    `).all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve units summary.' });
  }
});

// PUT /api/employees/units/rename (Admin only - rename a division/unit across all employees)
router.put('/units/rename', requireRole('admin'), (req, res) => {
  try {
    const { oldUnit, newUnit } = req.body;
    if (!oldUnit || !newUnit || !newUnit.trim()) {
      return res.status(400).json({ error: 'Both oldUnit and newUnit are required.' });
    }

    const trimmedNew = newUnit.trim();
    const update = db.prepare(`
      UPDATE employees
      SET unit = ?, updated_at = datetime('now')
      WHERE unit = ?
    `);

    const result = update.run(trimmedNew, oldUnit);
    logAudit(null, 'RENAME_UNIT', [
      { field: 'unit', old: oldUnit, new: trimmedNew, affectedRows: result.changes }
    ], req.user);

    return res.json({ success: true, count: result.changes, oldUnit, newUnit: trimmedNew });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to rename unit: ' + err.message });
  }
});

// GET /api/employees/:id
router.get('/:id', (req, res) => {
  try {
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const groups = db.prepare(`
      SELECT g.id, g.name, g.type FROM groups g
      JOIN employee_groups eg ON g.id = eg.group_id
      WHERE eg.employee_id = ?
    `).all(req.params.id);

    const training = db.prepare(`
      SELECT * FROM training_records WHERE employee_id = ? ORDER BY date DESC
    `).all(req.params.id);

    return res.json({
      ...emp,
      needs_review: Boolean(emp.needs_review),
      groups,
      training
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch employee details.' });
  }
});

// GET /api/employees/:id/audit
router.get('/:id/audit', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs WHERE employee_id = ? ORDER BY created_at DESC
    `).all(req.params.id);
    const parsed = logs.map(l => ({
      ...l,
      changes: JSON.parse(l.changes || '[]')
    }));
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit records.' });
  }
});

// POST /api/employees (Admin only)
router.post('/', requireRole('admin'), (req, res) => {
  try {
    const {
      full_name,
      position,
      unit,
      email,
      phone,
      location,
      status = 'active',
      notes = '',
      groupIds = []
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    // Rule: position and unit must be filled before saving!
    const cleanPos = (position || '').trim();
    const cleanUnit = (unit || '').trim();

    if (!cleanPos || !cleanUnit) {
      return res.status(400).json({
        error: 'Both Position and Unit are required fields before saving a new employee record.'
      });
    }

    const normalizedName = normalizeName(full_name);
    const needsReview = (!cleanPos || !cleanUnit) ? 1 : 0;

    const insert = db.prepare(`
      INSERT INTO employees (
        full_name, position, unit, email, phone, location, status,
        needs_review, last_verified_at, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
    `);

    const result = insert.run(
      normalizedName,
      cleanPos,
      cleanUnit,
      (email || '').trim(),
      (phone || '').trim(),
      (location || '').trim(),
      status,
      needsReview,
      (notes || '').trim()
    );

    const newId = result.lastInsertRowid;

    // Attach groups if any
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      const insertGroup = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
      for (const gid of groupIds) {
        insertGroup.run(newId, gid);
      }
    }

    logAudit(newId, 'CREATE', [
      { field: 'record', old: null, new: `Created record for ${normalizedName}` }
    ], req.user);

    const created = db.prepare('SELECT * FROM employees WHERE id = ?').get(newId);
    return res.status(201).json(created);
  } catch (err) {
    console.error('Create employee error:', err);
    return res.status(500).json({ error: 'Failed to create employee.' });
  }
});

// PUT /api/employees/:id (Admin only)
router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Employee not found.' });

    const {
      full_name,
      position,
      unit,
      email,
      phone,
      location,
      status,
      notes,
      groupIds
    } = req.body;

    const cleanPos = (position || '').trim();
    const cleanUnit = (unit || '').trim();

    // Required fields rule
    if (!cleanPos || !cleanUnit) {
      return res.status(400).json({
        error: 'Both Position and Unit are required fields before saving.'
      });
    }

    const normalizedName = normalizeName(full_name || existing.full_name);
    const needsReview = (!cleanPos || !cleanUnit) ? 1 : 0;

    // Audit diff tracking
    const changes = [];
    const fieldsToCheck = [
      { key: 'full_name', val: normalizedName },
      { key: 'position', val: cleanPos },
      { key: 'unit', val: cleanUnit },
      { key: 'email', val: (email || '').trim() },
      { key: 'phone', val: (phone || '').trim() },
      { key: 'location', val: (location || '').trim() },
      { key: 'status', val: status || existing.status },
      { key: 'notes', val: (notes || '').trim() }
    ];

    for (const f of fieldsToCheck) {
      if (existing[f.key] !== f.val) {
        changes.push({ field: f.key, old: existing[f.key], new: f.val });
      }
    }

    const update = db.prepare(`
      UPDATE employees
      SET full_name = ?, position = ?, unit = ?, email = ?, phone = ?,
          location = ?, status = ?, needs_review = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    update.run(
      normalizedName,
      cleanPos,
      cleanUnit,
      (email || '').trim(),
      (phone || '').trim(),
      (location || '').trim(),
      status || existing.status,
      needsReview,
      (notes || '').trim(),
      id
    );

    // Sync groups if provided
    if (Array.isArray(groupIds)) {
      db.prepare('DELETE FROM employee_groups WHERE employee_id = ?').run(id);
      const insertGroup = db.prepare('INSERT INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
      for (const gid of groupIds) {
        insertGroup.run(id, gid);
      }
      changes.push({ field: 'groups', old: 'updated', new: `${groupIds.length} groups` });
    }

    if (changes.length > 0) {
      logAudit(id, 'UPDATE', changes, req.user);
    }

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    console.error('Update employee error:', err);
    return res.status(500).json({ error: 'Failed to update employee.' });
  }
});

// PATCH /api/employees/:id/inline (Admin only - quick fix for position/unit)
router.patch('/:id/inline', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Employee not found.' });

    const { field, value } = req.body;
    const allowed = ['position', 'unit', 'location', 'status', 'email', 'phone'];
    if (!allowed.includes(field)) {
      return res.status(400).json({ error: `Field '${field}' is not editable inline.` });
    }

    const cleanVal = (value || '').trim();
    if (existing[field] === cleanVal) {
      return res.json(existing);
    }

    const changes = [{ field, old: existing[field], new: cleanVal }];

    // Compute new needs_review status
    const pos = field === 'position' ? cleanVal : existing.position;
    const unit = field === 'unit' ? cleanVal : existing.unit;
    const needsReview = (!pos || !unit) ? 1 : 0;

    const stmt = db.prepare(`
      UPDATE employees
      SET ${field} = ?, needs_review = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(cleanVal, needsReview, id);

    logAudit(id, 'INLINE_UPDATE', changes, req.user);

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    console.error('Inline edit error:', err);
    return res.status(500).json({ error: 'Failed to update field.' });
  }
});

// POST /api/employees/:id/verify (Admin only)
router.post('/:id/verify', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const needsReview = (!emp.position || !emp.unit) ? 1 : 0;

    db.prepare(`
      UPDATE employees
      SET last_verified_at = datetime('now'), needs_review = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(needsReview, id);

    logAudit(id, 'VERIFY', [{ field: 'last_verified_at', old: emp.last_verified_at, new: 'Verified now' }], req.user);

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify employee record.' });
  }
});

// DELETE /api/employees/:id (Admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    logAudit(id, 'DELETE', [{ field: 'record', old: emp.full_name, new: 'DELETED' }], req.user);
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);

    return res.json({ success: true, message: `Employee ${emp.full_name} deleted.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete employee.' });
  }
});

// POST /api/employees/bulk (Admin only)
router.post('/bulk', requireRole('admin'), (req, res) => {
  try {
    const { action, ids, targetUnit, targetGroupId } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No employee IDs provided.' });
    }

    const transaction = db.transaction(() => {
      if (action === 'move_unit') {
        if (!targetUnit) throw new Error('Target unit is required');
        const update = db.prepare(`
          UPDATE employees
          SET unit = ?, needs_review = CASE WHEN position = '' THEN 1 ELSE 0 END, updated_at = datetime('now')
          WHERE id = ?
        `);
        for (const id of ids) {
          update.run(targetUnit.trim(), id);
          logAudit(id, 'BULK_MOVE_UNIT', [{ field: 'unit', old: 'bulk', new: targetUnit }], req.user);
        }
      } else if (action === 'add_group') {
        if (!targetGroupId) throw new Error('Target group is required');
        const insert = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
        for (const id of ids) {
          insert.run(id, targetGroupId);
          logAudit(id, 'BULK_ADD_GROUP', [{ field: 'group', old: null, new: `Group ID ${targetGroupId}` }], req.user);
        }
      } else if (action === 'verify') {
        const update = db.prepare(`
          UPDATE employees
          SET last_verified_at = datetime('now'),
              needs_review = CASE WHEN position = '' OR unit = '' THEN 1 ELSE 0 END,
              updated_at = datetime('now')
          WHERE id = ?
        `);
        for (const id of ids) {
          update.run(id);
          logAudit(id, 'BULK_VERIFY', [{ field: 'verified', old: null, new: 'Bulk verified' }], req.user);
        }
      } else if (action === 'delete') {
        const del = db.prepare('DELETE FROM employees WHERE id = ?');
        for (const id of ids) {
          logAudit(id, 'BULK_DELETE', [{ field: 'record', old: 'bulk', new: 'DELETED' }], req.user);
          del.run(id);
        }
      } else {
        throw new Error(`Unsupported bulk action: ${action}`);
      }
    });

    transaction();
    return res.json({ success: true, count: ids.length, action });
  } catch (err) {
    console.error('Bulk action error:', err);
    return res.status(500).json({ error: err.message || 'Bulk operation failed.' });
  }
});

module.exports = router;
