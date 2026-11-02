import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { normalizePhone } from './format';

/* ------------------------------------------------------------------ */
/* Offices (super admin)                                                */
/* ------------------------------------------------------------------ */

/**
 * Super admin: creates an MLA/MP office and invites its admin.
 * The office `code` (e.g. "MCH") is the document id and the ticket prefix.
 */
export async function createOffice({ code, name, type, constituency, adminEmail }, invitedBy) {
  const officeId = code.trim().toUpperCase();
  const officeRef = doc(db, 'offices', officeId);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(officeRef);
    if (existing.exists()) throw new Error(`Office code "${officeId}" is already taken.`);
    tx.set(officeRef, {
      name: name.trim(),
      type,
      constituency: constituency.trim(),
      slaDays: 7,
      createdAt: serverTimestamp(),
    });
    tx.set(doc(db, 'invites', adminEmail.trim().toLowerCase()), {
      officeId,
      officeName: name.trim(),
      role: 'admin',
      invitedBy,
      createdAt: serverTimestamp(),
    });
  });
}

/** Super admin: all offices with complaint counts. */
export async function listOfficesWithStats() {
  const snap = await getDocs(collection(db, 'offices'));
  return Promise.all(
    snap.docs.map(async (d) => {
      const col = collection(db, 'offices', d.id, 'complaints');
      const [total, resolved] = await Promise.all([
        getCountFromServer(col),
        getCountFromServer(query(col, where('status', '==', 'Resolved'))),
      ]);
      const t = total.data().count;
      const r = resolved.data().count;
      return { id: d.id, ...d.data(), total: t, resolved: r, open: t - r };
    }),
  );
}

export async function updateOffice(officeId, data) {
  await updateDoc(doc(db, 'offices', officeId), data);
}

/* ------------------------------------------------------------------ */
/* Team & invites                                                       */
/* ------------------------------------------------------------------ */

export async function getInviteFor(email) {
  const snap = await getDoc(doc(db, 'invites', email.toLowerCase()));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function acceptInvite(user, invite, name) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', user.uid), {
    name: name.trim(),
    email: user.email.toLowerCase(),
    officeId: invite.officeId,
    role: invite.role,
    createdAt: serverTimestamp(),
  });
  batch.delete(doc(db, 'invites', invite.id));
  await batch.commit();
}

export async function invite(office, email, role, invitedBy) {
  await setDoc(doc(db, 'invites', email.trim().toLowerCase()), {
    officeId: office.id,
    officeName: office.name,
    role,
    invitedBy,
    createdAt: serverTimestamp(),
  });
}

export async function cancelInvite(email) {
  await deleteDoc(doc(db, 'invites', email));
}

export async function listTeam(officeId) {
  const [members, invites] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('officeId', '==', officeId))),
    getDocs(query(collection(db, 'invites'), where('officeId', '==', officeId))).catch(() => ({ docs: [] })),
  ]);
  return {
    members: members.docs.map((d) => ({ id: d.id, ...d.data() })),
    invites: invites.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function setRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function removeMember(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

/* ------------------------------------------------------------------ */
/* Complaints                                                           */
/* ------------------------------------------------------------------ */

export const trackingId = (ticketNo, phone) => `${ticketNo}_${normalizePhone(phone)}`;

/**
 * Registers a complaint and returns { id, ticketNo }.
 * In one transaction it: bumps the office counter, creates the complaint,
 * writes the first audit-trail entry and the public tracking record.
 */
export async function createComplaint(office, profile, uid, data) {
  const phone = normalizePhone(data.phone);
  const counterRef = doc(db, 'offices', office.id, 'meta', 'counter');
  const complaintRef = doc(collection(db, 'offices', office.id, 'complaints'));

  const ticketNo = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = counter.exists() ? counter.data().next : 1;
    const ticket = `${office.id}-${String(next).padStart(5, '0')}`;

    tx.set(counterRef, { next: next + 1 });
    tx.set(complaintRef, {
      ...data,
      phone,
      ticketNo: ticket,
      status: 'Pending',
      forwardedTo: '',
      assignedTo: '',
      assignedToName: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
      createdByName: profile.name,
    });
    tx.set(doc(collection(complaintRef, 'history')), {
      action: 'Registered',
      status: 'Pending',
      note: `Complaint registered (${data.source}).`,
      byUid: uid,
      byName: profile.name,
      at: serverTimestamp(),
    });
    tx.set(doc(db, 'tracking', trackingId(ticket, phone)), {
      ticketNo: ticket,
      officeId: office.id,
      officeName: office.name,
      department: data.department,
      status: 'Pending',
      publicNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ticket;
  });

  return { id: complaintRef.id, ticketNo };
}

/**
 * Updates status / department / forwarded-to / assignee, appends an
 * audit-trail entry and refreshes the public tracking record.
 * `changes.assignee` is { uid, name } or undefined (unchanged).
 */
export async function updateComplaint(office, profile, uid, complaint, changes) {
  const { status, department, forwardedTo, note, shareWithCitizen, assignee } = changes;
  const ref = doc(db, 'offices', office.id, 'complaints', complaint.id);

  const update = { status, department, forwardedTo, updatedAt: serverTimestamp() };
  const parts = [];
  if (status !== complaint.status) parts.push(`Status: ${complaint.status} → ${status}`);
  if (department !== complaint.department) parts.push(`Department: ${complaint.department} → ${department}`);
  if (forwardedTo !== (complaint.forwardedTo || '')) parts.push(`Forwarded to: ${forwardedTo || '—'}`);
  if (assignee && assignee.uid !== (complaint.assignedTo || '')) {
    update.assignedTo = assignee.uid;
    update.assignedToName = assignee.name;
    parts.push(`Assigned to: ${assignee.name || 'nobody'}`);
  }

  const batch = writeBatch(db);
  batch.update(ref, update);
  batch.set(doc(collection(ref, 'history')), {
    action: parts.length ? parts.join(' · ') : 'Note added',
    status,
    note: note.trim(),
    sharedWithCitizen: Boolean(shareWithCitizen && note.trim()),
    byUid: uid,
    byName: profile.name,
    at: serverTimestamp(),
  });

  const tracking = {
    ticketNo: complaint.ticketNo,
    officeId: office.id,
    officeName: office.name,
    department,
    status,
    updatedAt: serverTimestamp(),
  };
  if (shareWithCitizen && note.trim()) tracking.publicNote = note.trim();
  batch.set(doc(db, 'tracking', trackingId(complaint.ticketNo, complaint.phone)), tracking, { merge: true });

  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Public tracking                                                      */
/* ------------------------------------------------------------------ */

export async function trackComplaint(ticketNo, phone) {
  const id = trackingId(ticketNo.trim().toUpperCase(), phone);
  const snap = await getDoc(doc(db, 'tracking', id));
  return snap.exists() ? snap.data() : null;
}
