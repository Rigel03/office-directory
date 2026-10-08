const express = require('express');
const router = express.Router();
const { db, calculateQuarter } = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// GET /api/training
router.get('/', (req, res) => {
  try {
    const { quarter, unit, groupId, employeeId, search } = req.query;

    let query = `
      SELECT t.*,
             e.full_name,
             e.position,
             e.unit,
             e.status as employee_status
      FROM training_records t
      JOIN employees e ON t.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (quarter) {
      query += ` AND t.quarter = ?`;
      params.push(quarter);
    }

    if (unit) {
      query += ` AND e.unit = ?`;
      params.push(unit);
    }

    if (employeeId) {
      query += ` AND t.employee_id = ?`;
      params.push(employeeId);
    }

    if (groupId) {
      query += ` AND e.id IN (SELECT employee_id FROM employee_groups WHERE group_id = ?)`;
      params.push(groupId);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (t.title LIKE ? OR e.full_name LIKE ? OR t.provider LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY t.date DESC, t.id DESC`;

    const records = db.prepare(query).all(...params);
    return res.json(records);
  } catch (err) {
    console.error('Fetch training records failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve training records.' });
  }
});

// GET /api/training/quarters
router.get('/quarters', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT quarter FROM training_records ORDER BY quarter DESC').all();
    return res.json(rows.map(r => r.quarter));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve quarters.' });
  }
});

// POST /api/training (single employee)
router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { employeeId, title, date, hours, provider } = req.body;
    if (!employeeId || !title || !date || hours == null) {
      return res.status(400).json({ error: 'employeeId, title, date, and hours are required.' });
    }

    const quarter = calculateQuarter(date);
    const insert = db.prepare(`
      INSERT INTO training_records (employee_id, title, date, hours, provider, quarter)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      employeeId,
      title.trim(),
      date,
      Number(hours),
      (provider || '').trim(),
      quarter
    );

    const created = db.prepare(`
      SELECT t.*, e.full_name, e.position, e.unit
      FROM training_records t
      JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save training record.' });
  }
});

// POST /api/training/bulk (bulk add to group or list of employees)
router.post('/bulk', requireRole('admin'), (req, res) => {
  try {
    const { groupId, employeeIds, title, date, hours, provider } = req.body;

    if (!title || !date || hours == null) {
      return res.status(400).json({ error: 'title, date, and hours are required.' });
    }

    let targetIds = [];

    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      targetIds = employeeIds;
    } else if (groupId) {
      const members = db.prepare('SELECT employee_id FROM employee_groups WHERE group_id = ?').all(groupId);
      targetIds = members.map(m => m.employee_id);
    }

    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'No recipients selected for bulk training record.' });
    }

    const quarter = calculateQuarter(date);
    const numHours = Number(hours);
    const cleanTitle = title.trim();
    const cleanProvider = (provider || '').trim();

    const insert = db.prepare(`
      INSERT INTO training_records (employee_id, title, date, hours, provider, quarter)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const id of targetIds) {
        insert.run(id, cleanTitle, date, numHours, cleanProvider, quarter);
      }
    });

    transaction();

    return res.json({
      success: true,
      count: targetIds.length,
      quarter,
      message: `Added training to ${targetIds.length} employee records.`
    });
  } catch (err) {
    console.error('Bulk training error:', err);
    return res.status(500).json({ error: 'Failed to bulk-add training records.' });
  }
});

// DELETE /api/training/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM training_records WHERE id = ?').run(req.params.id);
    return res.json({ success: true, message: 'Training record deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete training record.' });
  }
});

module.exports = router;
