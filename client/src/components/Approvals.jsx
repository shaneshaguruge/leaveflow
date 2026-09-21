import { useEffect, useState } from 'react';
import { api } from '../api';
import { plural, workingDays } from '../leaveDays';
import { typeName } from '../leaveTypes';

export default function Approvals() {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    api('/team/requests')
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
        {pending?.map((r) => (
          <li key={r.id} className="card item" data-testid={`approval-${r.id}`}>
            <div className="item-main">
              <div className="item-title">{r.employee_name}</div>
              <div>
                {typeName(null, r.leave_type_id)} · {plural(workingDays(r.start_date, r.end_date), 'day')}
              </div>
              <div className="muted">{r.start_date} → {r.end_date}{r.reason ? ` · ${r.reason}` : ''}</div>
            </div>
            <div className="item-actions">
              <button type="button" className="btn btn-primary" disabled={busyId === r.id}
                onClick={() => decide(r.id, 'approve')}>Approve</button>
              <button type="button" className="btn btn-danger" disabled={busyId === r.id}
                onClick={() => decide(r.id, 'reject')}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
