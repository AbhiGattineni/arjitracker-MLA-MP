// Security-rules tests. Run with:  npm run test:rules
// (starts the Firestore emulator, needs Java installed)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';

let env;
const OFFICE = 'MCH';
const OTHER = 'GNT';

const as = (uid, email) => env.authenticatedContext(uid, { email }).firestore();

async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

const complaint = (createdBy, extra = {}) => ({
  ticketNo: 'MCH-00001', citizenName: 'Ravi', phone: '9876543210', village: 'Macherla',
  department: 'Pensions', description: 'Pension not received', status: 'Pending',
  assignedTo: '', createdBy, ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'arji-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (db) => {
    await setDoc(doc(db, 'users/super'), { name: 'Super', email: 'super@x.com', role: 'superadmin' });
    await setDoc(doc(db, `offices/${OFFICE}`), { name: 'MLA Office Macherla', type: 'MLA', constituency: 'Macherla', slaDays: 7 });
    await setDoc(doc(db, `offices/${OTHER}`), { name: 'MP Office Guntur', type: 'MP', constituency: 'Guntur', slaDays: 7 });
    for (const [uid, role, office] of [
      ['admin', 'admin', OFFICE], ['manager', 'manager', OFFICE],
      ['emp1', 'employee', OFFICE], ['emp2', 'employee', OFFICE], ['otherAdmin', 'admin', OTHER],
    ]) {
      await setDoc(doc(db, `users/${uid}`), { name: uid, email: `${uid}@x.com`, role, officeId: office });
    }
    await setDoc(doc(db, `offices/${OFFICE}/complaints/c1`), complaint('emp1'));
    await setDoc(doc(db, `offices/${OFFICE}/complaints/c2`), complaint('emp2', { ticketNo: 'MCH-00002' }));
    await setDoc(doc(db, `offices/${OFFICE}/complaints/c1/history/h1`), { action: 'Registered', byUid: 'emp1' });
    await setDoc(doc(db, 'tracking/MCH-00001_9876543210'), { ticketNo: 'MCH-00001', officeId: OFFICE, status: 'Pending' });
  });
});

describe('super admin', () => {
  test('can create an office and invite its admin', async () => {
    const db = as('super', 'super@x.com');
    await assertSucceeds(runTransaction(db, async (tx) => {
      const ref = doc(db, 'offices/NEW1');
      await tx.get(ref);
      tx.set(ref, { name: 'New', type: 'MLA', constituency: 'X', slaDays: 7 });
      tx.set(doc(db, 'invites/newadmin@x.com'), { officeId: 'NEW1', officeName: 'New', role: 'admin', invitedBy: 'Super' });
    }));
  });
  test('can list all offices and read any office complaints', async () => {
    const db = as('super', 'super@x.com');
    await assertSucceeds(getDocs(collection(db, 'offices')));
    await assertSucceeds(getDocs(collection(db, `offices/${OFFICE}/complaints`)));
  });
  test('office users cannot create offices or list all offices', async () => {
    const db = as('admin', 'admin@x.com');
    await assertFails(setDoc(doc(db, 'offices/HACK'), { name: 'x' }));
    await assertFails(getDocs(collection(db, 'offices')));
  });
});

describe('joining via invite', () => {
  test('invited user joins with the invited role only', async () => {
    await seed((db) => setDoc(doc(db, 'invites/new@x.com'), { officeId: OFFICE, role: 'employee', officeName: 'o', invitedBy: 'a' }));
    const db = as('new', 'new@x.com');
    const profile = { name: 'New', email: 'new@x.com', officeId: OFFICE };
    await assertFails(setDoc(doc(db, 'users/new'), { ...profile, role: 'admin' }));
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/new'), { ...profile, role: 'employee' });
    batch.delete(doc(db, 'invites/new@x.com'));
    await assertSucceeds(batch.commit());
  });
  test('cannot join without an invite, and nobody can self-assign superadmin', async () => {
    const db = as('rando', 'rando@x.com');
    await assertFails(setDoc(doc(db, 'users/rando'), { name: 'r', email: 'rando@x.com', officeId: OFFICE, role: 'employee' }));
    await assertFails(setDoc(doc(db, 'users/rando'), { name: 'r', email: 'rando@x.com', role: 'superadmin' }));
  });
});

describe('invites by role', () => {
  const inv = (role, officeId = OFFICE) => ({ officeId, role, officeName: 'o', invitedBy: 'x' });
  test('admin can invite manager/employee but not admin', async () => {
    const db = as('admin', 'admin@x.com');
    await assertSucceeds(setDoc(doc(db, 'invites/m@x.com'), inv('manager')));
    await assertSucceeds(setDoc(doc(db, 'invites/e@x.com'), inv('employee')));
    await assertFails(setDoc(doc(db, 'invites/a@x.com'), inv('admin')));
  });
  test('manager can invite only employees', async () => {
    const db = as('manager', 'manager@x.com');
    await assertSucceeds(setDoc(doc(db, 'invites/e@x.com'), inv('employee')));
    await assertFails(setDoc(doc(db, 'invites/m@x.com'), inv('manager')));
  });
  test('employee cannot invite; nobody can invite into another office', async () => {
    await assertFails(setDoc(doc(as('emp1', 'emp1@x.com'), 'invites/e@x.com'), inv('employee')));
    await assertFails(setDoc(doc(as('admin', 'admin@x.com'), 'invites/e@x.com'), inv('employee', OTHER)));
  });
});

describe('role management', () => {
  test('admin can promote employee to manager, not to admin/superadmin', async () => {
    const db = as('admin', 'admin@x.com');
    await assertSucceeds(updateDoc(doc(db, 'users/emp1'), { role: 'manager' }));
    await assertFails(updateDoc(doc(db, 'users/emp2'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'users/emp2'), { role: 'superadmin' }));
  });
  test('manager and employee cannot change roles; nobody can change their own officeId', async () => {
    await assertFails(updateDoc(doc(as('manager', 'manager@x.com'), 'users/emp1'), { role: 'manager' }));
    await assertFails(updateDoc(doc(as('emp1', 'emp1@x.com'), 'users/emp1'), { role: 'admin' }));
    await assertFails(updateDoc(doc(as('emp1', 'emp1@x.com'), 'users/emp1'), { officeId: OTHER }));
  });
  test('admin can remove staff but not other admins', async () => {
    const db = as('admin', 'admin@x.com');
    await assertSucceeds(deleteDoc(doc(db, 'users/emp2')));
    await assertFails(deleteDoc(doc(db, 'users/otherAdmin')));
  });
});

describe('complaints', () => {
  const col = (db) => collection(db, `offices/${OFFICE}/complaints`);
  test('admin and manager see every complaint', async () => {
    await assertSucceeds(getDocs(col(as('admin', 'admin@x.com'))));
    await assertSucceeds(getDocs(col(as('manager', 'manager@x.com'))));
  });
  test('employee sees only own / assigned complaints', async () => {
    const db = as('emp1', 'emp1@x.com');
    await assertFails(getDocs(col(db)));
    await assertSucceeds(getDocs(query(col(db), where('createdBy', '==', 'emp1'))));
    await assertSucceeds(getDocs(query(col(db), where('assignedTo', '==', 'emp1'))));
    await assertSucceeds(getDoc(doc(db, `offices/${OFFICE}/complaints/c1`)));
    await assertFails(getDoc(doc(db, `offices/${OFFICE}/complaints/c2`)));
    await assertFails(getDoc(doc(db, `offices/${OFFICE}/complaints/c2/history/x`)));
  });
  test('employee can register a complaint as themselves only', async () => {
    const db = as('emp1', 'emp1@x.com');
    await assertSucceeds(setDoc(doc(db, `offices/${OFFICE}/complaints/n1`), complaint('emp1')));
    await assertFails(setDoc(doc(db, `offices/${OFFICE}/complaints/n2`), complaint('emp2')));
  });
  test('manager assigns; employee can update status but cannot re-assign', async () => {
    await assertSucceeds(updateDoc(doc(as('manager', 'manager@x.com'), `offices/${OFFICE}/complaints/c2`), { assignedTo: 'emp1' }));
    const db = as('emp1', 'emp1@x.com');
    await assertSucceeds(updateDoc(doc(db, `offices/${OFFICE}/complaints/c2`), { status: 'Under Review' }));
    await assertFails(updateDoc(doc(db, `offices/${OFFICE}/complaints/c2`), { assignedTo: 'emp2' }));
  });
  test('ticket number and phone cannot be changed', async () => {
    await assertFails(updateDoc(doc(as('admin', 'admin@x.com'), `offices/${OFFICE}/complaints/c1`), { phone: '9999999999' }));
  });
  test('only admin can delete', async () => {
    await assertFails(deleteDoc(doc(as('manager', 'manager@x.com'), `offices/${OFFICE}/complaints/c1`)));
    await assertSucceeds(deleteDoc(doc(as('admin', 'admin@x.com'), `offices/${OFFICE}/complaints/c1`)));
  });
  test('another office cannot read or write this office', async () => {
    const db = as('otherAdmin', 'otherAdmin@x.com');
    await assertFails(getDocs(col(db)));
    await assertFails(getDoc(doc(db, `offices/${OFFICE}`)));
    await assertFails(setDoc(doc(db, `offices/${OFFICE}/complaints/x`), complaint('otherAdmin')));
  });
  test('history is append-only', async () => {
    const db = as('admin', 'admin@x.com');
    const h = `offices/${OFFICE}/complaints/c1/history`;
    await assertSucceeds(setDoc(doc(db, `${h}/h2`), { action: 'Note', byUid: 'admin' }));
    await assertFails(updateDoc(doc(db, `${h}/h1`), { action: 'edited' }));
    await assertFails(deleteDoc(doc(db, `${h}/h1`)));
  });
});

describe('public tracking', () => {
  test('anyone can get by exact ticket+phone, nobody can list', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'tracking/MCH-00001_9876543210')));
    await assertFails(getDocs(collection(db, 'tracking')));
    await assertFails(setDoc(doc(db, 'tracking/MCH-00001_9876543210'), { status: 'Resolved', officeId: OFFICE }));
  });
  test('anonymous users cannot read complaints', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `offices/${OFFICE}/complaints/c1`)));
  });
});

describe('app write flows', () => {
  test('employee registers a complaint (counter + complaint + history + tracking in one transaction)', async () => {
    const db = as('emp1', 'emp1@x.com');
    const counterRef = doc(db, `offices/${OFFICE}/meta/counter`);
    const cRef = doc(collection(db, `offices/${OFFICE}/complaints`));
    await assertSucceeds(runTransaction(db, async (tx) => {
      const c = await tx.get(counterRef);
      const next = c.exists() ? c.data().next : 1;
      const ticket = `${OFFICE}-${String(next).padStart(5, '0')}`;
      tx.set(counterRef, { next: next + 1 });
      tx.set(cRef, complaint('emp1', { ticketNo: ticket }));
      tx.set(doc(collection(cRef, 'history')), { action: 'Registered', byUid: 'emp1' });
      tx.set(doc(db, `tracking/${ticket}_9876543210`), { ticketNo: ticket, officeId: OFFICE, status: 'Pending' });
    }));
  });
  test('employee updates own complaint (complaint + history + tracking batch)', async () => {
    const db = as('emp1', 'emp1@x.com');
    const ref = doc(db, `offices/${OFFICE}/complaints/c1`);
    const batch = writeBatch(db);
    batch.update(ref, { status: 'Resolved', department: 'Pensions', forwardedTo: 'MPDO' });
    batch.set(doc(collection(ref, 'history')), { action: 'Status', byUid: 'emp1' });
    batch.set(doc(db, 'tracking/MCH-00001_9876543210'), { officeId: OFFICE, status: 'Resolved' }, { merge: true });
    await assertSucceeds(batch.commit());
  });
});
