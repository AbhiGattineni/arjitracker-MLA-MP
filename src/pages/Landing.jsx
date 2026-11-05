import { Link } from 'react-router-dom';
import { ROLES } from '../lib/roles';

const STEPS = [
  {
    title: 'Register',
    text: 'Office staff log walk-in, phone, letter or Praja Darbar petitions in under a minute. The department is suggested automatically from the complaint.',
  },
  {
    title: 'Acknowledge',
    text: 'A ticket number (e.g. MCH-00042) is generated instantly. Print the acknowledgment slip or send it to the citizen on WhatsApp.',
  },
  {
    title: 'Assign & forward',
    text: 'Managers assign the case to a staff member and record which officer it was forwarded to — Tahsildar, SI, MPDO, hospital and more.',
  },
  {
    title: 'Track & escalate',
    text: 'Every case moves Pending → Under Review → Resolved. Cases stuck beyond the office deadline are flagged Overdue for follow-up.',
  },
  {
    title: 'Resolve & inform',
    text: 'Citizens check progress themselves with their ticket and mobile number. Every update is kept in a permanent history.',
  },
];

const FEATURES = [
  ['Department auto-tagging', 'Revenue, Police, Health, Pensions, Housing, Agriculture and more — tagged as you type.'],
  ['Office-level privacy', 'Each MLA / MP office sees only its own data. Offices are fully separated from one another.'],
  ['Complete audit trail', 'Who changed what and when is recorded for every complaint and can never be edited or deleted.'],
  ['Citizen self-tracking', 'A public status page shows progress without revealing personal details.'],
  ['Live dashboard', 'Totals, pending, overdue and department-wise counts for the whole constituency at a glance.'],
  ['Works on mobile', 'Designed for office staff on phones as well as desktops. Export to CSV anytime.'],
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-bar">
        <div className="brand">
          <span className="logo">✓</span>
          <div className="brand-name">Arji Tracker</div>
        </div>
        <div className="actions">
          <Link to="/track" className="btn-link hide-sm">Track complaint</Link>
          <Link to="/login" className="btn primary">Sign in</Link>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">For MLA &amp; MP constituency offices</p>
        <h1>Every citizen petition, tracked from receipt to resolution.</h1>
        <p className="hero-sub">
          Arji Tracker helps elected representatives and their office teams register grievances, route them to the
          right department, follow up on time and keep citizens informed — all in one simple place.
        </p>
        <div className="actions hero-actions">
          <Link to="/login" className="btn primary">Sign in to your office</Link>
          <Link to="/track" className="btn">Track my complaint</Link>
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <ol className="flow">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="flow-num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section alt">
        <h2>Who uses it</h2>
        <div className="cards five">
          {Object.entries(ROLES).map(([key, r]) => (
            <div key={key} className="card">
              <h3>{r.label}</h3>
              <p className="muted">{r.desc}</p>
            </div>
          ))}
          <div className="card">
            <h3>Citizen</h3>
            <p className="muted">No login needed. Checks complaint status with the ticket number and mobile number.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Built for constituency work</h2>
        <div className="cards three">
          {FEATURES.map(([title, text]) => (
            <div key={title} className="card">
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section cta">
        <h2>Submitted a petition?</h2>
        <p>Use the ticket number from your acknowledgment slip to see its current status.</p>
        <Link to="/track" className="btn primary">Track my complaint</Link>
      </section>

      <footer className="landing-foot muted small">
        Arji Tracker · Grievance &amp; constituency complaint management · <Link to="/login">Office sign in</Link>
      </footer>
    </div>
  );
}
