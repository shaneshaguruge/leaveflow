import { useEffect, useState } from 'react';
import { api } from '../api';
import { plural, workingDays } from '../leaveDays';
import { DEFAULT_LEAVE_TYPES, typeName } from '../leaveTypes';
import StatusBadge from './StatusBadge';

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

// HR_ADMIN only: GET /api/leave-requests returns everyone's requests for HR.
export default function AllRequests() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');

  useEffect(() => {
    api('/leave-requests').then(setRequests).catch((err) => setError(err.message));
  }, []);

  const shown = (requests || []).filter((r) =>
    (status === 'ALL' || r.status === status) && (type === 'ALL' || Number(r.leave_type_id) === Number(type)));

  return (
    <section aria-labelledby="all-heading">
      <h2 id="all-heading">All requests</h2>
      <div className="filters">
        <label className="inline">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All' : s}</option>)}
          </select>
        </label>
        <label className="inline">
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ALL">All</option>
            {DEFAULT_LEAVE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {requests === null && !error && <p className="muted">Loading…</p>}
      {requests && shown.length === 0 && <p className="muted">No requests.</p>}
      <ul className="list">
        {shown.map((r) => (
          <li key={r.id} className="card item" data-testid={`request-${r.id}`}>
            <div className="item-main">
              <div className="item-title">{r.employee_name} <span className="muted">#{r.id}</span></div>
              <div>{typeName(null, r.leave_type_id)} · {plural(workingDays(r.start_date, r.end_date), 'day')}</div>
              <div className="muted">{r.start_date} → {r.end_date}{r.reason ? ` · ${r.reason}` : ''}</div>
              <div className="muted" data-testid={`decided-by-${r.id}`}>Decided by: {r.decided_by_name || '—'}</div>
            </div>
            <div className="item-side"><StatusBadge status={r.status} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
