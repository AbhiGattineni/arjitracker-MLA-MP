import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createOffice, listOfficesWithStats } from '../lib/api';

const EMPTY = { type: 'MLA', code: '', name: '', constituency: '', adminEmail: '' };

export default function SuperAdmin() {
  const { profile, office: current, selectOffice } = useAuth();
  const navigate = useNavigate();
  const [offices, setOffices] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    listOfficesWithStats()
      .then((list) => setOffices(list.sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setBusy(true);
    try {
      await createOffice(form, profile.name);
      setMsg(`Office created. ${form.adminEmail} can now create an account and will join as Admin.`);
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function open(id) {
    selectOffice(id);
    navigate('/');
  }

  const totals = (offices || []).reduce(
    (t, o) => ({ total: t.total + o.total, open: t.open + o.open, resolved: t.resolved + o.resolved }),
    { total: 0, open: 0, resolved: 0 },
  );

  return (
    <div className="stack">
      <div className="page-head">
        <h1>All offices</h1>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close' : '+ New office'}
        </button>
      </div>

      {msg && <div className="alert success">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      {showForm && (
        <form className="card form" onSubmit={submit}>
          <h2>New MLA / MP office</h2>
          <div className="row">
            <label>
              Type
              <select value={form.type} onChange={set('type')}>
                <option>MLA</option>
                <option>MP</option>
              </select>
            </label>
            <label>
              Office code
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                placeholder="e.g. MCH"
                minLength={2}
                maxLength={8}
                required
              />
              <span className="hint">Ticket prefix, e.g. {form.code || 'MCH'}-00001</span>
            </label>
          </div>
          <div className="row">
            <label>
              Office name
              <input value={form.name} onChange={set('name')} placeholder="e.g. MLA Office, Macherla" required />
            </label>
            <label>
              Constituency
              <input value={form.constituency} onChange={set('constituency')} placeholder="e.g. Macherla" required />
            </label>
          </div>
          <label>
            Admin email (MLA / MP)
            <input type="email" value={form.adminEmail} onChange={set('adminEmail')} required />
          </label>
          <div className="actions end">
            <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create office & invite admin'}</button>
          </div>
        </form>
      )}

      <div className="stats">
        <div className="stat"><div className="stat-value">{offices?.length ?? '–'}</div><div className="stat-label">Offices</div></div>
        <div className="stat"><div className="stat-value">{totals.total}</div><div className="stat-label">Complaints</div></div>
        <div className="stat tone-pending"><div className="stat-value">{totals.open}</div><div className="stat-label">Open</div></div>
        <div className="stat tone-resolved"><div className="stat-value">{totals.resolved}</div><div className="stat-label">Resolved</div></div>
      </div>

      {offices === null ? (
        <p className="muted">Loading…</p>
      ) : offices.length === 0 ? (
        <div className="card empty muted">No offices yet. Create the first one above.</div>
      ) : (
        <div className="card flush">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Office</th>
                <th>Complaints</th>
                <th>Open</th>
                <th>Resolved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {offices.map((o) => (
                <tr key={o.id} onClick={() => open(o.id)}>
                  <td data-label="Code"><b>{o.id}</b></td>
                  <td data-label="Office">
                    {o.name}
                    <div className="muted small">{o.type} · {o.constituency}</div>
                  </td>
                  <td data-label="Complaints">{o.total}</td>
                  <td data-label="Open">{o.open}</td>
                  <td data-label="Resolved">{o.resolved}</td>
                  <td>
                    <button className="btn small">{current?.id === o.id ? 'Current' : 'Open →'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
