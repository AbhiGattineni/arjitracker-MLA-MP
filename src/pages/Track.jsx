import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { trackComplaint } from '../lib/api';
import { STATUSES } from '../lib/constants';
import { fmtDate, fmtDateTime, normalizePhone } from '../lib/format';

/** Public page – citizens check status with ticket no. + mobile number. */
export default function Track() {
  const [ticket, setTicket] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setResult(undefined);
    if (normalizePhone(phone).length !== 10) return setError('Enter the 10-digit mobile number you gave at registration.');
    setBusy(true);
    try {
      setResult(await trackComplaint(ticket, phone));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const step = result ? STATUSES.indexOf(result.status) : -1;

  return (
    <div className="center-screen">
      <div className="card narrow">
        <div className="login-head">
          <span className="logo big">✓</span>
          <h1>Track your complaint</h1>
          <p className="muted">Enter the ticket number from your acknowledgment.</p>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            Ticket number
            <input value={ticket} onChange={(e) => setTicket(e.target.value.toUpperCase())} placeholder="e.g. MCH-00012" required />
          </label>
          <label>
            Mobile number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="10 digits" required />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="btn primary block" disabled={busy}>{busy ? 'Checking…' : 'Check status'}</button>
        </form>

        {result === null && (
          <div className="alert error mt">No complaint found for this ticket number and mobile number. Please check and try again.</div>
        )}

        {result && (
          <div className="track-result">
            <div className="ack-ticket">{result.ticketNo}</div>
            <p className="center"><StatusBadge status={result.status} /></p>
            <ol className="steps">
              {STATUSES.map((s, i) => (
                <li key={s} className={i <= step ? 'done' : ''}>{s}</li>
              ))}
            </ol>
            <table className="kv">
              <tbody>
                <tr><td>Office</td><td>{result.officeName}</td></tr>
                <tr><td>Department</td><td>{result.department}</td></tr>
                <tr><td>Registered</td><td>{fmtDate(result.createdAt)}</td></tr>
                <tr><td>Last update</td><td>{fmtDateTime(result.updatedAt)}</td></tr>
              </tbody>
            </table>
            {result.publicNote && (
              <div className="alert info">
                <b>Message from the office:</b>
                <p className="pre">{result.publicNote}</p>
              </div>
            )}
          </div>
        )}
        <hr />
        <p className="center small"><Link to="/login">Office staff login</Link></p>
      </div>
    </div>
  );
}
