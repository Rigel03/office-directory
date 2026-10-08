const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Papa = require('papaparse');
const { db, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { normalizeName, findDuplicates } = require('../nameNormalizer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.use(authMiddleware);

// Detect best column match based on common header names
function autoDetectMapping(headers) {
  const mapping = {
    full_name: '',
    position: '',
    unit: '',
    email: '',
    phone: '',
    location: '',
    status: '',
    notes: ''
  };

  const clean = h => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  headers.forEach(h => {
    const c = clean(h);
    if (!mapping.full_name && (c.includes('fullname') || c.includes('employeename') || c === 'name' || c.includes('staffname'))) {
      mapping.full_name = h;
    } else if (!mapping.position && (c.includes('position') || c.includes('jobtitle') || c.includes('designation') || c === 'title')) {
      mapping.position = h;
    } else if (!mapping.unit && (c.includes('unit') || c.includes('division') || c.includes('department') || c.includes('dept') || c.includes('office') || c.includes('section'))) {
      mapping.unit = h;
    } else if (!mapping.email && (c.includes('email') || c.includes('mail'))) {
      mapping.email = h;
    } else if (!mapping.phone && (c.includes('phone') || c.includes('contact') || c.includes('tel') || c.includes('mobile') || c.includes('ext'))) {
      mapping.phone = h;
    } else if (!mapping.location && (c.includes('location') || c.includes('room') || c.includes('floor') || c.includes('desk') || c.includes('station'))) {
      mapping.location = h;
    } else if (!mapping.status && (c.includes('status') || c.includes('state'))) {
      mapping.status = h;
    } else if (!mapping.notes && (c.includes('notes') || c.includes('remarks') || c.includes('comments'))) {
      mapping.notes = h;
    }
  });

  return mapping;
}

// POST /api/import/preview (Admin only)
router.post('/preview', requireRole('admin'), upload.single('file'), (req, res) => {
  try {
    let rawRows = [];
    let headers = [];

    if (req.file) {
      const originalName = req.file.originalname.toLowerCase();
      if (originalName.endsWith('.csv') || originalName.endsWith('.txt')) {
        const csvContent = req.file.buffer.toString('utf-8');
        const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
        headers = parsed.meta.fields || [];
        rawRows = parsed.data;
      } else {
        // Excel file (.xlsx, .xls)
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
        if (rawRows.length > 0) {
          headers = Object.keys(rawRows[0]);
        }
      }
    } else if (req.body.pastedData) {
      // Direct pasted CSV or TSV text
      const parsed = Papa.parse(req.body.pastedData.trim(), { header: true, skipEmptyLines: true });
      headers = parsed.meta.fields || [];
      rawRows = parsed.data;
    } else {
      return res.status(400).json({ error: 'Please upload a CSV/Excel file or paste spreadsheet data.' });
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded file or text contains no data rows.' });
    }

    const mapping = req.body.columnMapping ? JSON.parse(req.body.columnMapping) : autoDetectMapping(headers);

    // Fetch existing employees to run duplicate detection
    const existingEmployees = db.prepare('SELECT id, full_name, email, phone, position, unit, location FROM employees').all();

    const processedRows = [];
    let duplicateCount = 0;
    let missingInfoCount = 0;

    rawRows.forEach((raw, idx) => {
      const rawName = mapping.full_name ? String(raw[mapping.full_name] || '').trim() : '';
      if (!rawName) return; // Skip rows with no name

      const rawPos = mapping.position ? String(raw[mapping.position] || '').trim() : '';
      const rawUnit = mapping.unit ? String(raw[mapping.unit] || '').trim() : '';
      const rawEmail = mapping.email ? String(raw[mapping.email] || '').trim() : '';
      const rawPhone = mapping.phone ? String(raw[mapping.phone] || '').trim() : '';
      const rawLoc = mapping.location ? String(raw[mapping.location] || '').trim() : '';
      const rawStat = mapping.status ? String(raw[mapping.status] || '').trim().toLowerCase() : 'active';
      const rawNotes = mapping.notes ? String(raw[mapping.notes] || '').trim() : '';

      const validStat = ['active', 'on leave', 'detached'].includes(rawStat) ? rawStat : 'active';
      const normalizedName = normalizeName(rawName);

      const missingFields = [];
      if (!rawPos) missingFields.push('position');
      if (!rawUnit) missingFields.push('unit');

      if (missingFields.length > 0) {
        missingInfoCount++;
      }

      const dupes = findDuplicates(
        { full_name: normalizedName, email: rawEmail, phone: rawPhone },
        existingEmployees
      );

      const isDuplicate = dupes.length > 0;
      if (isDuplicate) duplicateCount++;

      processedRows.push({
        rowIndex: idx + 1,
        raw,
        normalized: {
          full_name: normalizedName,
          original_name: rawName,
          position: rawPos,
          unit: rawUnit,
          email: rawEmail,
          phone: rawPhone,
          location: rawLoc,
          status: validStat,
          notes: rawNotes,
          needs_review: missingFields.length > 0
        },
        missingFields,
        hasMissingFields: missingFields.length > 0,
        duplicates: dupes.map(d => ({
          existingId: d.existing.id,
          existingName: d.existing.full_name,
          existingPosition: d.existing.position,
          existingUnit: d.existing.unit,
          score: d.score,
          reasons: d.reasons
        }))
      });
    });

    return res.json({
      headers,
      suggestedMapping: mapping,
      totalRows: processedRows.length,
      missingInfoCount,
      duplicateCount,
      rows: processedRows
    });
  } catch (err) {
    console.error('Import preview error:', err);
    return res.status(500).json({ error: 'Failed to process import file: ' + err.message });
  }
});

// POST /api/import/commit (Admin only)
router.post('/commit', requireRole('admin'), (req, res) => {
  try {
    const { items } = req.body;
    // items: Array of {
    //   action: 'create' | 'merge' | 'skip',
    //   targetEmployeeId?: number,
    //   data: { full_name, position, unit, email, phone, location, status, notes }
    // }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided to import.' });
    }

    let createdCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;

    const transaction = db.transaction(() => {
      const insertEmp = db.prepare(`
        INSERT INTO employees (
          full_name, position, unit, email, phone, location, status,
          needs_review, last_verified_at, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
      `);

      const updateEmp = db.prepare(`
        UPDATE employees
        SET position = CASE WHEN position = '' OR position IS NULL THEN ? ELSE position END,
            unit = CASE WHEN unit = '' OR unit IS NULL THEN ? ELSE unit END,
            email = CASE WHEN email = '' OR email IS NULL THEN ? ELSE email END,
            phone = CASE WHEN phone = '' OR phone IS NULL THEN ? ELSE phone END,
            location = CASE WHEN location = '' OR location IS NULL THEN ? ELSE location END,
            notes = CASE WHEN notes = '' OR notes IS NULL THEN ? ELSE notes || ' | ' || ? END,
            needs_review = CASE WHEN (CASE WHEN position = '' THEN ? ELSE position END) = '' OR (CASE WHEN unit = '' THEN ? ELSE unit END) = '' THEN 1 ELSE 0 END,
            updated_at = datetime('now')
        WHERE id = ?
      `);

      for (const item of items) {
        if (item.action === 'skip') {
          skippedCount++;
          continue;
        }

        const d = item.data;
        const normName = normalizeName(d.full_name || d.name);
        const pos = (d.position || '').trim();
        const unit = (d.unit || '').trim();
        const needsReview = (!pos || !unit) ? 1 : 0;

        if (item.action === 'merge' && item.targetEmployeeId) {
          updateEmp.run(
            pos,
            unit,
            (d.email || '').trim(),
            (d.phone || '').trim(),
            (d.location || '').trim(),
            (d.notes || '').trim(),
            (d.notes || '').trim(),
            pos,
            unit,
            item.targetEmployeeId
          );
          logAudit(item.targetEmployeeId, 'IMPORT_MERGE', [
            { field: 'record', old: 'existing', new: `Merged imported data from ${normName}` }
          ], req.user);
          mergedCount++;
        } else {
          // Default: create new record
          const result = insertEmp.run(
            normName,
            pos,
            unit,
            (d.email || '').trim(),
            (d.phone || '').trim(),
            (d.location || '').trim(),
            d.status || 'active',
            needsReview,
            (d.notes || '').trim()
          );
          logAudit(result.lastInsertRowid, 'IMPORT_CREATE', [
            { field: 'record', old: null, new: `Imported ${normName}` }
          ], req.user);
          createdCount++;
        }
      }
    });

    transaction();

    return res.json({
      success: true,
      createdCount,
      mergedCount,
      skippedCount,
      totalProcessed: items.length
    });
  } catch (err) {
    console.error('Import commit error:', err);
    return res.status(500).json({ error: 'Failed to commit import: ' + err.message });
  }
});

module.exports = router;
