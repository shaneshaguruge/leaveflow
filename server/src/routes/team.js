const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errors');
const { isDate } = require('../middleware/validate');
const { leaveDays } = require('../lib/leaveDays');
const { loadHolidays } = require('../lib/holidays');
const router = express.Router();

// Without parameters: the PENDING requests waiting for this manager (the Approvals list), newest first, each with
// its working days and the requester's balance for that type before and after approving it.
// With ?history=true: the team's APPROVED and REJECTED requests, most recently decided first.
// With ?from=&to=: who on the team is already off in that range (US-16) — APPROVED requests that overlap
// it (start_date <= to AND end_date >= from). Same scope either way: a MANAGER sees their own reports,
// HR_ADMIN sees everyone.
router.get('/requests', requireAuth, requireRole('MANAGER', 'HR_ADMIN'), asyncHandler(async (req, res) => {
  const { from, to, history } = req.query;
  const holidays = await loadHolidays();
  if (history !== undefined) {
    if (history !== 'true') throw httpError(400, 'VALIDATION_ERROR', 'history: must be true');
    const q = await pool.query(
      `SELECT lr.*, u.name AS employee_name, d.name AS decided_by_name
       FROM leave_requests lr JOIN users u ON u.id = lr.user_id
       LEFT JOIN users d ON d.id = lr.decided_by
       WHERE lr.status IN ('APPROVED', 'REJECTED') AND (u.manager_id = $1 OR $2 = 'HR_ADMIN')
       ORDER BY lr.decided_at DESC, lr.id DESC`, [req.user.id, req.user.role]);
    return res.json(q.rows.map((r) => ({ ...r, days: leaveDays(r.start_date, r.end_date, holidays, r.day_part) })));
  }
  if (from === undefined && to === undefined) {
    // remaining_days = allocation − used for the request's year (what is left now); approving deducts `days`.
    const q = await pool.query(
      `SELECT lr.*, u.name AS employee_name,
              lt.annual_allocation - COALESCE(b.used_days, 0) AS remaining_days
       FROM leave_requests lr JOIN users u ON u.id = lr.user_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       LEFT JOIN leave_balances b ON b.user_id = lr.user_id AND b.leave_type_id = lr.leave_type_id
                                 AND b.year = EXTRACT(YEAR FROM lr.start_date)
       WHERE lr.status = 'PENDING' AND (u.manager_id = $1 OR $2 = 'HR_ADMIN')
       ORDER BY lr.created_at DESC, lr.id DESC`, [req.user.id, req.user.role]);
    return res.json(q.rows.map((r) => {
      const days = leaveDays(r.start_date, r.end_date, holidays, r.day_part);
      return { ...r, days, remaining_after: Number(r.remaining_days) - days };
    }));
  }
  if (!isDate(from)) throw httpError(400, 'VALIDATION_ERROR', 'from: must be YYYY-MM-DD');
  if (!isDate(to)) throw httpError(400, 'VALIDATION_ERROR', 'to: must be YYYY-MM-DD');
  if (to < from) throw httpError(400, 'VALIDATION_ERROR', 'to: must be on or after from');
  const q = await pool.query(
    `SELECT lr.id, lr.user_id, u.name AS employee_name, lr.leave_type_id, lr.start_date, lr.end_date, lr.day_part, lr.status
     FROM leave_requests lr JOIN users u ON u.id = lr.user_id
     WHERE lr.status = 'APPROVED' AND lr.start_date <= $2 AND lr.end_date >= $1
       AND (u.manager_id = $3 OR $4 = 'HR_ADMIN')
     ORDER BY lr.start_date, u.name`, [from, to, req.user.id, req.user.role]);
  res.json(q.rows);
}));

module.exports = router;
