export function toDate(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  return new Date(ts);
}

export function fmtDate(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(ts) {
  const d = toDate(ts);
  if (!d) return 'just now';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function daysSince(ts) {
  const d = toDate(ts) || new Date();
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

/** Overdue = not resolved and older than the office SLA (in days). */
export function isOverdue(c, slaDays = 7) {
  return c.status !== 'Resolved' && daysSince(c.createdAt) > slaDays;
}

/** Keep digits only, last 10 digits (strips +91 / leading 0). */
export function normalizePhone(p) {
  const digits = (p || '').replace(/\D/g, '');
  return digits.slice(-10);
}
