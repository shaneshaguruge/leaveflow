const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errors');
const { validate, required, isDate, onOrAfter } = require('../middleware/validate');
const { leaveDays } = require('../lib/leaveDays');
const { HOLIDAYS } = require('../lib/holidays');
const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  // employee_name and decided_by_name: the HR "All requests" page shows names, not user ids.
  const q = await pool.query(
    `SELECT lr.*, u.name AS employee_name, d.name AS decided_by_name
     FROM leave_requests lr JOIN users u ON u.id = lr.user_id
     LEFT JOIN users d ON d.id = lr.decided_by
     WHERE lr.user_id = $1 OR $2 = 'HR_ADMIN'
     ORDER BY lr.created_at DESC`, [req.user.id, req.user.role]);
  res.json(q.rows);
}));

router.post('/', validate([
  ['leave_type_id', required, 'is required'],
  ['start_date', isDate, 'must be YYYY-MM-DD'],
  ['end_date', isDate, 'must be YYYY-MM-DD'],
  ['end_date', onOrAfter('start_date'), 'must be on or after start_date'],
]), asyncHandler(async (req, res) => {
  const { leave_type_id, start_date, end_date, reason } = req.body;
  const userId = req.user.id; // always the logged-in user; any user_id in the body is ignored
  const requested = leaveDays(start_date, end_date, HOLIDAYS);
  if (requested === 0) throw httpError(400, 'VALIDATION_ERROR', 'the dates contain no working days');

  const lt = await pool.query('SELECT annual_allocation FROM leave_types WHERE id = $1', [leave_type_id]);
  if (!lt.rowCount) throw httpError(400, 'BAD_TYPE', 'Unknown leave type');

  const overlap = await pool.query(
    `SELECT id, start_date, end_date FROM leave_requests
     WHERE user_id = $1 AND status IN ('PENDING', 'APPROVED')
       AND start_date <= $3 AND end_date >= $2
     ORDER BY start_date LIMIT 1`, [userId, start_date, end_date]);
  if (overlap.rowCount) {
    const o = overlap.rows[0];
    throw httpError(409, 'OVERLAPPING_REQUEST', `These dates overlap your request #${o.id} (${o.start_date} to ${o.end_date})`);
  }

  const year = Number(start_date.slice(0, 4));
  const bal = await pool.query(`SELECT used_days FROM leave_balances
     WHERE user_id = $1 AND leave_type_id = $2 AND year = $3`, [userId, leave_type_id, year]);
  const used = bal.rowCount ? Number(bal.rows[0].used_days) : 0;
  const pendingRows = await pool.query(
    `SELECT start_date, end_date FROM leave_requests
     WHERE user_id = $1 AND leave_type_id = $2 AND status = 'PENDING'
       AND EXTRACT(YEAR FROM start_date) = $3`, [userId, leave_type_id, year]);
  const pending = pendingRows.rows.reduce((sum, r) => sum + leaveDays(r.start_date, r.end_date, HOLIDAYS), 0);
  const left = lt.rows[0].annual_allocation - used - pending;
  if (requested > left) {
    throw httpError(409, 'INSUFFICIENT_BALANCE', `Only ${Math.max(left, 0)} day(s) of this type left this year`);
  }

  const ins = await pool.query(`INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`, [userId, leave_type_id, start_date, end_date, reason || null]);
  res.status(201).json(ins.rows[0]);
}));

router.patch('/:id', validate([
  ['action', (v) => ['approve', 'reject', 'cancel'].includes(v), 'must be "approve", "reject" or "cancel"'],
]), asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!/^\d+$/.test(req.params.id)) throw httpError(404, 'NOT_FOUND', 'No such request');
  const q = await pool.query(`SELECT lr.user_id, u.manager_id FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id WHERE lr.id = $1`, [req.params.id]);
  if (!q.rowCount) throw httpError(404, 'NOT_FOUND', 'No such request');
  const { user_id, manager_id } = q.rows[0];
  if (action === 'cancel' && user_id !== req.user.id) throw httpError(403, 'FORBIDDEN', 'Only the owner can cancel');
  if (action !== 'cancel') {
    if (!['MANAGER', 'HR_ADMIN'].includes(req.user.role)) throw httpError(403, 'FORBIDDEN', 'Managers only');
    if (req.user.role === 'MANAGER' && manager_id !== req.user.id) throw httpError(403, 'FORBIDDEN', 'Not your report');
  }

  if (action !== 'approve') { // reject/cancel change one row — no transaction needed
    const upd = action === 'reject'
      ? await pool.query(`UPDATE leave_requests SET status = 'REJECTED', decided_by = $1, decided_at = now()
           WHERE id = $2 AND status = 'PENDING' RETURNING *`, [req.user.id, req.params.id])
      : await pool.query(`UPDATE leave_requests SET status = 'CANCELLED', decided_by = user_id, decided_at = now()
           WHERE id = $1 AND status = 'PENDING' RETURNING *`, [req.params.id]);
    if (!upd.rowCount) throw httpError(409, 'INVALID_STATE', 'Request is not pending');
    return res.json(upd.rows[0]);
  }

  // approve: status and balance change together, or not at all
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(`UPDATE leave_requests SET status = 'APPROVED',
       decided_by = $1, decided_at = now() WHERE id = $2 AND status = 'PENDING' RETURNING *`,
      [req.user.id, req.params.id]);
    if (!upd.rowCount) throw httpError(409, 'INVALID_STATE', 'Request is not pending');
    const r = upd.rows[0];
    const bal = await client.query(`INSERT INTO leave_balances (user_id, leave_type_id, year, used_days)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, leave_type_id, year)
       DO UPDATE SET used_days = leave_balances.used_days + EXCLUDED.used_days
       RETURNING used_days`,
      [r.user_id, r.leave_type_id, Number(r.start_date.slice(0, 4)), leaveDays(r.start_date, r.end_date, HOLIDAYS)]);
    const lt = await client.query('SELECT annual_allocation FROM leave_types WHERE id = $1', [r.leave_type_id]);
    if (Number(bal.rows[0].used_days) > lt.rows[0].annual_allocation) {
      throw httpError(409, 'INSUFFICIENT_BALANCE', 'Approving this would exceed the annual allocation');
    }
    await client.query('COMMIT');
    res.json(r);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
