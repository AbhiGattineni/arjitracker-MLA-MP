import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useComplaints } from '../context/ComplaintsContext';
import StatusBadge, { OverdueBadge } from '../components/StatusBadge';
import { listTeam, updateComplaint } from '../lib/api';
import { can, roleLabel } from '../lib/roles';
import { DEPARTMENT_NAMES, STATUSES } from '../lib/constants';
import { daysSince, fmtDate, fmtDateTime, isOverdue } from '../lib/format';

function Acknowledgment({ c, office }) {
  const trackUrl = `${window.location.origin}/track`;
  const message =
    `Namaste ${c.citizenName}, your complaint has been registered with ${office.name}.\n` +
    `Ticket No: ${c.ticketNo}\nDepartment: ${c.department}\n` +
    `Track status: ${trackUrl} (use your ticket no. and this mobile number).`;

  return (
    <div className="card ack">
      <div className="ack-print">
        <h2>Acknowledgment</h2>
        <p><b>{office.name}</b> · {office.constituency}</p>
        <div className="ack-ticket">{c.ticketNo}</div>
        <table className="kv">
          <tbody>
            <tr><td>Name</td><td>{c.citizenName}</td></tr>
            <tr><td>Mobile</td><td>{c.phone}</td></tr>
            <tr><td>Department</td><td>{c.department}</td></tr>
            <tr><td>Date</td><td>{fmtDateTime(c.createdAt)}</td></tr>
          </tbody>
        </table>
        <p className="small">Track your complaint at <b>{trackUrl}</b> with this ticket number and your mobile number.</p>
      </div>
      <div className="actions no-print">
        <button className="btn" onClick={() => window.print()}>🖨 Print</button>
        <a
          className="btn whatsapp"
          href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
        >
          Send on WhatsApp
        </a>
      </div>
    </div>
  );
}

function UpdateForm({ c, office, profile, uid, team }) {
  const [form, setForm] = useState({
    assignedTo: c.assignedTo || '',
    status: c.status,
    department: c.department,
    forwardedTo: c.forwardedTo || '',
    note: '',
    shareWithCitizen: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const changed =
    form.status !== c.status ||
    form.department !== c.department ||
    form.forwardedTo !== (c.forwardedTo || '') ||
    (team && form.assignedTo !== (c.assignedTo || '')) ||
    form.note.trim();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const member = team?.find((m) => m.id === form.assignedTo);
      const assignee = team ? { uid: form.assignedTo, name: member?.name || '' } : undefined;
      await updateComplaint(office, profile, uid, c, { ...form, assignee });
      setForm({ ...form, note: '', shareWithCitizen: false });
      setMsg('Saved.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form no-print" onSubmit={submit}>
      <h2>Update</h2>
      <div className="status-pick">
        {STATUSES.map((s) => (
          <button
            type="button"
            key={s}
            className={`pill ${form.status === s ? 'active' : ''}`}
            onClick={() => setForm({ ...form, status: s })}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="row">
        <label>
          Department
          <select value={form.department} onChange={set('department')}>
            {DEPARTMENT_NAMES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>
          Forwarded to (officer / office)
          <input value={form.forwardedTo} onChange={set('forwardedTo')} placeholder="e.g. Tahsildar, Macherla" />
        </label>
      </div>
      {team && (
        <label>
          Assigned to (team member)
          <select value={form.assignedTo} onChange={set('assignedTo')}>
            <option value="">— Not assigned —</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({roleLabel(m.role)})</option>
            ))}
          </select>
        </label>
      )}
      <label>
        Note
        <textarea rows={3} value={form.note} onChange={set('note')} placeholder="What was done / next step" />
      </label>
      <label className="check">
        <input type="checkbox" checked={form.shareWithCitizen} onChange={set('shareWithCitizen')} />
        Show this note to the citizen on the tracking page
      </label>
      {msg && <div className={`alert ${msg === 'Saved.' ? 'success' : 'error'}`}>{msg}</div>}
      <div className="actions end">
        <button className="btn primary" disabled={busy || !changed}>{busy ? 'Saving…' : 'Save update'}</button>
      </div>
    </form>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { office, profile, user, role } = useAuth();
  const { complaints, loading } = useComplaints();
  const [history, setHistory] = useState([]);
  const [team, setTeam] = useState(null);
  const c = complaints.find((x) => x.id === id);

  useEffect(() => {
    const q = query(collection(db, 'offices', office.id, 'complaints', id, 'history'), orderBy('at', 'desc'));
    return onSnapshot(q, (snap) => setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [office.id, id]);

  // Managers and above can assign complaints to team members.
  useEffect(() => {
    if (!can.assign(role)) return;
    listTeam(office.id).then((t) => setTeam(t.members)).catch(() => setTeam(null));
  }, [office.id, role]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!c) return <div className="card empty">Complaint not found. <Link to="/complaints">Back to list</Link></div>;

  const isNew = params.get('new') === '1';

  return (
    <div className="stack">
      <div className="page-head no-print">
        <div>
          <Link to="/complaints" className="muted small">← All complaints</Link>
          <h1>
            {c.ticketNo} <StatusBadge status={c.status} /> {isOverdue(c, office.slaDays || 7) && <OverdueBadge />}
          </h1>
        </div>
      </div>

      {isNew && <div className="alert success no-print">Complaint registered. Give the citizen the ticket number below.</div>}

      <div className="grid-2">
        <div className="stack">
          {isNew && <Acknowledgment c={c} office={office} />}
          <div className="card no-print">
            <h2>Details</h2>
            <table className="kv">
              <tbody>
                <tr><td>Citizen</td><td>{c.citizenName}</td></tr>
                <tr><td>Mobile</td><td><a href={`tel:${c.phone}`}>{c.phone}</a></td></tr>
                <tr><td>Village / Ward</td><td>{c.village}</td></tr>
                {c.address && <tr><td>Address</td><td>{c.address}</td></tr>}
                {c.aadhaarLast4 && <tr><td>Aadhaar</td><td>XXXX XXXX {c.aadhaarLast4}</td></tr>}
                <tr><td>Department</td><td>{c.department}</td></tr>
                <tr><td>Priority</td><td>{c.priority}</td></tr>
                <tr><td>Received via</td><td>{c.source}</td></tr>
                <tr><td>Forwarded to</td><td>{c.forwardedTo || '—'}</td></tr>
                <tr><td>Assigned to</td><td>{c.assignedToName || '—'}</td></tr>
                <tr><td>Registered</td><td>{fmtDate(c.createdAt)} by {c.createdByName} ({daysSince(c.createdAt)} days ago)</td></tr>
              </tbody>
            </table>
            <h3>Complaint</h3>
            <p className="pre">{c.description}</p>
          </div>
          {!isNew && (
            <details className="card no-print">
              <summary>Acknowledgment / send ticket to citizen</summary>
              <Acknowledgment c={c} office={office} />
            </details>
          )}
        </div>

        <div className="stack">
          <UpdateForm
            key={`${c.status}|${c.department}|${c.forwardedTo}|${c.assignedTo}|${team ? 1 : 0}`}
            c={c}
            office={office}
            profile={profile}
            uid={user.uid}
            team={team}
          />
          <div className="card no-print">
            <h2>History</h2>
            <ol className="timeline">
              {history.map((h) => (
                <li key={h.id}>
                  <div className="tl-head">
                    <b>{h.action}</b>
                    {h.sharedWithCitizen && <span className="badge">Shared with citizen</span>}
                  </div>
                  {h.note && <p className="pre">{h.note}</p>}
                  <div className="muted small">{h.byName} · {fmtDateTime(h.at)}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
