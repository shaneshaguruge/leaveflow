import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { plural, workingDays } from '../leaveDays';
import { typeName } from '../leaveTypes';
import ApplyLeaveForm from './ApplyLeaveForm';
import StatusBadge from './StatusBadge';

export default function MyLeave() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  // Fetch after the first render, and again whenever reload() bumps the version.
  useEffect(() => {
    let alive = true;
    Promise.all([api('/balances'), api('/leave-requests')])
      .then(([b, r]) => {
        if (!alive) return;
        setBalances(b);
        setRequests(r);
        setError(null);
      })
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [version]);

  async function cancel(id) {
    setBusyId(id);
    try {
      await api(`/leave-requests/${id}`, { method: 'PATCH', body: { action: 'cancel' } });
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section aria-labelledby="balances-heading">
        <h2 id="balances-heading">My balances</h2>
        <div className="cards">
          {balances.map((b) => (
            <article key={b.id} className="card balance" aria-label={`${b.name} balance`}>
              <h3>{b.name}</h3>
              <p className="big"><span data-testid={`remaining-${b.id}`}>{b.remaining_days}</span> <small>of {b.annual_allocation} left</small></p>
              <p className="muted">
                <span data-testid={`used-${b.id}`}>{b.used_days}</span> used · <span data-testid={`reserved-${b.id}`}>{b.pending_days}</span> reserved
              </p>
            </article>
          ))}
        </div>
      </section>

      {error && <p role="alert" className="error">{error}</p>}

      <ApplyLeaveForm balances={balances} onCreated={reload} />

      <section aria-labelledby="requests-heading">
        <h2 id="requests-heading">My requests</h2>
        {requests.length === 0 && <p className="muted">No requests yet.</p>}
        <ul className="list">
          {requests.map((r) => (
            <li key={r.id} className="card item" data-testid={`request-${r.id}`}>
              <div className="item-main">
                <div className="item-title">
                  {typeName(balances, r.leave_type_id)} · {plural(workingDays(r.start_date, r.end_date), 'day')}
                </div>
                <div className="muted">{r.start_date} → {r.end_date}{r.reason ? ` · ${r.reason}` : ''}</div>
              </div>
              <div className="item-side">
                <StatusBadge status={r.status} />
                {r.status === 'PENDING' && (
                  <button type="button" className="btn btn-ghost" disabled={busyId === r.id}
                    aria-label={`Cancel request ${r.id}`} onClick={() => cancel(r.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
