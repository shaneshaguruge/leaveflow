const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errors');
const { leaveDays } = require('../lib/leaveDays');
const { loadHolidays } = require('../lib/holidays');
const { toCsv } = require('../lib/csv');
const router = express.Router();

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

// US-12: HR's "All requests" list as a CSV for finance — the same rows the page shows for the same filters.
// ?year=2026 (requests starting in that year), ?status=APPROVED, ?type=<leave_type_id>; all optional.
router.get('/leave-requests.csv', requireAuth, requireRole('HR_ADMIN'), asyncHandler(async (req, res) => {
  const { year, status, type } = req.query;
  const holidays = await loadHolidays();
  if (year !== undefined && !/^\d{4}$/.test(year)) throw httpError(400, 'VALIDATION_ERROR', 'year: must be YYYY');
  if (status !== undefined && !STATUSES.includes(status)) {
    throw httpError(400, 'VALIDATION_ERROR', `status: must be one of ${STATUSES.join(', ')}`);
  }
  if (type !== undefined && !/^\d+$/.test(type)) throw httpError(400, 'VALIDATION_ERROR', 'type: must be a leave type id');

  const q = await pool.query(
    `SELECT lr.id, u.name AS employee_name, lt.name AS leave_type, lr.start_date, lr.end_date,
            lr.day_part, lr.status, d.name AS decided_by_name, lr.decided_at, lr.reason
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     LEFT JOIN users d ON d.id = lr.decided_by
     WHERE ($1::int IS NULL OR EXTRACT(YEAR FROM lr.start_date) = $1::int)
       AND ($2::text IS NULL OR lr.status = $2::text)
       AND ($3::int IS NULL OR lr.leave_type_id = $3::int)
     ORDER BY lr.created_at DESC`,
    [year ?? null, status ?? null, type ?? null]);

  const csv = toCsv(
    ['Request ID', 'Employee', 'Type', 'Start date', 'End date', 'Working days', 'Status', 'Decided by', 'Decided at', 'Reason'],
    q.rows.map((r) => [r.id, r.employee_name, r.leave_type, r.start_date, r.end_date,
      leaveDays(r.start_date, r.end_date, holidays, r.day_part), r.status, r.decided_by_name,
      r.decided_at ? r.decided_at.toISOString() : '', r.reason]));
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="leave-requests-${year || 'all'}.csv"`);
  res.send(csv);
}));

module.exports = router;
