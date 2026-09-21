import { useState } from 'react';
import { api } from '../api';
import { isIsoDate, plural, workingDays } from '../leaveDays';
import { DEFAULT_LEAVE_TYPES } from '../leaveTypes';

const EMPTY = { leave_type_id: '1', start_date: '', end_date: '', reason: '' };

// Client-side checks mirror the server for fast feedback; the server re-checks everything and stays the authority.
function validateDates(start, end) {
  if (!start || !end) return 'Both dates are required';
  if (!isIsoDate(start) || !isIsoDate(end)) return 'Dates must be YYYY-MM-DD';
  if (end < start) return 'End date must be on or after the start date';
  if (workingDays(start, end) === 0) return 'Those dates contain no working days';
  return null;
}

export default function ApplyLeaveForm({ balances = [], onCreated = () => {} }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const types = balances.length ? balances : DEFAULT_LEAVE_TYPES;
  const selected = balances.find((b) => String(b.id) === form.leave_type_id);
  const dateError = validateDates(form.start_date, form.end_date);
  const bothDates = Boolean(form.start_date && form.end_date);
  const days = dateError ? 0 : workingDays(form.start_date, form.end_date);
  const left = selected ? selected.remaining_days - days : null;

  async function submit(e) {
    e.preventDefault();
    if (dateError) return setError(dateError);
    setBusy(true);
    try {
      await api('/leave-requests', {
        method: 'POST',
        body: { ...form, leave_type_id: Number(form.leave_type_id) },
      });
      setError(null);
      setForm(EMPTY);
      onCreated();
    } catch (err) {
      setError(err.message); // 400 VALIDATION_ERROR / BAD_TYPE, 409 OVERLAPPING_REQUEST / INSUFFICIENT_BALANCE
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit} aria-labelledby="apply-heading">
      <h2 id="apply-heading">Apply for leave</h2>
      <label>
        Leave type
        <select value={form.leave_type_id} onChange={update('leave_type_id')}>
          {types.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </select>
      </label>
      <div className="row-2">
        <label>
          Start date
          <input type="date" value={form.start_date} onChange={update('start_date')} required />
        </label>
        <label>
          End date
          <input type="date" value={form.end_date} min={form.start_date || undefined}
            onChange={update('end_date')} required />
        </label>
      </div>
      {bothDates && (dateError ? (
        <p className="hint hint-bad" data-testid="balance-line">{dateError}</p>
      ) : (
        <p className={`hint${left !== null && left < 0 ? ' hint-bad' : ''}`} data-testid="balance-line">
          = {plural(days, 'working day')}
          {left !== null && (left >= 0 ? ` · ${left} remaining` : ` · only ${selected.remaining_days} remaining`)}
        </p>
      ))}
      <label>
        Reason
        <input value={form.reason} onChange={update('reason')} placeholder="Optional" />
      </label>
      <button className="btn btn-primary" disabled={busy || Boolean(dateError)}>Apply</button>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}
