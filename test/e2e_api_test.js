const http = require('http');

const BASE_URL = 'http://localhost:4000/api';

async function req(endpoint, options = {}, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
  } else {
    const buffer = await res.arrayBuffer();
    return { status: res.status, ok: res.ok, size: buffer.byteLength };
  }
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE SUITE ---');

  // 1. Auth: Admin login
  console.log('1. Testing Admin Login...');
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  if (!adminLogin.ok || !adminLogin.data.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const adminToken = adminLogin.data.token;
  console.log('   Admin login OK! Role:', adminLogin.data.user.role);

  // 2. Auth: Viewer login
  console.log('2. Testing Viewer Login...');
  const viewerLogin = await req('/auth/login', {
    method: 'POST',
    body: { username: 'viewer', password: 'viewer123' }
  });
  if (!viewerLogin.ok) throw new Error('Viewer login failed');
  const viewerToken = viewerLogin.data.token;
  console.log('   Viewer login OK! Role:', viewerLogin.data.user.role);

  // 3. Employee Required Fields Enforcement
  console.log('3. Testing Required Fields Validation (Position & Unit)...');
  const failCreate = await req('/employees', {
    method: 'POST',
    body: { full_name: 'Test Person', position: '', unit: '' }
  }, adminToken);
  if (failCreate.status !== 400) {
    throw new Error('Expected 400 when missing position and unit, got: ' + failCreate.status);
  }
  console.log('   Required fields validation passed (returned 400 properly):', failCreate.data.error);

  // 4. Employee Creation & Name Normalization
  console.log('4. Testing Employee Creation & Name Normalization ("Juan dela Cruz" -> "DELA CRUZ, Juan")...');
  const createEmp = await req('/employees', {
    method: 'POST',
    body: {
      full_name: 'Juan dela Cruz',
      position: 'Senior Planning Officer',
      unit: 'Strategic Planning Office',
      location: '3rd Floor - Rm 305',
      email: 'juan.delacruz@office.gov'
    }
  }, adminToken);
  if (!createEmp.ok) throw new Error('Failed to create employee: ' + JSON.stringify(createEmp.data));
  console.log('   Created employee with normalized name:', createEmp.data.full_name);
  if (!createEmp.data.full_name.startsWith('DELA CRUZ')) {
    throw new Error('Name was not normalized to DELA CRUZ format: ' + createEmp.data.full_name);
  }
  const testEmpId = createEmp.data.id;

  // 5. Inline Edit & Recalculation
  console.log('5. Testing Inline Editing on Position...');
  const patchRes = await req(`/employees/${testEmpId}/inline`, {
    method: 'PATCH',
    body: { field: 'position', value: 'Chief Planning Officer' }
  }, adminToken);
  if (!patchRes.ok || patchRes.data.position !== 'Chief Planning Officer') {
    throw new Error('Inline patch failed');
  }
  console.log('   Inline update passed. New position:', patchRes.data.position);

  // 6. Verification
  console.log('6. Testing Last Verified At action...');
  const verifyRes = await req(`/employees/${testEmpId}/verify`, { method: 'POST' }, adminToken);
  if (!verifyRes.ok || !verifyRes.data.last_verified_at) throw new Error('Verify failed');
  console.log('   Verified passed at:', verifyRes.data.last_verified_at);

  // 7. Audit Trail
  console.log('7. Testing Audit Trail Retrieval...');
  const auditRes = await req(`/employees/${testEmpId}/audit`, {}, adminToken);
  if (!auditRes.ok || auditRes.data.length < 2) throw new Error('Audit trail incomplete: ' + auditRes.data.length);
  console.log(`   Audit trail OK! Found ${auditRes.data.length} audit records.`);

  // 8. Viewer Permissions (Viewer attempting to delete should be blocked 403)
  console.log('8. Testing Viewer Permission Protection (attempt delete)...');
  const blockedDelete = await req(`/employees/${testEmpId}`, { method: 'DELETE' }, viewerToken);
  if (blockedDelete.status !== 403) {
    throw new Error('Viewer was not blocked with 403 on delete! Status was: ' + blockedDelete.status);
  }
  console.log('   Security verification passed: Viewer received 403 Forbidden.');

  // 9. Groups Management
  console.log('9. Testing Group Creation and Member Enrollment...');
  const createGroup = await req('/groups', {
    method: 'POST',
    body: {
      name: 'Integration Test Taskforce',
      type: 'team',
      description: 'Temporary testing taskforce',
      memberIds: [testEmpId]
    }
  }, adminToken);
  if (!createGroup.ok) throw new Error('Failed to create group');
  console.log('   Group created OK! ID:', createGroup.data.id);

  // 10. Training Records & Automatic Quarter Derivation
  console.log('10. Testing Training Record Creation & Automatic Quarter Derivation...');
  const trainRes = await req('/training', {
    method: 'POST',
    body: {
      employeeId: testEmpId,
      title: 'Government Procurement Reform Workshop (RA 9184)',
      date: '2026-03-22',
      hours: 16,
      provider: 'Government Procurement Policy Board'
    }
  }, adminToken);
  if (!trainRes.ok || trainRes.data.quarter !== 'Q1 2026') {
    throw new Error('Quarter derivation failed. Expected "Q1 2026", got: ' + trainRes.data.quarter);
  }
  console.log('   Training record created OK! Quarter correctly derived:', trainRes.data.quarter);

  // 11. Excel & CSV Exports
  console.log('11. Testing Excel and CSV Export Endpoints...');
  const empXlsx = await req('/export/employees?format=xlsx', {}, viewerToken);
  if (!empXlsx.ok || empXlsx.size < 500) throw new Error('Employee Excel export invalid size: ' + empXlsx.size);
  console.log(`   Employee Directory Excel export OK (${empXlsx.size} bytes)`);

  const empCsv = await req('/export/employees?format=csv', {}, viewerToken);
  if (!empCsv.ok || empCsv.size < 200) throw new Error('Employee CSV export invalid size: ' + empCsv.size);
  console.log(`   Employee Directory CSV export OK (${empCsv.size} bytes)`);

  const trainXlsx = await req('/export/training?quarter=Q1%202026&format=xlsx', {}, viewerToken);
  if (!trainXlsx.ok || trainXlsx.size < 500) throw new Error('Training Report Excel export invalid size: ' + trainXlsx.size);
  console.log(`   Training Report Excel export OK (${trainXlsx.size} bytes)`);

  // Cleanup test employee
  await req(`/employees/${testEmpId}`, { method: 'DELETE' }, adminToken);
  console.log('   Cleaned up test employee.');

  console.log('--- ALL BACKEND & WORKFLOW TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
