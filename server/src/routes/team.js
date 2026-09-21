const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errors');
const { isDate } = require('../middleware/validate');
const router = express.Router();

// Without ?from=&to=: the PENDING requests waiting for this manager (the Approvals list).
// With ?from=&to=: who on the team is already off in that range (US-16) — APPROVED requests that overlap
// it (start_date <= to AND end_date >= from). Same scope either way: a MANAGER sees their own reports,
// HR_ADMIN sees everyone.
router.get('/requests', requireAuth, requireRole('MANAGER', 'HR_ADMIN'), asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (from === undefined && to === undefined) {
    const q = await pool.query(
      `SELECT lr.*, u.name AS employee_name
       FROM leave_requests lr JOIN users u ON u.id = lr.user_id
       WHERE lr.status = 'PENDING' AND (u.manager_id = $1 OR $2 = 'HR_ADMIN')
       ORDER BY lr.created_at`, [req.user.id, req.user.role]);
    return res.json(q.rows);
  }
  if (!isDate(from)) throw httpError(400, 'VALIDATION_ERROR', 'from: must be YYYY-MM-DD');
  if (!isDate(to)) throw httpError(400, 'VALIDATION_ERROR', 'to: must be YYYY-MM-DD');
  if (to < from) throw httpError(400, 'VALIDATION_ERROR', 'to: must be on or after from');
  const q = await pool.query(
    `SELECT lr.id, lr.user_id, u.name AS employee_name, lr.leave_type_id, lr.start_date, lr.end_date, lr.status
     FROM leave_requests lr JOIN users u ON u.id = lr.user_id
     WHERE lr.status = 'APPROVED' AND lr.start_date <= $2 AND lr.end_date >= $1
       AND (u.manager_id = $3 OR $4 = 'HR_ADMIN')
     ORDER BY lr.start_date, u.name`, [from, to, req.user.id, req.user.role]);
  res.json(q.rows);
}));

module.exports = router;
