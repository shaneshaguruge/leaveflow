import { useEffect, useState } from 'react';
import { api } from '../api';
import { plural, workingDays } from '../leaveDays';
import { typeName } from '../leaveTypes';
import StatusBadge from './StatusBadge';

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

// HR_ADMIN only: GET /api/leave-requests returns everyone's requests for HR.
export default function AllRequests() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    api('/leave-requests').then(setRequests).catch((err) => setError(err.message));
  }, []);

  const shown = (requests || []).filter((r) => status === 'ALL' || r.status === status);

  return (
    <section aria-labelledby="all-heading">
      <h2 id="all-heading">All requests</h2>
      <label className="inline">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All' : s}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      {requests === null && !error && <p className="muted">Loading…</p>}
      {requests && shown.length === 0 && <p className="muted">No requests.</p>}
      <ul className="list">
        {shown.map((r) => (
          <li key={r.id} className="card item">
            <div className="item-main">
              <div className="item-title">{r.employee_name} <span className="muted">#{r.id}</span></div>
              <div>{typeName(null, r.leave_type_id)} · {plural(workingDays(r.start_date, r.end_date), 'day')}</div>
              <div className="muted">{r.start_date} → {r.end_date}{r.reason ? ` · ${r.reason}` : ''}</div>
            </div>
            <div className="item-side"><StatusBadge status={r.status} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
