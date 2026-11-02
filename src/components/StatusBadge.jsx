const CLASS = {
  Pending: 'badge-pending',
  'Under Review': 'badge-review',
  Resolved: 'badge-resolved',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${CLASS[status] || ''}`}>{status}</span>;
}

export function OverdueBadge() {
  return <span className="badge badge-overdue">Overdue</span>;
}
