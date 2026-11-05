import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isConfigured } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ComplaintsProvider } from './context/ComplaintsContext';
import Layout from './components/Layout';
import NotConfigured from './pages/NotConfigured';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Complaints from './pages/Complaints';
import NewComplaint from './pages/NewComplaint';
import ComplaintDetail from './pages/ComplaintDetail';
import Office from './pages/Office';
import SuperAdmin from './pages/SuperAdmin';
import Track from './pages/Track';
import Landing from './pages/Landing';

function Loading() {
  return <div className="center-screen muted">Loading…</div>;
}

function OfficeMissing() {
  const { logout } = useAuth();
  return (
    <div className="center-screen">
      <div className="card narrow stack">
        <h1>Office not available</h1>
        <p>Your account is linked to an office that could not be loaded. Please try again or contact your Super Admin.</p>
        <button className="btn primary" onClick={() => window.location.reload()}>Try again</button>
        <button className="btn-link" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}

/** The signed-in portal. Redirects to login / setup / office picker when needed. */
function Portal() {
  const { user, profile, role, office, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Loading />;
  if (!user) return pathname === '/' ? <Landing /> : <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/setup" replace />;
  if (!office) {
    if (role !== 'superadmin') return <OfficeMissing />;
    if (pathname !== '/admin') return <Navigate to="/admin" replace />;
  }
  return (
    <ComplaintsProvider>
      <Layout />
    </ComplaintsProvider>
  );
}

function SuperOnly({ children }) {
  const { role } = useAuth();
  return role === 'superadmin' ? children : <Navigate to="/" replace />;
}

function NeedsSetup({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile) return <Navigate to="/" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  if (!isConfigured) return <NotConfigured />;
  return (
    <AuthProvider>
      <Routes>
        <Route path="/track" element={<Track />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/setup" element={<NeedsSetup><Setup /></NeedsSetup>} />
        <Route element={<Portal />}>
          <Route index element={<Dashboard />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="complaints/new" element={<NewComplaint />} />
          <Route path="complaints/:id" element={<ComplaintDetail />} />
          <Route path="office" element={<Office />} />
          <Route path="admin" element={<SuperOnly><SuperAdmin /></SuperOnly>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
