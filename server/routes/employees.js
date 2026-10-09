const express = require('express');
const router = express.Router();
const { db, formatLocation, parseLocation, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { normalizeName } = require('../nameNormalizer');

// All routes require authentication
router.use(authMiddleware);

// GET /api/employees/summary - single source of truth for counts
router.get('/summary', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT
        SUM(CASE WHEN is_archived = 0 THEN 1 ELSE 0 END) as total,
        SUM(CASE WHEN is_archived = 0 AND status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_archived = 0 AND status = 'on leave' THEN 1 ELSE 0 END) as on_leave,
        SUM(CASE WHEN is_archived = 0 AND status = 'detached' THEN 1 ELSE 0 END) as detached,
        SUM(CASE WHEN is_archived = 0 AND needs_review = 1 THEN 1 ELSE 0 END) as needs_review,
        SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived
      FROM employees
    `).get();

    return res.json({
      total: summary.total || 0,
      active: summary.active || 0,
      on_leave: summary.on_leave || 0,
      detached: summary.detached || 0,
      needs_review: summary.needs_review || 0,
      archived: summary.archived || 0
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve summary counts.' });
  }
});

// GET /api/employees
router.get('/', (req, res) => {
  try {
    const {
      search,
      unit,
      groupId,
      status,
      tab,
      needsReview,
      archived,
      sortBy = 'full_name',
      sortOrder = 'asc'
    } = req.query;

    let query = `
      SELECT e.*,
        u.short_code as managed_short_code,
        u.name as managed_unit_name,
        u.default_floor as unit_default_floor,
        GROUP_CONCAT(DISTINCT g.name) AS group_names,
        GROUP_CONCAT(DISTINCT g.id) AS group_ids
      FROM employees e
      LEFT JOIN units u ON (e.unit_id = u.id OR e.unit_code = u.short_code OR e.unit = u.name)
      LEFT JOIN employee_groups eg ON e.id = eg.employee_id
      LEFT JOIN groups g ON eg.group_id = g.id
      WHERE 1=1
    `;
    const params = [];

    // Filter archived vs active
    if (tab === 'archived' || archived === 'true' || archived === '1') {
      query += ` AND e.is_archived = 1`;
    } else {
      query += ` AND e.is_archived = 0`;
    }

    // Quick view tab filter
    if (tab === 'needs_review' || needsReview === 'true' || needsReview === '1') {
      query += ` AND e.needs_review = 1`;
    } else if (tab === 'on_leave') {
      query += ` AND e.status = 'on leave'`;
    } else if (tab === 'detached') {
      query += ` AND e.status = 'detached'`;
    }

    if (status && status.trim() && !['all', 'needs_review', 'archived'].includes(status.toLowerCase())) {
      query += ` AND e.status = ?`;
      params.push(status.trim().toLowerCase());
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (e.full_name LIKE ? OR e.position LIKE ? OR e.unit LIKE ? OR e.unit_code LIKE ? OR e.email LIKE ? OR e.location LIKE ? OR e.room LIKE ? OR e.floor LIKE ?)`;
      params.push(term, term, term, term, term, term, term, term);
    }

    if (unit && unit.trim()) {
      query += ` AND (e.unit = ? OR e.unit_code = ? OR u.short_code = ?)`;
      params.push(unit.trim(), unit.trim(), unit.trim());
    }

    if (groupId) {
      query += ` AND e.id IN (SELECT employee_id FROM employee_groups WHERE group_id = ?)`;
      params.push(Number(groupId));
    }

    query += ` GROUP BY e.id`;

    const allowedSortCols = ['full_name', 'position', 'unit', 'unit_code', 'status', 'location', 'last_verified_at', 'created_at', 'needs_review'];
    const safeSortCol = allowedSortCols.includes(sortBy) ? sortBy : 'full_name';
    const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    query += ` ORDER BY e.${safeSortCol} ${safeSortOrder}`;

    const employees = db.prepare(query).all(...params);

    const formatted = employees.map(emp => {
      const unitCode = emp.unit_code || emp.managed_short_code || (emp.unit ? emp.unit.substring(0, 4).toUpperCase() : '');
      const unitName = emp.managed_unit_name || emp.unit || '';
      const formattedLoc = formatLocation(emp.floor, emp.room) || emp.location;
      const expectedFloor = emp.unit_default_floor || '';
      const locationMismatch = Boolean(emp.floor && expectedFloor && emp.floor.toLowerCase().trim() !== expectedFloor.toLowerCase().trim());

      return {
        ...emp,
        unit: unitName,
        unit_code: unitCode,
        location: formattedLoc,
        location_mismatch: locationMismatch,
        expected_floor: expectedFloor,
        needs_review: Boolean(emp.needs_review),
        is_archived: Boolean(emp.is_archived),
        groups: emp.group_names
          ? emp.group_names.split(',').map((name, i) => ({
              id: Number(emp.group_ids.split(',')[i]),
              name: name.trim()
            }))
          : []
      };
    });

    return res.json(formatted);
  } catch (err) {
    console.error('Fetch employees failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve employee directory.' });
  }
});

// GET /api/employees/units
router.get('/units', (req, res) => {
  try {
    const rows = db.prepare(`SELECT DISTINCT short_code, name, default_floor FROM units ORDER BY name ASC`).all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve units.' });
  }
});

// GET /api/employees/:id
router.get('/:id', (req, res) => {
  try {
    const emp = db.prepare(`
      SELECT e.*,
        u.short_code as managed_short_code,
        u.name as managed_unit_name,
        u.default_floor as unit_default_floor
      FROM employees e
      LEFT JOIN units u ON (e.unit_id = u.id OR e.unit_code = u.short_code OR e.unit = u.name)
      WHERE e.id = ?
    `).get(req.params.id);

    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const groups = db.prepare(`
      SELECT g.id, g.name, g.type FROM groups g
      JOIN employee_groups eg ON g.id = eg.group_id
      WHERE eg.employee_id = ?
    `).all(req.params.id);

    const training = db.prepare(`
      SELECT * FROM training_records WHERE employee_id = ? ORDER BY date DESC
    `).all(req.params.id);

    const unitCode = emp.unit_code || emp.managed_short_code || '';
    const unitName = emp.managed_unit_name || emp.unit || '';
    const formattedLoc = formatLocation(emp.floor, emp.room) || emp.location;
    const locationMismatch = Boolean(emp.floor && emp.unit_default_floor && emp.floor.toLowerCase().trim() !== emp.unit_default_floor.toLowerCase().trim());

    return res.json({
      ...emp,
      unit: unitName,
      unit_code: unitCode,
      location: formattedLoc,
      location_mismatch: locationMismatch,
      expected_floor: emp.unit_default_floor || '',
      needs_review: Boolean(emp.needs_review),
      is_archived: Boolean(emp.is_archived),
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
      unit_code,
      unit_id,
      floor,
      room,
      email,
      phone,
      status = 'active',
      notes = '',
      groupIds = []
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    const cleanPos = (position || '').trim();
    let cleanUnit = (unit || '').trim();
    let cleanCode = (unit_code || '').trim().toUpperCase();
    let cleanUnitId = unit_id || null;

    // Resolve unit from units table
    if (cleanUnitId) {
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE id = ?').get(cleanUnitId);
      if (u) {
        cleanUnit = u.name;
        cleanCode = u.short_code;
      }
    } else if (cleanCode) {
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE short_code = ?').get(cleanCode);
      if (u) {
        cleanUnitId = u.id;
        cleanUnit = u.name;
      }
    } else if (cleanUnit) {
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE name = ? COLLATE NOCASE').get(cleanUnit);
      if (u) {
        cleanUnitId = u.id;
        cleanCode = u.short_code;
      }
    }

    // Required fields rule
    if (!cleanPos || !cleanUnit) {
      return res.status(400).json({
        error: 'Both Position and Unit are required fields before saving a new employee record.'
      });
    }

    const cleanFloor = (floor || '').trim();
    const cleanRoom = (room || '').trim();
    const formattedLoc = formatLocation(cleanFloor, cleanRoom);
    const normalizedName = normalizeName(full_name);
    const needsReview = (!cleanPos || !cleanUnit) ? 1 : 0;

    const insert = db.prepare(`
      INSERT INTO employees (
        full_name, position, unit_id, unit, unit_code, floor, room, location,
        email, phone, status, needs_review, is_archived, last_verified_at, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), ?, datetime('now'), datetime('now'))
    `);

    const result = insert.run(
      normalizedName,
      cleanPos,
      cleanUnitId,
      cleanUnit,
      cleanCode,
      cleanFloor,
      cleanRoom,
      formattedLoc,
      (email || '').trim(),
      (phone || '').trim(),
      status,
      needsReview,
      (notes || '').trim()
    );

    const newId = result.lastInsertRowid;

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
      unit_code,
      unit_id,
      floor,
      room,
      email,
      phone,
      status,
      notes,
      groupIds
    } = req.body;

    const cleanPos = (position || '').trim();
    let cleanUnit = (unit || '').trim();
    let cleanCode = (unit_code || '').trim().toUpperCase();
    let cleanUnitId = unit_id || null;

    if (cleanUnitId) {
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE id = ?').get(cleanUnitId);
      if (u) {
        cleanUnit = u.name;
        cleanCode = u.short_code;
      }
    } else if (cleanCode) {
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE short_code = ?').get(cleanCode);
      if (u) {
        cleanUnitId = u.id;
        cleanUnit = u.name;
      }
    } else if (cleanUnit) {
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE name = ? COLLATE NOCASE').get(cleanUnit);
      if (u) {
        cleanUnitId = u.id;
        cleanCode = u.short_code;
      }
    }

    // Required fields rule
    if (!cleanPos || !cleanUnit) {
      return res.status(400).json({
        error: 'Both Position and Unit are required fields before saving.'
      });
    }

    const cleanFloor = (floor !== undefined ? floor : existing.floor || '').trim();
    const cleanRoom = (room !== undefined ? room : existing.room || '').trim();
    const formattedLoc = formatLocation(cleanFloor, cleanRoom);
    const normalizedName = normalizeName(full_name || existing.full_name);
    const needsReview = (!cleanPos || !cleanUnit) ? 1 : 0;

    const changes = [];
    const fieldsToCheck = [
      { key: 'full_name', val: normalizedName },
      { key: 'position', val: cleanPos },
      { key: 'unit', val: cleanUnit },
      { key: 'unit_code', val: cleanCode },
      { key: 'floor', val: cleanFloor },
      { key: 'room', val: cleanRoom },
      { key: 'location', val: formattedLoc },
      { key: 'email', val: (email || '').trim() },
      { key: 'phone', val: (phone || '').trim() },
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
      SET full_name = ?, position = ?, unit_id = ?, unit = ?, unit_code = ?,
          floor = ?, room = ?, location = ?, email = ?, phone = ?,
          status = ?, needs_review = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    update.run(
      normalizedName,
      cleanPos,
      cleanUnitId,
      cleanUnit,
      cleanCode,
      cleanFloor,
      cleanRoom,
      formattedLoc,
      (email || '').trim(),
      (phone || '').trim(),
      status || existing.status,
      needsReview,
      (notes || '').trim(),
      id
    );

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

// PATCH /api/employees/:id/inline (Admin only - quick fix)
router.patch('/:id/inline', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Employee not found.' });

    const { field, value } = req.body;
    const allowed = ['position', 'unit', 'unit_code', 'floor', 'room', 'status', 'email', 'phone'];
    if (!allowed.includes(field)) {
      return res.status(400).json({ error: `Field '${field}' is not editable inline.` });
    }

    const cleanVal = (value || '').trim();
    let pos = existing.position;
    let unit = existing.unit;
    let unitCode = existing.unit_code;
    let unitId = existing.unit_id;
    let floor = existing.floor;
    let room = existing.room;

    if (field === 'position') {
      pos = cleanVal;
    } else if (field === 'unit') {
      unit = cleanVal;
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE name = ? COLLATE NOCASE OR short_code = ?').get(cleanVal, cleanVal.toUpperCase());
      if (u) {
        unitId = u.id;
        unit = u.name;
        unitCode = u.short_code;
      }
    } else if (field === 'unit_code') {
      unitCode = cleanVal.toUpperCase();
      const u = db.prepare('SELECT id, name, short_code FROM units WHERE short_code = ?').get(unitCode);
      if (u) {
        unitId = u.id;
        unit = u.name;
      }
    } else if (field === 'floor') {
      floor = cleanVal;
    } else if (field === 'room') {
      room = cleanVal;
    }

    const location = formatLocation(floor, room);
    const needsReview = (!pos || !unit) ? 1 : 0;

    db.prepare(`
      UPDATE employees
      SET position = ?, unit_id = ?, unit = ?, unit_code = ?, floor = ?, room = ?, location = ?,
          needs_review = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(pos, unitId, unit, unitCode, floor, room, location, needsReview, id);

    logAudit(id, 'INLINE_UPDATE', [{ field, old: existing[field], new: cleanVal }], req.user);

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    console.error('Inline edit error:', err);
    return res.status(500).json({ error: 'Failed to update field.' });
  }
});

// POST /api/employees/:id/archive (Admin only - soft delete)
router.post('/:id/archive', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    db.prepare(`UPDATE employees SET is_archived = 1, updated_at = datetime('now') WHERE id = ?`).run(id);
    logAudit(id, 'ARCHIVE', [{ field: 'is_archived', old: 0, new: 1 }], req.user);

    return res.json({ success: true, message: `Archived ${emp.full_name}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to archive employee.' });
  }
});

// POST /api/employees/:id/restore (Admin only - restore soft deleted)
router.post('/:id/restore', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    db.prepare(`UPDATE employees SET is_archived = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
    logAudit(id, 'RESTORE', [{ field: 'is_archived', old: 1, new: 0 }], req.user);

    return res.json({ success: true, message: `Restored ${emp.full_name}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to restore employee.' });
  }
});

// DELETE /api/employees/:id (Admin only - permanent deletion)
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    logAudit(id, 'PERMANENT_DELETE', [{ field: 'record', old: emp.full_name, new: 'DELETED' }], req.user);
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);

    return res.json({ success: true, message: `Permanently deleted ${emp.full_name}.` });
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
        const u = db.prepare('SELECT id, name, short_code FROM units WHERE name = ? COLLATE NOCASE OR short_code = ?').get(targetUnit, targetUnit.toUpperCase());
        const unitName = u ? u.name : targetUnit.trim();
        const unitCode = u ? u.short_code : '';
        const unitId = u ? u.id : null;

        const update = db.prepare(`
          UPDATE employees
          SET unit = ?, unit_code = ?, unit_id = ?, needs_review = CASE WHEN position = '' THEN 1 ELSE 0 END, updated_at = datetime('now')
          WHERE id = ?
        `);
        for (const id of ids) {
          update.run(unitName, unitCode, unitId, id);
          logAudit(id, 'BULK_MOVE_UNIT', [{ field: 'unit', old: 'bulk', new: unitName }], req.user);
        }
      } else if (action === 'add_group') {
        if (!targetGroupId) throw new Error('Target group is required');
        const insert = db.prepare('INSERT OR IGNORE INTO employee_groups (employee_id, group_id) VALUES (?, ?)');
        for (const id of ids) {
          insert.run(id, targetGroupId);
          logAudit(id, 'BULK_ADD_GROUP', [{ field: 'group', old: null, new: `Group ID ${targetGroupId}` }], req.user);
        }
      } else if (action === 'remove_group') {
        if (!targetGroupId) throw new Error('Target group is required');
        const del = db.prepare('DELETE FROM employee_groups WHERE employee_id = ? AND group_id = ?');
        for (const id of ids) {
          del.run(id, targetGroupId);
          logAudit(id, 'BULK_REMOVE_GROUP', [{ field: 'group', old: `Group ID ${targetGroupId}`, new: 'Removed' }], req.user);
        }
      } else if (action === 'archive') {
        const update = db.prepare(`UPDATE employees SET is_archived = 1, updated_at = datetime('now') WHERE id = ?`);
        for (const id of ids) {
          update.run(id);
          logAudit(id, 'BULK_ARCHIVE', [{ field: 'is_archived', old: 0, new: 1 }], req.user);
        }
      } else if (action === 'restore') {
        const update = db.prepare(`UPDATE employees SET is_archived = 0, updated_at = datetime('now') WHERE id = ?`);
        for (const id of ids) {
          update.run(id);
          logAudit(id, 'BULK_RESTORE', [{ field: 'is_archived', old: 1, new: 0 }], req.user);
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
