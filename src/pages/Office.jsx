import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cancelInvite, invite, listTeam, removeMember, setRole, updateOffice } from '../lib/api';
import { can, ROLES, roleLabel } from '../lib/roles';

function Settings({ office }) {
  const [form, setForm] = useState({ name: office.name, constituency: office.constituency, slaDays: office.slaDays || 7 });
  const [msg, setMsg] = useState('');

  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      await updateOffice(office.id, {
        name: form.name.trim(),
        constituency: form.constituency.trim(),
        slaDays: Math.max(1, Number(form.slaDays) || 7),
      });
      setMsg('Saved.');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <form className="card form" onSubmit={save}>
      <h2>Office settings</h2>
      <div className="row">
        <label>
          Office name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Constituency
          <input value={form.constituency} onChange={(e) => setForm({ ...form, constituency: e.target.value })} required />
        </label>
      </div>
      <label>
        Mark complaints overdue after (days)
        <input type="number" min={1} value={form.slaDays} onChange={(e) => setForm({ ...form, slaDays: e.target.value })} />
        <span className="hint">Open complaints older than this are flagged “Overdue” for escalation.</span>
      </label>
      {msg && <div className={`alert ${msg === 'Saved.' ? 'success' : 'error'}`}>{msg}</div>}
      <div className="actions end"><button className="btn primary">Save settings</button></div>
    </form>
  );
}

export default function Office() {
  const { office, profile, role, user } = useAuth();
  const [team, setTeam] = useState(null);
  const invitable = can.invitableRoles(role);
  const [form, setForm] = useState({ email: '', role: invitable[invitable.length - 1] || 'employee' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => listTeam(office.id).then(setTeam).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [office.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(fn, success) {
    setError('');
    setMsg('');
    try {
      await fn();
      if (success) setMsg(success);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function sendInvite(e) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    act(
      () => invite(office, email, form.role, profile.name),
      `Invite saved. Ask ${email} to open this app, create an account with that email, and they will join as ${roleLabel(form.role)}.`,
    );
    setForm({ ...form, email: '' });
  }

  const order = { admin: 0, manager: 1, employee: 2 };
  const members = (team?.members || []).sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name));

  return (
    <div className="stack narrow-page">
      <h1>Office</h1>
      <div className="card">
        <h2>{office.name}</h2>
        <p className="muted">
          {office.type} · {office.constituency} · Code <b>{office.id}</b> · You are <b>{roleLabel(role)}</b>
        </p>
      </div>

      {msg && <div className="alert success">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <h2>Team</h2>
        {!team ? (
          <p className="muted">Loading…</p>
        ) : (
          <ul className="list">
            {members.map((m) => (
              <li key={m.id}>
                <div>
                  <b>{m.name}</b> {m.id === user.uid && <span className="muted small">(you)</span>}
                  <div className="muted small">{m.email}</div>
                </div>
                <div className="actions">
                  {can.changeRoles(role) && m.id !== user.uid && (role === 'superadmin' || m.role !== 'admin') ? (
                    <select
                      value={m.role}
                      onChange={(e) => act(() => setRole(m.id, e.target.value), `${m.name} is now ${roleLabel(e.target.value)}.`)}
                    >
                      {(role === 'superadmin' ? ['admin', 'manager', 'employee'] : ['manager', 'employee']).map((r) => (
                        <option key={r} value={r}>{roleLabel(r)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="role-tag">{roleLabel(m.role)}</span>
                  )}
                  {m.id !== user.uid && can.removeMember(role, m.role) && (
                    <button
                      className="btn small danger"
                      onClick={() => window.confirm(`Remove ${m.name} from this office?`) && act(() => removeMember(m.id), `${m.name} removed.`)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
            {team.invites.map((i) => (
              <li key={i.id}>
                <div>
                  <b>{i.id}</b>
                  <div className="muted small">Invited as {roleLabel(i.role)} by {i.invitedBy} · not joined yet</div>
                </div>
                {invitable.includes(i.role) && (
                  <button className="btn small" onClick={() => act(() => cancelInvite(i.id), 'Invite cancelled.')}>Cancel</button>
                )}
              </li>
            ))}
          </ul>
        )}

        {invitable.length > 0 && (
          <form className="form mt" onSubmit={sendInvite}>
            <h3>Invite a team member</h3>
            <div className="row">
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label>
                Role
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {invitable.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </label>
            </div>
            <p className="hint">{ROLES[form.role]?.desc}</p>
            <div className="actions end"><button className="btn primary">Send invite</button></div>
          </form>
        )}
      </div>

      <div className="card">
        <h2>What each role can do</h2>
        <table className="kv">
          <tbody>
            {Object.entries(ROLES).map(([k, r]) => (
              <tr key={k}><td><b>{r.label}</b></td><td>{r.desc}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {can.editSettings(role) && <Settings key={office.id} office={office} />}
    </div>
  );
}
