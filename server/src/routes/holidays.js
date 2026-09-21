const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errors');
const { isDate } = require('../middleware/validate');
const { leaveDays } = require('../lib/leaveDays');
const { loadHolidays } = require('../lib/holidays');
const router = express.Router();

// US-21: HR maintains the public holiday list. Everyone else gets 403.
router.use(requireAuth, requireRole('HR_ADMIN'));

// APPROVED requests whose range covers a date, with the requester's name.
const approvedCovering = (db, date) => db.query(
  `SELECT lr.id, lr.user_id, u.name AS employee_name, lr.leave_type_id, lr.start_date, lr.end_date, lr.day_part
   FROM leave_requests lr JOIN users u ON u.id = lr.user_id
   WHERE lr.status = 'APPROVED' AND lr.start_date <= $1 AND lr.end_date >= $1
   ORDER BY lr.start_date, lr.id`, [date]);

router.get('/', asyncHandler(async (req, res) => {
  const year = req.query.year ?? String(new Date().getFullYear());
  if (!/^\d{4}$/.test(year)) throw httpError(400, 'VALIDATION_ERROR', 'year: must be YYYY');
  const q = await pool.query(
    `SELECT holiday_date AS date, name, year, note FROM public_holidays WHERE year = $1 ORDER BY holiday_date`, [year]);
  res.json(q.rows);
}));

// Adding a holiday gives the day back to every APPROVED request that covers it (Nadeesha, AC-21.5):
// used_days drops by (days counted before) − (days counted now). Insert and re-credit happen in one transaction.
router.post('/', asyncHandler(async (req, res) => {
  const { date } = req.body || {};
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!isDate(date)) throw httpError(400, 'VALIDATION_ERROR', 'date: must be YYYY-MM-DD');
  if (!name || name.length > 100) throw httpError(400, 'VALIDATION_ERROR', 'name: is required (at most 100 characters)');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const before = await loadHolidays(client);
    const ins = await client.query(
      `INSERT INTO public_holidays (holiday_date, name) VALUES ($1, $2)
       ON CONFLICT (holiday_date) DO NOTHING
       RETURNING holiday_date AS date, name, year, note`, [date, name]);
    if (!ins.rowCount) throw httpError(409, 'HOLIDAY_EXISTS', `${date} is already a holiday`);
    const after = [...before, date];

    const adjusted = [];
    for (const r of (await approvedCovering(client, date)).rows) {
      const daysBefore = leaveDays(r.start_date, r.end_date, before, r.day_part);
      const daysAfter = leaveDays(r.start_date, r.end_date, after, r.day_part);
      if (daysBefore === daysAfter) continue; // e.g. the date is a weekend
      await client.query(
        `UPDATE leave_balances SET used_days = used_days - $4
         WHERE user_id = $1 AND leave_type_id = $2 AND year = $3`,
        [r.user_id, r.leave_type_id, Number(r.start_date.slice(0, 4)), daysBefore - daysAfter]);
      adjusted.push({ ...r, days_before: daysBefore, days_after: daysAfter });
    }
    await client.query('COMMIT');
    res.status(201).json({ holiday: ins.rows[0], adjusted });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// Deleting a holiday never re-charges leave that was already approved (AC-21.6); HR sees who is affected.
// Pending and new requests count the date as a working day from now on.
router.delete('/:date', asyncHandler(async (req, res) => {
  const { date } = req.params;
  if (!isDate(date)) throw httpError(400, 'VALIDATION_ERROR', 'date: must be YYYY-MM-DD');
  const del = await pool.query(
    'DELETE FROM public_holidays WHERE holiday_date = $1 RETURNING holiday_date AS date, name, year', [date]);
  if (!del.rowCount) throw httpError(404, 'NOT_FOUND', `${date} is not a holiday`);
  const covering = await approvedCovering(pool, date);
  res.json({ deleted: del.rows[0], not_recharged: covering.rows });
}));

module.exports = router;
