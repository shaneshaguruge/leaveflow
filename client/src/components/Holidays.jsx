import { useEffect, useState } from 'react';
import { api } from '../api';

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

// HR_ADMIN only (US-21): the public holiday list every day count uses. Add and delete without a developer.
export default function Holidays() {
  const [year, setYear] = useState(String(THIS_YEAR));
  const [holidays, setHolidays] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState({ date: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setHolidays(null);
    api(`/holidays?year=${year}`)
      .then((rows) => alive && setHolidays(rows))
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [year, version]);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api('/holidays', { method: 'POST', body: form });
      const n = res.adjusted.length;
      setNotice(`Added ${res.holiday.date} ${res.holiday.name}. `
        + (n ? `${n} approved request${n === 1 ? '' : 's'} got days back: ${res.adjusted
          .map((r) => `${r.employee_name} (${r.days_before} → ${r.days_after})`).join(', ')}.` : 'No approved leave was affected.'));
      setForm({ date: '', name: '' });
      setYear(res.holiday.date.slice(0, 4));
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message); // 409 "… is already a holiday", 400 validation
    } finally {
      setBusy(false);
    }
  }

  async function remove(holiday) {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/holidays/${holiday.date}`, { method: 'DELETE' });
      const n = res.not_recharged.length;
      setNotice(`Deleted ${holiday.date} ${holiday.name}. `
        + (n ? `${n} approved request${n === 1 ? ' covers this date and was' : 's cover this date and were'} not re-charged: ${res.not_recharged
          .map((r) => r.employee_name).join(', ')}.` : 'No approved leave covers this date.'));
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const unconfirmed = (holidays || []).filter((h) => h.note).length;

  return (
    <section aria-labelledby="holidays-heading">
      <h2 id="holidays-heading">Public holidays</h2>
      <label className="inline">
        Year
        <select value={year} onChange={(e) => { setNotice(null); setYear(e.target.value); }}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      {notice && <p role="status" className="hint">{notice}</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {holidays === null && !error && <p className="muted">Loading…</p>}
      {holidays && (
        <p className="muted">
          {holidays.length} holiday{holidays.length === 1 ? '' : 's'} in {year}
          {unconfirmed ? ` · ${unconfirmed} to confirm against the official gazette` : ''}
        </p>
      )}
      {holidays?.length === 0 && <p className="muted">No holidays entered for {year} yet.</p>}
      <ul className="list">
        {holidays?.map((h) => (
          <li key={h.date} className="card item" data-testid={`holiday-${h.date}`}>
            <div className="item-main">
              <div className="item-title">{h.date}</div>
              <div>{h.name}</div>
              {h.note && <div className="muted">{h.note}</div>}
            </div>
            <div className="item-side">
              <button type="button" className="btn btn-danger" disabled={busy}
                aria-label={`Delete ${h.date} ${h.name}`} onClick={() => remove(h)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <form className="card form" onSubmit={add} aria-labelledby="add-holiday-heading">
        <h3 id="add-holiday-heading">Add a holiday</h3>
        <div className="row-2">
          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <label>
            Name
            <input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy || !form.date || !form.name.trim()}>Add holiday</button>
      </form>
    </section>
  );
}
