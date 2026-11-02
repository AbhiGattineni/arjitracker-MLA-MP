import { createContext, useContext, useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { can } from '../lib/roles';
import { toDate } from '../lib/format';

const ComplaintsContext = createContext(null);

// Live list of the complaints the current user may see (newest first), shared
// by the dashboard and the list page. Filtering is done in the browser, which
// keeps the app simple and is fast for a single constituency office.
//   admin / manager / super admin → every complaint of the office
//   employee                      → created by them OR assigned to them
const MAX = 2000;

export function ComplaintsProvider({ children }) {
  const { office, role, user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!office) {
      setComplaints([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError('');
    const col = collection(db, 'offices', office.id, 'complaints');
    const onError = (err) => {
      setError(err.message);
      setLoading(false);
    };

    if (can.seeAllComplaints(role)) {
      return onSnapshot(
        query(col, orderBy('createdAt', 'desc'), limit(MAX)),
        (snap) => {
          setComplaints(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        onError,
      );
    }

    // Employee: merge two simple queries.
    const parts = { created: null, assigned: null };
    const publish = () => {
      if (!parts.created || !parts.assigned) return;
      const byId = new Map();
      [...parts.created, ...parts.assigned].forEach((c) => byId.set(c.id, c));
      const list = [...byId.values()].sort(
        (a, b) => (toDate(b.createdAt) || new Date()) - (toDate(a.createdAt) || new Date()),
      );
      setComplaints(list);
      setLoading(false);
    };
    const listen = (key, q) =>
      onSnapshot(
        q,
        (snap) => {
          parts[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          publish();
        },
        onError,
      );
    const unsubs = [
      listen('created', query(col, where('createdBy', '==', user.uid))),
      listen('assigned', query(col, where('assignedTo', '==', user.uid))),
    ];
    return () => unsubs.forEach((u) => u());
  }, [office?.id, role, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ComplaintsContext.Provider value={{ complaints, loading, error }}>
      {children}
    </ComplaintsContext.Provider>
  );
}

export const useComplaints = () => useContext(ComplaintsContext);
