import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useComplaints } from '../context/ComplaintsContext';
import StatusBadge, { OverdueBadge } from '../components/StatusBadge';
import { fmtDate, isOverdue, toDate } from '../lib/format';
import { can } from '../lib/roles';

function Stat({ label, value, to, tone }) {
  return (
    <Link to={to} className={`stat ${tone || ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </Link>
  );
}

export default function Dashboard() {
  const { office, role, user } = useAuth();
  const { complaints, loading } = useComplaints();
  const sla = office.slaDays || 7;

  if (loading) return <p className="muted">Loading…</p>;

  const count = (s) => complaints.filter((c) => c.status === s).length;
  const overdue = complaints.filter((c) => isOverdue(c, sla));
  const now = new Date();
  const thisMonth = complaints.filter((c) => {
    const d = toDate(c.createdAt) || now;
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const byDept = {};
  for (const c of complaints) {
    const d = (byDept[c.department] ||= { total: 0, open: 0 });
    d.total += 1;
    if (c.status !== 'Resolved') d.open += 1;
  }
  const depts = Object.entries(byDept).sort((a, b) => b[1].total - a[1].total);
  const maxDept = depts[0]?.[1].total || 1;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          {!can.seeAllComplaints(role) && (
            <p className="muted small">Showing complaints you registered or that are assigned to you.</p>
          )}
        </div>
        <Link to="/complaints/new" className="btn primary">+ Register complaint</Link>
      </div>

      <div className="stats">
        <Stat label="Total" value={complaints.length} to="/complaints" />
        <Stat label="Pending" value={count('Pending')} to="/complaints?status=Pending" tone="tone-pending" />
        <Stat label="Under Review" value={count('Under Review')} to="/complaints?status=Under%20Review" tone="tone-review" />
        <Stat label="Resolved" value={count('Resolved')} to="/complaints?status=Resolved" tone="tone-resolved" />
        <Stat label={`Overdue (> ${sla} days)`} value={overdue.length} to="/complaints?overdue=1" tone="tone-overdue" />
        <Stat label="This month" value={thisMonth} to="/complaints" />
        <Stat
          label="Assigned to me (open)"
          value={complaints.filter((c) => c.assignedTo === user.uid && c.status !== 'Resolved').length}
          to="/complaints?mine=1"
        />
      </div>

      {complaints.length === 0 ? (
        <div className="card empty">
          <h2>No complaints yet</h2>
          <p className="muted">Register your first walk-in petition to get started.</p>
          <Link to="/complaints/new" className="btn primary">+ Register complaint</Link>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card">
            <h2>By department</h2>
            <div className="bars">
              {depts.map(([name, d]) => (
                <Link key={name} to={`/complaints?department=${encodeURIComponent(name)}`} className="bar-row">
                  <div className="bar-label">
                    <span>{name}</span>
                    <span className="muted small">{d.open} open / {d.total}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(d.total / maxDept) * 100}%` }} />
                    <div className="bar-fill open" style={{ width: `${(d.open / maxDept) * 100}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Needs attention</h2>
            {overdue.length === 0 ? (
              <p className="muted">Nothing overdue. 🎉</p>
            ) : (
              <ul className="list">
                {overdue.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link to={`/complaints/${c.id}`}>
                      <b>{c.ticketNo}</b> · {c.citizenName}
                      <div className="muted small">{c.department} · since {fmtDate(c.createdAt)}</div>
                    </Link>
                    <OverdueBadge />
                  </li>
                ))}
              </ul>
            )}
            <h2 className="mt">Recent</h2>
            <ul className="list">
              {complaints.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/complaints/${c.id}`}>
                    <b>{c.ticketNo}</b> · {c.citizenName}
                    <div className="muted small">{c.department} · {fmtDate(c.createdAt)}</div>
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
