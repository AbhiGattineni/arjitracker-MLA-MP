import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createComplaint } from '../lib/api';
import { DEPARTMENT_NAMES, PRIORITIES, SOURCES, suggestDepartment } from '../lib/constants';
import { normalizePhone } from '../lib/format';

const EMPTY = {
  citizenName: '',
  phone: '',
  village: '',
  address: '',
  aadhaarLast4: '',
  source: 'Walk-in',
  department: '',
  priority: 'Normal',
  description: '',
};

export default function NewComplaint() {
  const { office, profile, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [deptTouched, setDeptTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function onDescription(e) {
    const description = e.target.value;
    const next = { ...form, description };
    if (!deptTouched) next.department = suggestDepartment(description);
    setForm(next);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (normalizePhone(form.phone).length !== 10) return setError('Enter a valid 10-digit mobile number.');
    if (!form.department) return setError('Choose a department.');
    setBusy(true);
    try {
      const { id } = await createComplaint(office, profile, user.uid, {
        ...form,
        citizenName: form.citizenName.trim(),
        village: form.village.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
      });
      navigate(`/complaints/${id}?new=1`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="stack narrow-page">
      <h1>Register complaint</h1>
      <form className="card form" onSubmit={submit}>
        <h2>Citizen</h2>
        <div className="row">
          <label>
            Full name *
            <input value={form.citizenName} onChange={set('citizenName')} required autoFocus />
          </label>
          <label>
            Mobile number *
            <input value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="10 digits" required />
          </label>
        </div>
        <div className="row">
          <label>
            Village / Ward *
            <input value={form.village} onChange={set('village')} required />
          </label>
          <label>
            Aadhaar (last 4 digits)
            <input
              value={form.aadhaarLast4}
              onChange={(e) => setForm({ ...form, aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              inputMode="numeric"
              placeholder="Optional"
            />
          </label>
        </div>
        <label>
          Address
          <input value={form.address} onChange={set('address')} placeholder="Optional" />
        </label>

        <h2>Complaint</h2>
        <label>
          Details of the complaint / request *
          <textarea rows={5} value={form.description} onChange={onDescription} required />
        </label>
        <div className="row">
          <label>
            Department *
            <select
              value={form.department}
              onChange={(e) => { setDeptTouched(true); set('department')(e); }}
              required
            >
              <option value="">Select…</option>
              {DEPARTMENT_NAMES.map((d) => <option key={d}>{d}</option>)}
            </select>
            {!deptTouched && form.department && <span className="hint">Auto-suggested from the details</span>}
          </label>
          <label>
            Received via
            <select value={form.source} onChange={set('source')}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        {error && <div className="alert error">{error}</div>}
        <div className="actions end">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Register & get ticket no.'}</button>
        </div>
      </form>
    </div>
  );
}
