import { useEffect, useState } from 'react';
import { api, download } from '../api';
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
  const [year, setYear] = useState('ALL');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api('/leave-requests').then(setRequests).catch((err) => setError(err.message));
  }, []);

  const years = [...new Set((requests || []).map((r) => r.start_date.slice(0, 4)))].sort().reverse();
  const shown = (requests || []).filter((r) =>
    (status === 'ALL' || r.status === status)
    && (type === 'ALL' || Number(r.leave_type_id) === Number(type))
    && (year === 'ALL' || r.start_date.startsWith(year)));

  // US-12: the CSV has the same rows as the screen — the server applies the same three filters.
  async function exportCsv() {
    const params = new URLSearchParams();
    if (year !== 'ALL') params.set('year', year);
    if (status !== 'ALL') params.set('status', status);
    if (type !== 'ALL') params.set('type', type);
    const qs = params.toString();
    setExporting(true);
    setError(null);
    try {
      await download(`/reports/leave-requests.csv${qs ? `?${qs}` : ''}`, `leave-requests-${year === 'ALL' ? 'all' : year}.csv`);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section aria-labelledby="all-heading">
      <h2 id="all-heading">All requests</h2>
      <div className="filters">
        <label className="inline">
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="ALL">All</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
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
        <button type="button" className="btn btn-ghost export" disabled={exporting || !requests} onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {requests === null && !error && <p className="muted">Loading…</p>}
      {requests && shown.length === 0 && <p className="muted">No requests.</p>}
      <ul className="list">
        {shown.map((r) => (
          <li key={r.id} className="card item" data-testid={`request-${r.id}`}>
            <div className="item-main">
              <div className="item-title">{r.employee_name} <span className="muted">#{r.id}</span></div>
              <div>{typeName(null, r.leave_type_id)} · {plural(r.days ?? workingDays(r.start_date, r.end_date), 'day')}</div>
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
