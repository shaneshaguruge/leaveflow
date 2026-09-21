const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

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
    const userId = Number(req.query.user_id); // TEMP until Part C
    const year = new Date().getFullYear();
    const q = await pool.query(
      `SELECT lt.id, lt.name, lt.annual_allocation, COALESCE(lb.used_days, 0) AS used_days
       FROM leave_types lt LEFT JOIN leave_balances lb
         ON lb.leave_type_id = lt.id AND lb.user_id = $1 AND lb.year = $2
       ORDER BY lt.id`,
      [userId, year]);
    const pending = await pool.query(
      `SELECT leave_type_id, start_date, end_date FROM leave_requests
       WHERE user_id = $1 AND status = 'PENDING' AND EXTRACT(YEAR FROM start_date) = $2`,
      [userId, year]);
    const pendingByType = {};
    for (const r of pending.rows) {
      pendingByType[r.leave_type_id] = (pendingByType[r.leave_type_id] || 0) + leaveDays(r.start_date, r.end_date);
    }
    res.json(q.rows.map((b) => {
      const used_days = Number(b.used_days);
      const pending_days = pendingByType[b.id] || 0;
      return { ...b, used_days, pending_days, remaining_days: b.annual_allocation - used_days - pending_days };
    }));
  } catch (err) { next(err); }
});

module.exports = router;
