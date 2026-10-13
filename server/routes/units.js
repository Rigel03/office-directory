const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// GET /api/units - list of managed units with member count
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT u.*, COUNT(e.id) as member_count
      FROM units u
      LEFT JOIN employees e ON (e.unit_id = u.id OR e.unit_code = u.short_code OR e.unit = u.name) AND e.is_archived = 0
      GROUP BY u.id
      ORDER BY u.name ASC
    `).all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve units.' });
  }
});

// GET /api/units/:code/structure - returns hierarchical sections, units, section heads, and member counts
router.get('/:code/structure', (req, res) => {
  try {
    const rawCode = req.params.code;
    const unit = db.prepare('SELECT * FROM units WHERE UPPER(short_code) = UPPER(?) OR UPPER(name) = UPPER(?)').get(rawCode, rawCode);
    if (!unit) return res.status(404).json({ error: 'Division not found' });

    const emps = db.prepare(`
      SELECT * FROM employees
      WHERE (unit_id = ? OR UPPER(unit_code) = UPPER(?) OR UPPER(unit) = UPPER(?))
        AND is_archived = 0
      ORDER BY full_name ASC
    `).all(unit.id, unit.short_code, unit.name);

    // Structure calculation per official specifications:
    // Section rows with no Unit count everyone whose primary Section matches (including people in its units).
    // Unit rows count primary members plus people who list that unit as a second assignment (Also Assigned To).
    const structureConfigs = [
      {
        section: 'Office of the Division Head',
        unit: '',
        defaultHead: 'SANTOS, Gina R.',
        isUnit: false
      },
      {
        section: 'Transport Planning',
        unit: '',
        defaultHead: 'PEREZ IV, Eduardo B.',
        isUnit: false
      },
      {
        section: 'Transport Planning',
        unit: 'Development Plans Unit',
        defaultHead: '',
        isUnit: true
      },
      {
        section: 'Transport Planning',
        unit: 'Research and Stats Unit',
        defaultHead: '',
        isUnit: true
      },
      {
        section: 'Transport Management',
        unit: '',
        defaultHead: 'GUTIERREZ, Tyrone D.',
        isUnit: false
      },
      {
        section: 'Transport Management',
        unit: 'Transport Services Unit',
        defaultHead: '',
        isUnit: true
      },
      {
        section: 'Transport Management',
        unit: 'Transport Systems Unit',
        defaultHead: '',
        isUnit: true
      },
      {
        section: 'Administrative Services',
        unit: '',
        defaultHead: 'ALVIOLA, Princess Guillen A.',
        isUnit: false
      }
    ];

    const sections = structureConfigs.map(cfg => {
      let matchedMembers = [];

      if (!cfg.isUnit) {
        // Section: counts everyone whose primary section matches
        matchedMembers = emps.filter(e => (e.section || '').trim().toLowerCase() === cfg.section.toLowerCase());
      } else {
        // Unit: primary sub_unit match OR secondary assignment in Also Assigned To
        matchedMembers = emps.filter(e => {
          const inSubUnit = (e.sub_unit || '').trim().toLowerCase() === cfg.unit.toLowerCase();
          const inSecondary = (e.also_assigned_to || '').toLowerCase().includes(cfg.unit.toLowerCase());
          return inSubUnit || inSecondary;
        });
      }

      // Find head of section
      const headEmp = emps.find(e =>
        (e.role === 'Division Head' || e.role === 'Section Head') &&
        (e.section || '').trim().toLowerCase() === cfg.section.toLowerCase() &&
        !cfg.isUnit
      ) || (cfg.defaultHead ? emps.find(e => e.full_name === cfg.defaultHead) : null);

      const headName = headEmp
        ? (headEmp.title ? `${headEmp.title} ${headEmp.full_name}` : headEmp.full_name)
        : '';

      return {
        section: cfg.section,
        unit: cfg.unit,
        displayName: cfg.unit ? cfg.unit : cfg.section,
        head: headName,
        headRaw: headEmp ? headEmp.full_name : '',
        membersCount: matchedMembers.length,
        members: matchedMembers
      };
    });

    return res.json({
      unit,
      totalCount: emps.length,
      sections
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve structure: ' + err.message });
  }
});

// GET /api/units/rooms - list of managed rooms
router.get('/rooms', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM rooms ORDER BY floor ASC, name ASC').all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve rooms.' });
  }
});

// POST /api/units/rooms - add a new room (Admin only)
router.post('/rooms', requireRole('admin'), (req, res) => {
  try {
    const { name, floor } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Room name is required.' });
    }
    const cleanName = name.trim();
    const cleanFloor = (floor || '').trim();

    const existing = db.prepare('SELECT * FROM rooms WHERE name = ? COLLATE NOCASE').get(cleanName);
    if (existing) {
      return res.json(existing);
    }

    const insert = db.prepare('INSERT INTO rooms (name, floor) VALUES (?, ?)');
    const result = insert.run(cleanName, cleanFloor);
    const created = db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create room.' });
  }
});

// POST /api/units - create unit (Admin only)
router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { name, short_code, default_floor = '', description = '' } = req.body;
    if (!name || !name.trim() || !short_code || !short_code.trim()) {
      return res.status(400).json({ error: 'Both name and short_code are required.' });
    }

    const cleanName = name.trim();
    const cleanCode = short_code.trim().toUpperCase();

    const insert = db.prepare(`
      INSERT INTO units (name, short_code, default_floor, description)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(cleanName, cleanCode, (default_floor || '').trim(), (description || '').trim());
    const created = db.prepare('SELECT * FROM units WHERE id = ?').get(result.lastInsertRowid);

    logAudit(null, 'CREATE_UNIT', [{ field: 'unit', old: null, new: `${cleanCode} - ${cleanName}` }], req.user);
    return res.status(201).json(created);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A unit with this name or code already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create unit: ' + err.message });
  }
});

// PUT /api/units/:id - update unit (Admin only)
router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Unit not found.' });

    const { name, short_code, default_floor = '', description = '' } = req.body;
    const cleanName = (name || existing.name).trim();
    const cleanCode = (short_code || existing.short_code).trim().toUpperCase();

    const update = db.prepare(`
      UPDATE units
      SET name = ?, short_code = ?, default_floor = ?, description = ?
      WHERE id = ?
    `);
    update.run(cleanName, cleanCode, (default_floor || '').trim(), (description || '').trim(), id);

    // Also cascade update employees using this unit
    db.prepare(`
      UPDATE employees
      SET unit = ?, unit_code = ?
      WHERE unit_id = ? OR unit = ?
    `).run(cleanName, cleanCode, id, existing.name);

    logAudit(null, 'UPDATE_UNIT', [
      { field: 'unit', old: `${existing.short_code} - ${existing.name}`, new: `${cleanCode} - ${cleanName}` }
    ], req.user);

    const updated = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update unit: ' + err.message });
  }
});

// DELETE /api/units/:id - delete unit (Admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Unit not found.' });

    // Set employee unit fields to empty and flag for review
    db.prepare(`
      UPDATE employees
      SET unit_id = NULL, unit = '', unit_code = '', needs_review = 1
      WHERE unit_id = ? OR unit = ?
    `).run(id, existing.name);

    db.prepare('DELETE FROM units WHERE id = ?').run(id);

    logAudit(null, 'DELETE_UNIT', [{ field: 'unit', old: existing.name, new: 'DELETED' }], req.user);
    return res.json({ success: true, message: `Unit ${existing.name} removed.` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete unit: ' + err.message });
  }
});

module.exports = router;
