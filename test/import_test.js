const BASE_URL = 'http://localhost:4000/api';

async function testImport() {
  console.log('--- TESTING IMPORT WORKFLOW ---');

  // 1. Login as Admin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();

  // 2. Upload / Preview with messy data (quoted strings for names containing commas)
  const messyCsv = `Employee Name,Designation,Department,Email Address,Desk Room
"Dela Cruz, J.",Junior Staff,Human Resources,j.delacruz@office.gov,2nd Floor - HR Bay 4
Torres, Miguel A.,Budget Analyst II,Finance & Budget,m.torres@office.gov,3rd Floor - Finance
Villanueva, Gabriel,Senior IT Specialist,IT Services,g.villanueva@office.gov,2nd Floor - Helpdesk
Navarro, Fernando M.,Procurement Officer,,f.navarro@office.gov,1st Floor - Supply
Lim, Kimberly Ann,,,k.lim@office.gov,1st Floor - Front Desk`;

  const previewRes = await fetch(`${BASE_URL}/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ pastedData: messyCsv })
  });
  const preview = await previewRes.json();
  console.log('Import Preview Summary:');
  console.log(' - Total Rows:', preview.totalRows);
  console.log(' - Duplicate Count Detected:', preview.duplicateCount);
  console.log(' - Missing Info Count Detected:', preview.missingInfoCount);

  // Check duplicate detection
  const delaCruzRow = preview.rows.find(r => r.normalized.full_name.includes('DELA CRUZ'));
  if (!delaCruzRow || delaCruzRow.duplicates.length === 0) {
    throw new Error('Duplicate detection failed for Dela Cruz, J.');
  }
  console.log(' - Duplicate matched:', delaCruzRow.duplicates[0].reasons, 'with', delaCruzRow.duplicates[0].existingName);

  // Check missing fields detection (Lim Kimberly Ann is missing both position and unit)
  const limRow = preview.rows.find(r => r.normalized.full_name.includes('LIM'));
  if (!limRow || !limRow.hasMissingFields) {
    throw new Error('Missing fields detection failed for Lim, Kimberly Ann');
  }
  console.log(' - Missing fields correctly detected for:', limRow.normalized.full_name, limRow.missingFields);

  // 3. Commit import: merge duplicate, create rest
  const items = preview.rows.map(r => ({
    action: r.duplicates.length > 0 ? 'merge' : 'create',
    targetEmployeeId: r.duplicates.length > 0 ? r.duplicates[0].existingId : null,
    data: r.normalized
  }));

  const commitRes = await fetch(`${BASE_URL}/import/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items })
  });
  const commitResult = await commitRes.json();
  console.log('Commit Result:', commitResult);

  if (commitResult.mergedCount < 1 || commitResult.createdCount < 1) {
    throw new Error('Commit result numbers unexpected: ' + JSON.stringify(commitResult));
  }

  console.log('--- IMPORT WORKFLOW TEST PASSED ---');
}

testImport().catch(err => {
  console.error(err);
  process.exit(1);
});
