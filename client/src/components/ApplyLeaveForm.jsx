import { useState } from 'react';
import { api } from '../api';
import { isIsoDate, plural, workingDays } from '../leaveDays';
import { DEFAULT_LEAVE_TYPES } from '../leaveTypes';

const EMPTY = { leave_type_id: '1', start_date: '', end_date: '', reason: '', day_part: 'FULL' };
// Half days are for Annual and Casual leave only (Nadeesha, story review OQ-5).
const HALF_DAY_TYPES = ['Annual', 'Casual'];
const DAY_PARTS = [['FULL', 'Full day'], ['AM', 'Morning'], ['PM', 'Afternoon']];

// Client-side checks mirror the server for fast feedback; the server re-checks everything and stays the authority.
function validateDates(start, end, dayPart) {
  if (!start || !end) return 'Both dates are required';
  if (!isIsoDate(start) || !isIsoDate(end)) return 'Dates must be YYYY-MM-DD';
  if (end < start) return 'End date must be on or after the start date';
  if (workingDays(start, end, dayPart) === 0) return 'Those dates contain no working days';
  return null;
}

export default function ApplyLeaveForm({ balances = [], onCreated = () => {}, onCancel = () => {} }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const types = balances.length ? balances : DEFAULT_LEAVE_TYPES;
  const selected = balances.find((b) => String(b.id) === form.leave_type_id);
  const typeLabel = types.find((t) => String(t.id) === form.leave_type_id)?.name;
  const halfAllowed = HALF_DAY_TYPES.includes(typeLabel);
  const dayPart = halfAllowed ? form.day_part : 'FULL';
  const dateError = validateDates(form.start_date, form.end_date, dayPart);
  const bothDates = Boolean(form.start_date && form.end_date);
  const days = dateError ? 0 : workingDays(form.start_date, form.end_date, dayPart);
  const left = selected ? selected.remaining_days - days : null;

  // Cancel: throw the draft away and go back to the My requests list.
  function cancel() {
    setForm(EMPTY);
    setError(null);
    onCancel();
  }

  async function submit(e) {
    e.preventDefault();
    if (dateError) return setError(dateError);
    setBusy(true);
    try {
      await api('/leave-requests', {
        method: 'POST',
        body: { ...form, leave_type_id: Number(form.leave_type_id), day_part: dayPart },
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
      {halfAllowed && (
        <fieldset className="day-part">
          <legend>Day{form.start_date !== form.end_date && form.end_date ? ` (last day, ${form.end_date})` : ''}</legend>
          {DAY_PARTS.map(([value, label]) => (
            <label key={value} className="inline">
              <input type="radio" name="day_part" value={value} checked={form.day_part === value}
                onChange={update('day_part')} />
              {label}
            </label>
          ))}
        </fieldset>
      )}
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
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy || Boolean(dateError)}>Submit request</button>
        <button type="button" className="link" onClick={cancel}>Cancel</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </form>
  );
}
