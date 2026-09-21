import { useEffect, useState } from 'react';
import { api } from '../api';

// US-16: while reviewing a request, show who on the team already has APPROVED leave overlapping its dates.
export default function TeamWeekPanel({ from, to }) {
  const [off, setOff] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api(`/team/requests?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((rows) => alive && setOff(rows))
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [from, to]);

  return (
    <div className="team-week" role="region" aria-label="Team that week">
      <div className="team-week-title">Team that week</div>
      {error && <p className="error">{error}</p>}
      {!error && off === null && <p className="muted">Loading…</p>}
      {off?.length === 0 && <p className="muted">No one else is off</p>}
      {off?.length > 0 && (
        <ul className="team-week-list">
          {off.map((r) => (
            <li key={r.id}>
              <strong>{r.employee_name}</strong> <span className="muted">{r.start_date} → {r.end_date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
