import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../lib/roles';

export default function Layout() {
  const { office, profile, role, logout } = useAuth();
  const isSuper = role === 'superadmin';

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo">✓</span>
          <div>
            <div className="brand-name">{office ? office.name : 'Arji Tracker'}</div>
            <div className="brand-sub">
              {office ? `${office.type} · ${office.constituency}` : 'Super Admin console'}
            </div>
          </div>
        </div>
        <nav className="nav">
          {office && (
            <>
              <NavLink to="/" end>Dashboard</NavLink>
              <NavLink to="/complaints" end>Complaints</NavLink>
              <NavLink to="/complaints/new" className="nav-cta">+ New</NavLink>
              <NavLink to="/office">Office</NavLink>
            </>
          )}
          {isSuper && <NavLink to="/admin">All offices</NavLink>}
        </nav>
        <div className="user">
          <span className="muted small">
            {profile.name} · <span className="role-tag">{roleLabel(role)}</span>
          </span>
          <button className="btn-link" onClick={logout}>Log out</button>
        </div>
      </header>
      {isSuper && office && (
        <div className="super-banner no-print">
          Viewing <b>{office.name}</b> as Super Admin
        </div>
      )}
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
