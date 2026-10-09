const { db, formatLocation, parseLocation } = require('./db');
const { generateToken } = require('./auth');
const http = require('http');
const express = require('express');

// Create test server instance or test directly against express routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const unitRoutes = require('./routes/units');
const importRoutes = require('./routes/import');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/import', importRoutes);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  async function req(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    let data;
    try { data = await res.json(); } catch(e) { data = null; }
    return { status: res.status, data };
  }

  try {
    console.log('--- RUNNING IMPROVEMENTS VERIFICATION TESTS ---');

    // 1. Auth & Access Control
    const adminLogin = await req('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
    const viewerLogin = await req('/auth/login', 'POST', { username: 'viewer', password: 'viewer123' });
    const adminToken = adminLogin.data.token;
    const viewerToken = viewerLogin.data.token;

    console.log('✓ Admin and Viewer logins successful');

    // Test Viewer permissions enforcement (Spec 1)
    const viewerCreate = await req('/employees', 'POST', { full_name: 'Hacker, Test', position: 'Test', unit: 'IT Services' }, viewerToken);
    if (viewerCreate.status !== 403) throw new Error(`Expected 403 for viewer create, got ${viewerCreate.status}`);

    const viewerPut = await req('/employees/1', 'PUT', { full_name: 'Changed, Name', position: 'Boss', unit: 'OPS' }, viewerToken);
    if (viewerPut.status !== 403) throw new Error(`Expected 403 for viewer update, got ${viewerPut.status}`);

    const viewerDelete = await req('/employees/1', 'DELETE', null, viewerToken);
    if (viewerDelete.status !== 403) throw new Error(`Expected 403 for viewer delete, got ${viewerDelete.status}`);

    const viewerBulk = await req('/employees/bulk', 'POST', { action: 'delete', ids: [1] }, viewerToken);
    if (viewerBulk.status !== 403) throw new Error(`Expected 403 for viewer bulk action, got ${viewerBulk.status}`);

    console.log('✓ Viewer is strictly blocked from all mutating endpoints (403 Forbidden)');

    // 2. Summary Counts Reconcile (Spec 4)
    const summary = await req('/employees/summary', 'GET', null, viewerToken);
    const { total, active, on_leave, detached, needs_review, archived } = summary.data;
    console.log('Summary counts:', summary.data);

    if (active + on_leave + detached !== total) {
      throw new Error(`Counts do not reconcile: active(${active}) + on_leave(${on_leave}) + detached(${detached}) !== total(${total})`);
    }
    console.log(`✓ Counts strictly reconcile: Active (${active}) + On Leave (${on_leave}) + Detached (${detached}) = Total (${total})`);

    // 3. Structured Location & Unit consistency (Spec 2 & 3)
    const empList = await req('/employees', 'GET', null, viewerToken);
    const employees = empList.data;
    console.log(`✓ Fetched ${employees.length} employees`);

    // Verify short code and formatted location
    const santos = employees.find(e => e.full_name.includes('SANTOS'));
    if (!santos || santos.unit_code !== 'TPMD' || santos.location !== '4th Floor · TPMD Urban Transport Bay') {
      throw new Error(`Santos structured data mismatch: unit_code=${santos?.unit_code}, location=${santos?.location}`);
    }
    console.log(`✓ Santos short code=${santos.unit_code}, location="${santos.location}"`);

    // Verify soft location mismatch warning
    const gabriel = employees.find(e => e.full_name.includes('VILLANUEVA'));
    if (!gabriel || !gabriel.location_mismatch) {
      throw new Error('Expected Gabriel Villanueva to have location_mismatch = true');
    }
    console.log(`✓ Soft warning verified: Gabriel Villanueva (unit ${gabriel.unit_code}, expected floor ${gabriel.expected_floor}, actual floor ${gabriel.floor}) -> location_mismatch = true`);

    // 4. Archive & Restore (Spec 8)
    const initialTotal = total;
    const archiveRes = await req('/employees/1/archive', 'POST', null, adminToken);
    if (archiveRes.status !== 200) throw new Error('Archive failed: ' + JSON.stringify(archiveRes.data));

    const afterArchiveSummary = await req('/employees/summary', 'GET', null, adminToken);
    if (afterArchiveSummary.data.total !== initialTotal - 1 || afterArchiveSummary.data.archived !== 1) {
      throw new Error(`Summary after archive unexpected: total=${afterArchiveSummary.data.total}, archived=${afterArchiveSummary.data.archived}`);
    }

    // Verify employee 1 appears in archived list
    const archivedList = await req('/employees?tab=archived', 'GET', null, adminToken);
    if (!archivedList.data.some(e => e.id === 1)) {
      throw new Error('Employee 1 not found in archived list');
    }

    // Restore employee 1
    const restoreRes = await req('/employees/1/restore', 'POST', null, adminToken);
    if (restoreRes.status !== 200) throw new Error('Restore failed');

    const afterRestoreSummary = await req('/employees/summary', 'GET', null, adminToken);
    if (afterRestoreSummary.data.total !== initialTotal || afterRestoreSummary.data.archived !== 0) {
      throw new Error('Summary after restore did not match original');
    }
    console.log('✓ Archive and restore verified successfully');

    // 5. Test Location Parser
    const p1 = parseLocation('4th Floor · Room 408');
    if (p1.floor !== '4th Floor' || p1.room !== 'Room 408') throw new Error('parseLocation failed for delimiter');
    const p2 = parseLocation('2nd Floor - HR Bay 4');
    if (p2.floor !== '2nd Floor' || p2.room !== 'HR Bay 4') throw new Error('parseLocation failed for dash');
    console.log('✓ parseLocation parsed messy locations accurately');

    console.log('\nALL IMPROVEMENTS VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
