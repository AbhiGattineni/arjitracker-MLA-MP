import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { acceptInvite, getInviteFor } from '../lib/api';
import { ROLES } from '../lib/roles';

/** Shown to a signed-in user who has no profile yet. */
export default function Setup() {
  const { user, logout } = useAuth();
  const [invite, setInvite] = useState(undefined);
  const [name, setName] = useState(user.displayName || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = () => {
    setInvite(undefined);
    getInviteFor(user.email).then(setInvite).catch(() => setInvite(null));
  };
  useEffect(check, [user.email]); // eslint-disable-line react-hooks/exhaustive-deps

  async function join(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await acceptInvite(user, invite, name);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (invite === undefined) return <div className="center-screen muted">Checking invites…</div>;

  return (
    <div className="center-screen">
      <div className="card narrow">
        <p className="muted small">Signed in as {user.email}</p>

        {invite ? (
          <form className="form" onSubmit={join}>
            <h1>Join {invite.officeName}</h1>
            <p>
              {invite.invitedBy} invited you as <b>{ROLES[invite.role]?.label}</b>.
            </p>
            <p className="muted small">{ROLES[invite.role]?.desc}</p>
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button className="btn primary block" disabled={busy}>Join office</button>
          </form>
        ) : (
          <div className="stack">
            <h1>No invite yet</h1>
            <p>
              Your account is ready, but it is not linked to an office. Ask your office Admin or Manager to invite{' '}
              <b>{user.email}</b>, then press <i>Check again</i>.
            </p>
            <button className="btn primary block" onClick={check}>Check again</button>
            <details className="small muted">
              <summary>Setting up the platform for the first time?</summary>
              <p>
                Make this account the <b>Super Admin</b>: in the Firebase console open Firestore and create a
                document in the <code>users</code> collection with ID
              </p>
              <pre className="code">{user.uid}</pre>
              <p>and fields:</p>
              <pre className="code">{`name: "Your name"\nemail: "${user.email.toLowerCase()}"\nrole: "superadmin"`}</pre>
              <p>Then reload this page.</p>
            </details>
          </div>
        )}
        <button className="btn-link" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
