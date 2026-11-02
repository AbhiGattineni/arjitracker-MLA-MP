import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);
const ACTIVE_OFFICE_KEY = 'arji.activeOffice';

function readActiveOffice() {
  try {
    return localStorage.getItem(ACTIVE_OFFICE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Provides:
 *  user    – Firebase auth user (or null)
 *  profile – users/{uid}: { name, email, officeId, role } (or null)
 *  role    – 'superadmin' | 'admin' | 'manager' | 'employee'
 *  office  – the office being worked on, with `id` (or null).
 *            Office users always get their own office; a super admin picks
 *            one with selectOffice().
 *  loading – true until all of the above are known
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [office, setOffice] = useState(undefined);
  const [activeOffice, setActiveOffice] = useState(readActiveOffice);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (!user) {
      setProfile(user === null ? null : undefined);
      return undefined;
    }
    setProfile(undefined);
    return onSnapshot(
      doc(db, 'users', user.uid),
      { includeMetadataChanges: true },
      (snap) => {
        // Wait until a just-written profile (e.g. accepting an invite) is
        // saved on the server, otherwise reads that the security rules check
        // against the profile would be denied.
        if (snap.metadata.hasPendingWrites) return;
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      () => setProfile(null),
    );
  }, [user]);

  const role = profile?.role;
  const officeId = role === 'superadmin' ? activeOffice : profile?.officeId;

  useEffect(() => {
    if (profile === undefined) {
      setOffice(undefined);
      return undefined;
    }
    if (!profile || !officeId) {
      setOffice(null);
      return undefined;
    }
    setOffice(undefined);
    return onSnapshot(
      doc(db, 'offices', officeId),
      (snap) => setOffice(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setOffice(null),
    );
  }, [profile === undefined, !!profile, officeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectOffice(id) {
    try {
      if (id) localStorage.setItem(ACTIVE_OFFICE_KEY, id);
      else localStorage.removeItem(ACTIVE_OFFICE_KEY);
    } catch {
      /* storage unavailable – selection just won't persist */
    }
    setActiveOffice(id || '');
  }

  const value = {
    user,
    profile,
    role,
    office,
    loading: user === undefined || profile === undefined || office === undefined,
    selectOffice,
    logout: () => {
      selectOffice('');
      return signOut(auth);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
