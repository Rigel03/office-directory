const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Papa = require('papaparse');
const { db, formatLocation, parseLocation, logAudit } = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const { normalizeName, findDuplicates } = require('../nameNormalizer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.use(authMiddleware);

const STANDARD_FLOORS = ['Ground Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', 'Basement'];

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
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
        if (rawRows.length > 0) {
          headers = Object.keys(rawRows[0]);
        }
      }
    } else if (req.body.pastedData) {
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

    const existingEmployees = db.prepare('SELECT id, full_name, email, phone, position, unit, location FROM employees WHERE is_archived = 0').all();
    const managedUnits = db.prepare('SELECT id, name, short_code, default_floor FROM units').all();

    const processedRows = [];
    let duplicateCount = 0;
    let missingInfoCount = 0;
    let unmatchedLocationCount = 0;
    let unmatchedUnitCount = 0;

    rawRows.forEach((raw, idx) => {
      const rawName = mapping.full_name ? String(raw[mapping.full_name] || '').trim() : '';
      if (!rawName) return;

      const rawPos = mapping.position ? String(raw[mapping.position] || '').trim() : '';
      const rawUnit = mapping.unit ? String(raw[mapping.unit] || '').trim() : '';
      const rawEmail = mapping.email ? String(raw[mapping.email] || '').trim() : '';
      const rawPhone = mapping.phone ? String(raw[mapping.phone] || '').trim() : '';
      const rawLoc = mapping.location ? String(raw[mapping.location] || '').trim() : '';
      const rawStat = mapping.status ? String(raw[mapping.status] || '').trim().toLowerCase() : 'active';
      const rawNotes = mapping.notes ? String(raw[mapping.notes] || '').trim() : '';

      const validStat = ['active', 'on leave', 'detached'].includes(rawStat) ? rawStat : 'active';
      const normalizedName = normalizeName(rawName);

      // Location parsing & matching
      let parsedLoc = parseLocation(rawLoc);
      let floorMatched = false;
      let matchedFloor = '';
      if (parsedLoc.floor) {
        const found = STANDARD_FLOORS.find(f => f.toLowerCase() === parsedLoc.floor.toLowerCase());
        if (found) {
          floorMatched = true;
          matchedFloor = found;
        }
      }
      const unmatchedLocation = Boolean(rawLoc && (!floorMatched || !parsedLoc.room));
      if (unmatchedLocation) unmatchedLocationCount++;

      // Unit matching
      let matchedUnit = null;
      if (rawUnit) {
        matchedUnit = managedUnits.find(u =>
          u.name.toLowerCase() === rawUnit.toLowerCase() ||
          u.short_code.toLowerCase() === rawUnit.toLowerCase() ||
          rawUnit.toLowerCase().includes(u.short_code.toLowerCase())
        );
      }
      const unmatchedUnit = Boolean(rawUnit && !matchedUnit);
      if (unmatchedUnit) unmatchedUnitCount++;

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
          unit: matchedUnit ? matchedUnit.name : rawUnit,
          unit_code: matchedUnit ? matchedUnit.short_code : '',
          unit_id: matchedUnit ? matchedUnit.id : null,
          floor: matchedFloor || parsedLoc.floor,
          room: parsedLoc.room,
          location: formatLocation(matchedFloor || parsedLoc.floor, parsedLoc.room) || rawLoc,
          raw_location: rawLoc,
          email: rawEmail,
          phone: rawPhone,
          status: validStat,
          notes: rawNotes,
          needs_review: missingFields.length > 0
        },
        missingFields,
        hasMissingFields: missingFields.length > 0,
        unmatchedLocation,
        unmatchedUnit,
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
      unmatchedLocationCount,
      unmatchedUnitCount,
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
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided to import.' });
    }

    let createdCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;

    const managedUnits = db.prepare('SELECT id, name, short_code, default_floor FROM units').all();

    const transaction = db.transaction(() => {
      const insertEmp = db.prepare(`
        INSERT INTO employees (
          full_name, position, unit_id, unit, unit_code, floor, room, location,
          email, phone, status, needs_review, is_archived, last_verified_at, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), ?, datetime('now'), datetime('now'))
      `);

      const updateEmp = db.prepare(`
        UPDATE employees
        SET position = CASE WHEN position = '' OR position IS NULL THEN ? ELSE position END,
            unit = CASE WHEN unit = '' OR unit IS NULL THEN ? ELSE unit END,
            unit_code = CASE WHEN unit_code = '' OR unit_code IS NULL THEN ? ELSE unit_code END,
            unit_id = CASE WHEN unit_id IS NULL THEN ? ELSE unit_id END,
            floor = CASE WHEN floor = '' OR floor IS NULL THEN ? ELSE floor END,
            room = CASE WHEN room = '' OR room IS NULL THEN ? ELSE room END,
            location = CASE WHEN location = '' OR location IS NULL THEN ? ELSE location END,
            email = CASE WHEN email = '' OR email IS NULL THEN ? ELSE email END,
            phone = CASE WHEN phone = '' OR phone IS NULL THEN ? ELSE phone END,
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
        let unit = (d.unit || '').trim();
        let unitCode = (d.unit_code || '').trim().toUpperCase();
        let unitId = d.unit_id || null;

        // Resolve unit
        if (!unitId && unit) {
          const match = managedUnits.find(u => u.name.toLowerCase() === unit.toLowerCase() || u.short_code.toLowerCase() === unit.toLowerCase());
          if (match) {
            unitId = match.id;
            unit = match.name;
            unitCode = match.short_code;
          }
        }

        const floor = (d.floor || '').trim();
        const room = (d.room || '').trim();
        const loc = formatLocation(floor, room) || (d.location || '').trim();
        const needsReview = (!pos || !unit) ? 1 : 0;

        if (item.action === 'merge' && item.targetEmployeeId) {
          updateEmp.run(
            pos,
            unit,
            unitCode,
            unitId,
            floor,
            room,
            loc,
            (d.email || '').trim(),
            (d.phone || '').trim(),
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
          const result = insertEmp.run(
            normName,
            pos,
            unitId,
            unit,
            unitCode,
            floor,
            room,
            loc,
            (d.email || '').trim(),
            (d.phone || '').trim(),
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
