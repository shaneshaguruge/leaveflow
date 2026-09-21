import { useEffect, useState } from 'react';
import { api } from '../api';
import { dateRangeLabel, plural, workingDays } from '../leaveDays';
import { typeName } from '../leaveTypes';
import StatusBadge from './StatusBadge';
import TeamWeekPanel from './TeamWeekPanel';

export default function Approvals() {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [version, setVersion] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let alive = true;
    api('/team/requests') // newest first, with days and the balance before/after
      .then((rows) => alive && setPending(rows))
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [version]);

  async function decide(id, action) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/leave-requests/${id}`, { method: 'PATCH', body: { action } });
    } catch (err) {
      setError(err.message); // e.g. 409 "Request is not pending"
    } finally {
      setBusyId(null);
      setVersion((v) => v + 1); // refetch so the list reflects the decision
    }
  }

  return (
    <section aria-labelledby="approvals-heading">
      <h2 id="approvals-heading">Approvals</h2>
      {error && <p role="alert" className="error">{error}</p>}
      {pending === null && <p className="muted">Loading…</p>}
      {pending?.length === 0 && <p className="muted">No pending requests. Enjoy the quiet.</p>}
      <ul className="list">
        {pending?.map((r) => {
          const type = typeName(null, r.leave_type_id);
          return (
            <li key={r.id} className="card item" data-testid={`approval-${r.id}`}>
              <div className="item-main">
                <div className="item-title">
                  {r.employee_name}
                  {r.day_part && r.day_part !== 'FULL' && <span className="badge badge-half">{r.day_part}</span>}
                </div>
                <div>{type} · {plural(r.days ?? workingDays(r.start_date, r.end_date, r.day_part), 'day')}</div>
                <div className="muted" data-testid={`dates-${r.id}`}>{dateRangeLabel(r)}{r.reason ? ` · ${r.reason}` : ''}</div>
                {r.remaining_after !== undefined && (
                  <div className={r.remaining_after < 0 ? 'hint-bad' : 'hint'} data-testid={`balance-after-${r.id}`}>
                    {type} balance {r.remaining_days} → {r.remaining_after} after
                  </div>
                )}
              </div>
              <TeamWeekPanel from={r.start_date} to={r.end_date} />
              <div className="item-actions">
                <button type="button" className="btn btn-primary" disabled={busyId === r.id}
                  onClick={() => decide(r.id, 'approve')}>Approve</button>
                <button type="button" className="btn btn-danger" disabled={busyId === r.id}
                  onClick={() => decide(r.id, 'reject')}>Reject</button>
              </div>
            </li>
          );
        })}
      </ul>
      <p>
        <button type="button" className="link" aria-expanded={showHistory} onClick={() => setShowHistory((s) => !s)}>
          History: approved &amp; rejected requests {showHistory ? '▾' : '›'}
        </button>
      </p>
      {showHistory && <History version={version} />}
    </section>
  );
}

// The team's decided requests (APPROVED and REJECTED), most recently decided first.
function History({ version }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api('/team/requests?history=true')
      .then((data) => alive && setRows(data))
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [version]);

  return (
    <section aria-labelledby="history-heading">
      <h3 id="history-heading">History</h3>
      {error && <p role="alert" className="error">{error}</p>}
      {rows === null && !error && <p className="muted">Loading…</p>}
      {rows?.length === 0 && <p className="muted">No decided requests yet.</p>}
      <ul className="list">
        {rows?.map((r) => (
          <li key={r.id} className="card item" data-testid={`history-${r.id}`}>
            <div className="item-main">
              <div className="item-title">{r.employee_name}</div>
              <div>{typeName(null, r.leave_type_id)} · {plural(r.days, 'day')}</div>
              <div className="muted">{dateRangeLabel(r)} · decided by {r.decided_by_name || '—'}</div>
            </div>
            <div className="item-side"><StatusBadge status={r.status} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
