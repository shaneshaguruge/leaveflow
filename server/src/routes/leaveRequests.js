const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v));

// Working days between two dates, inclusive, excluding weekends (Phase 6 extracts this).
function leaveDays(startDate, endDate) {
  const cursor = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  let days = 0;
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

router.get('/', async (req, res, next) => {
  try {
    const q = await pool.query('SELECT * FROM leave_requests ORDER BY created_at DESC');
    res.json(q.rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { leave_type_id, start_date, end_date, reason } = req.body || {};
    const userId = Number((req.body || {}).user_id); // TEMP — Part C replaces this with the token
    if (!userId || !leave_type_id || !start_date || !end_date) {
      return fail(res, 400, 'VALIDATION_ERROR', 'user_id, leave_type_id, start_date and end_date are required');
    }
    if (!isDate(start_date) || !isDate(end_date)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'start_date and end_date must be YYYY-MM-DD');
    }
    if (end_date < start_date) {
      return fail(res, 400, 'VALIDATION_ERROR', 'end_date must be on or after start_date');
    }
    const requested = leaveDays(start_date, end_date);
    if (requested === 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'the dates contain no working days');
    }

    const lt = await pool.query('SELECT annual_allocation FROM leave_types WHERE id = $1', [leave_type_id]);
    if (!lt.rowCount) return fail(res, 400, 'BAD_TYPE', 'Unknown leave type');

    const overlap = await pool.query(
      `SELECT id, start_date, end_date FROM leave_requests
       WHERE user_id = $1 AND status IN ('PENDING', 'APPROVED')
         AND start_date <= $3 AND end_date >= $2
       ORDER BY start_date LIMIT 1`, [userId, start_date, end_date]);
    if (overlap.rowCount) {
      const o = overlap.rows[0];
      return fail(res, 409, 'OVERLAPPING_REQUEST',
        `These dates overlap your request #${o.id} (${o.start_date} to ${o.end_date})`);
    }

    const year = Number(start_date.slice(0, 4));
    const bal = await pool.query(`SELECT used_days FROM leave_balances
       WHERE user_id = $1 AND leave_type_id = $2 AND year = $3`, [userId, leave_type_id, year]);
    const used = bal.rowCount ? Number(bal.rows[0].used_days) : 0;
    const pendingRows = await pool.query(
      `SELECT start_date, end_date FROM leave_requests
       WHERE user_id = $1 AND leave_type_id = $2 AND status = 'PENDING'
         AND EXTRACT(YEAR FROM start_date) = $3`, [userId, leave_type_id, year]);
    const pending = pendingRows.rows.reduce((sum, r) => sum + leaveDays(r.start_date, r.end_date), 0);
    const left = lt.rows[0].annual_allocation - used - pending;
    if (requested > left) {
      return fail(res, 409, 'INSUFFICIENT_BALANCE', `Only ${Math.max(left, 0)} day(s) of this type left this year`);
    }

    const ins = await pool.query(`INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`, [userId, leave_type_id, start_date, end_date, reason || null]);
    res.status(201).json(ins.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  const { action } = req.body || {}; // 'approve' | 'reject' | 'cancel'
  if (!['approve', 'reject', 'cancel'].includes(action)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'action must be "approve", "reject" or "cancel"');
  }
  let found;
  try {
    found = await pool.query('SELECT id FROM leave_requests WHERE id = $1', [req.params.id]);
  } catch (err) { return next(err); }
  if (!found.rowCount) return fail(res, 404, 'NOT_FOUND', 'No such request');
  if (action !== 'approve') return decideSimple(req, res, next);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(`UPDATE leave_requests SET status = 'APPROVED',
       decided_by = $1, decided_at = now() WHERE id = $2 AND status = 'PENDING' RETURNING *`,
      [Number((req.body || {}).decided_by) || null, req.params.id]); // TEMP until Part C
    if (!upd.rowCount) {
      const e = new Error('Request is not pending'); e.status = 409; e.code = 'INVALID_STATE'; throw e;
    }
    const r = upd.rows[0];
    const bal = await client.query(`INSERT INTO leave_balances (user_id, leave_type_id, year, used_days)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, leave_type_id, year)
       DO UPDATE SET used_days = leave_balances.used_days + EXCLUDED.used_days
       RETURNING used_days`,
      [r.user_id, r.leave_type_id, Number(r.start_date.slice(0, 4)), leaveDays(r.start_date, r.end_date)]);
    const lt = await client.query('SELECT annual_allocation FROM leave_types WHERE id = $1', [r.leave_type_id]);
    if (Number(bal.rows[0].used_days) > lt.rows[0].annual_allocation) {
      const e = new Error('Approving this would exceed the annual allocation');
      e.status = 409; e.code = 'INSUFFICIENT_BALANCE'; throw e;
    }
    await client.query('COMMIT');
    res.json(r);
  } catch (err) { await client.query('ROLLBACK'); next(err); }
  finally { client.release(); }
});

async function decideSimple(req, res, next) { // reject/cancel change one row — no transaction needed
  try {
    const upd = req.body.action === 'reject'
      ? await pool.query(`UPDATE leave_requests SET status = 'REJECTED', decided_by = $1, decided_at = now()
           WHERE id = $2 AND status = 'PENDING' RETURNING *`,
        [Number(req.body.decided_by) || null, req.params.id]) // TEMP until Part C
      : await pool.query(`UPDATE leave_requests SET status = 'CANCELLED', decided_by = user_id, decided_at = now()
           WHERE id = $1 AND status = 'PENDING' RETURNING *`, [req.params.id]);
    if (!upd.rowCount) return fail(res, 409, 'INVALID_STATE', 'Request is not pending');
    res.json(upd.rows[0]);
  } catch (err) { next(err); }
}

module.exports = router;
