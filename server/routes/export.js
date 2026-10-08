const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const Papa = require('papaparse');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

// Available to both Admin and Viewer
router.use(authMiddleware);

// GET /api/export/employees
router.get('/employees', (req, res) => {
  try {
    const {
      search,
      unit,
      groupId,
      status,
      needsReview,
      ids,
      format = 'xlsx'
    } = req.query;

    let query = `
      SELECT e.id, e.full_name, e.position, e.unit, e.email, e.phone, e.location,
             e.status, e.needs_review, e.last_verified_at, e.notes,
             GROUP_CONCAT(DISTINCT g.name) AS groups
      FROM employees e
      LEFT JOIN employee_groups eg ON e.id = eg.employee_id
      LEFT JOIN groups g ON eg.group_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean);
      if (idList.length > 0) {
        query += ` AND e.id IN (${idList.map(() => '?').join(',')})`;
        params.push(...idList);
      }
    } else {
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
    }

    query += ` GROUP BY e.id ORDER BY e.full_name ASC`;

    const rows = db.prepare(query).all(...params);

    const exportData = rows.map((r, idx) => ({
      '#': idx + 1,
      'Full Name': r.full_name,
      'Position': r.position || '(Missing)',
      'Unit / Division': r.unit || '(Missing)',
      'Email': r.email,
      'Phone': r.phone,
      'Office Location': r.location,
      'Status': r.status,
      'Needs Review': r.needs_review ? 'YES' : 'NO',
      'Assigned Groups': r.groups || '',
      'Last Verified': r.last_verified_at || 'Never',
      'Notes': r.notes || ''
    }));

    const filename = `Employee_Directory_${new Date().toISOString().slice(0, 10)}`;

    if (format.toLowerCase() === 'csv') {
      const csv = Papa.unparse(exportData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    // Default: Excel (.xlsx)
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    // Auto-fit column widths
    const colWidths = [
      { wch: 5 }, { wch: 26 }, { wch: 28 }, { wch: 24 }, { wch: 26 },
      { wch: 15 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 30 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Employee Directory');
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ error: 'Failed to generate export file.' });
  }
});

// GET /api/export/training
router.get('/training', (req, res) => {
  try {
    const { quarter, unit, groupId, format = 'xlsx' } = req.query;

    let query = `
      SELECT t.id, t.title, t.date, t.hours, t.provider, t.quarter,
             e.full_name, e.position, e.unit
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
    if (groupId) {
      query += ` AND e.id IN (SELECT employee_id FROM employee_groups WHERE group_id = ?)`;
      params.push(Number(groupId));
    }

    query += ` ORDER BY t.date DESC, e.full_name ASC`;

    const rows = db.prepare(query).all(...params);

    const exportData = rows.map((r, idx) => ({
      '#': idx + 1,
      'Employee Name': r.full_name,
      'Position': r.position || '(Missing)',
      'Unit / Division': r.unit || '(Missing)',
      'Training Course / Title': r.title,
      'Date': r.date,
      'Hours': r.hours,
      'Provider / Institution': r.provider || '',
      'Quarter': r.quarter
    }));

    const cleanQ = (quarter || 'All_Quarters').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Training_Report_${cleanQ}_${new Date().toISOString().slice(0, 10)}`;

    if (format.toLowerCase() === 'csv') {
      const csv = Papa.unparse(exportData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 26 }, { wch: 28 }, { wch: 24 }, { wch: 38 },
      { wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 12 }
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Training Report');
    const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export training error:', err);
    return res.status(500).json({ error: 'Failed to generate training report export.' });
  }
});

module.exports = router;
