import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useComplaints } from '../context/ComplaintsContext';
import StatusBadge, { OverdueBadge } from '../components/StatusBadge';
import { DEPARTMENT_NAMES, STATUSES } from '../lib/constants';
import { daysSince, fmtDate, isOverdue } from '../lib/format';

export default function Complaints() {
  const { office, user } = useAuth();
  const { complaints, loading, error } = useComplaints();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const sla = office.slaDays || 7;

  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const department = params.get('department') || '';
  const overdue = params.get('overdue') === '1';
  const mine = params.get('mine') === '1';

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return complaints.filter((c) => {
      if (status && c.status !== status) return false;
      if (department && c.department !== department) return false;
      if (overdue && !isOverdue(c, sla)) return false;
      if (mine && c.assignedTo !== user.uid) return false;
      if (!term) return true;
      return [c.ticketNo, c.citizenName, c.phone, c.village, c.description]
        .some((v) => (v || '').toLowerCase().includes(term));
    });
  }, [complaints, q, status, department, overdue, mine, sla, user.uid]);

  function exportCsv() {
    const cols = ['ticketNo', 'citizenName', 'phone', 'village', 'department', 'status', 'priority', 'source', 'forwardedTo', 'assignedToName', 'description'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((c) => [...cols.map((k) => esc(c[k])), esc(fmtDate(c.createdAt))].join(','));
    const csv = [[...cols, 'createdAt'].join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `complaints-${office.id}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Complaints</h1>
        <div className="actions">
          <button className="btn" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
          <Link to="/complaints/new" className="btn primary">+ New</Link>
        </div>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Search ticket, name, phone, village…"
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
        />
        <select value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={department} onChange={(e) => setParam('department', e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENT_NAMES.map((d) => <option key={d}>{d}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={overdue} onChange={(e) => setParam('overdue', e.target.checked ? '1' : '')} />
          Overdue only
        </label>
        <label className="check">
          <input type="checkbox" checked={mine} onChange={(e) => setParam('mine', e.target.checked ? '1' : '')} />
          Assigned to me
        </label>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card empty muted">No complaints match.</div>
      ) : (
        <div className="card flush">
          <table className="table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Citizen</th>
                <th>Department</th>
                <th>Registered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/complaints/${c.id}`)}>
                  <td data-label="Ticket">
                    <b>{c.ticketNo}</b>
                    {c.priority && c.priority !== 'Normal' && <span className={`pri pri-${c.priority}`}>{c.priority}</span>}
                  </td>
                  <td data-label="Citizen">
                    {c.citizenName}
                    <div className="muted small">{c.village} · {c.phone}</div>
                  </td>
                  <td data-label="Department">
                    {c.department}
                    {c.assignedToName && <div className="muted small">→ {c.assignedToName}</div>}
                  </td>
                  <td data-label="Registered">
                    {fmtDate(c.createdAt)}
                    <div className="muted small">{daysSince(c.createdAt)} days ago</div>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={c.status} /> {isOverdue(c, sla) && <OverdueBadge />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">{filtered.length} of {complaints.length} complaints</p>
    </div>
  );
}
