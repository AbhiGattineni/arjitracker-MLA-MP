import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';

const ERRORS = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email.',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
};

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') await signInWithEmailAndPassword(auth, email.trim(), password);
      else await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(ERRORS[err.code] || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError('');
    if (!email.trim()) return setError('Enter your email above first.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Password reset email sent.');
    } catch (err) {
      setError(ERRORS[err.code] || err.message);
    }
  }

  return (
    <div className="center-screen">
      <div className="card narrow">
        <div className="login-head">
          <span className="logo big">✓</span>
          <h1>Arji Tracker</h1>
          <p className="muted">MLA / MP constituency grievance tracker</p>
        </div>

        <div className="tabs">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')} type="button">
            Sign in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          {error && <div className="alert error">{error}</div>}
          {info && <div className="alert success">{info}</div>}
          <button className="btn primary block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          {mode === 'signin' && (
            <button type="button" className="btn-link" onClick={resetPassword}>Forgot password?</button>
          )}
          {mode === 'signup' && (
            <p className="muted small">
              Use the same email address your office invited. Your role (Admin, Manager or Employee) comes from the invite.
            </p>
          )}
        </form>

        <hr />
        <p className="center small">
          Citizen? <Link to="/track">Track your complaint status →</Link>
        </p>
      </div>
    </div>
  );
}
