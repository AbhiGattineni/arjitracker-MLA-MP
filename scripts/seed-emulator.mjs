// Seeds the local Firebase emulators with demo accounts and complaints.
// Used by `npm run demo`. Never touches a real Firebase project.
const PROJECT = 'demo-arji';
const AUTH = 'http://127.0.0.1:9099';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const PASSWORD = 'demo123';

const toValue = (v) => {
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (v === null) return { nullValue: null };
  return { stringValue: String(v) };
};
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));

async function put(path, data) {
  const r = await fetch(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fields(data) }),
  });
  if (!r.ok) throw new Error(`${path}: ${await r.text()}`);
}

async function createUser(email) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.localId) throw new Error(`${email}: ${JSON.stringify(j)}`);
  return j.localId;
}

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// Start clean.
await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
await fetch(`${FS.replace('/v1/', '/emulator/v1/')}`, { method: 'DELETE' });

const OFFICE = 'MCH';
const people = [
  ['super@demo.com', 'Platform Owner', 'superadmin'],
  ['admin@demo.com', 'Gowri (MLA)', 'admin'],
  ['manager@demo.com', 'Suresh (PA)', 'manager'],
  ['employee@demo.com', 'Ramesh', 'employee'],
];
const uid = {};
for (const [email, name, role] of people) {
  uid[role] = await createUser(email);
  await put(`users/${uid[role]}`, role === 'superadmin'
    ? { name, email, role }
    : { name, email, role, officeId: OFFICE });
}

await put(`offices/${OFFICE}`, { name: 'MLA Office, Macherla', type: 'MLA', constituency: 'Macherla', slaDays: 7, createdAt: daysAgo(30) });
await put('offices/GNT', { name: 'MP Office, Guntur', type: 'MP', constituency: 'Guntur', slaDays: 7, createdAt: daysAgo(30) });

const complaints = [
  ['Lakshmi Devi', '9876543210', 'Rentachintala', 'Pensions', 'Old age pension not received for 3 months', 'Under Review', 12, 'employee', 'MPDO, Rentachintala'],
  ['Venkat Rao', '9876500001', 'Macherla', 'Revenue / Land', 'Pattadar passbook not issued after land registration', 'Pending', 9, '', ''],
  ['Srinivas', '9876500002', 'Karempudi', 'Health / Aarogyasri', 'Need Aarogyasri approval for heart surgery', 'Resolved', 6, 'manager', 'District Hospital'],
  ['Padma', '9876500003', 'Durgi', 'Housing', 'Applied for house site two years back, no allotment', 'Pending', 2, '', ''],
  ['Ravi Kumar', '9876500004', 'Veldurthi', 'Agriculture / Farm Loans', 'Crop loan waiver not credited', 'Under Review', 4, 'employee', 'Agriculture Officer'],
  ['Anjali', '9876500005', 'Macherla', 'Water / Drainage', 'No drinking water supply in ward 12 for a week', 'Pending', 1, '', ''],
];
const names = { employee: 'Ramesh', manager: 'Suresh (PA)', '': '' };

let n = 0;
for (const [citizenName, phone, village, department, description, status, age, assignee, forwardedTo] of complaints) {
  n += 1;
  const ticketNo = `${OFFICE}-${String(n).padStart(5, '0')}`;
  const id = `demo${n}`;
  const createdAt = daysAgo(age);
  await put(`offices/${OFFICE}/complaints/${id}`, {
    ticketNo, citizenName, phone, village, address: '', aadhaarLast4: '', source: 'Walk-in',
    department, priority: n === 3 ? 'Urgent' : 'Normal', description, status, forwardedTo,
    assignedTo: assignee ? uid[assignee] : '', assignedToName: names[assignee],
    createdAt, updatedAt: createdAt, createdBy: uid.employee, createdByName: 'Ramesh',
  });
  await put(`offices/${OFFICE}/complaints/${id}/history/h1`, {
    action: 'Registered', status: 'Pending', note: 'Complaint registered (Walk-in).',
    byUid: uid.employee, byName: 'Ramesh', at: createdAt, sharedWithCitizen: false,
  });
  if (status !== 'Pending') {
    await put(`offices/${OFFICE}/complaints/${id}/history/h2`, {
      action: `Status: Pending → ${status} · Forwarded to: ${forwardedTo}`, status,
      note: `Forwarded to ${forwardedTo}.`, byUid: uid.manager, byName: 'Suresh (PA)',
      at: daysAgo(Math.max(0, age - 1)), sharedWithCitizen: true,
    });
  }
  await put(`tracking/${ticketNo}_${phone}`, {
    ticketNo, officeId: OFFICE, officeName: 'MLA Office, Macherla', department, status,
    publicNote: status !== 'Pending' ? `Forwarded to ${forwardedTo}.` : '', createdAt, updatedAt: createdAt,
  });
}
await put(`offices/${OFFICE}/meta/counter`, { next: n + 1 });

console.log(`Demo data ready. Password for all accounts: ${PASSWORD}`);
for (const [email, , role] of people) console.log(`  ${role.padEnd(10)} ${email}`);
