const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { leaveDays } = require('../lib/leaveDays');
const { HOLIDAYS } = require('../lib/holidays');
const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const year = new Date().getFullYear();
    const q = await pool.query(
      `SELECT lt.id, lt.name, lt.annual_allocation, COALESCE(lb.used_days, 0) AS used_days
       FROM leave_types lt LEFT JOIN leave_balances lb
         ON lb.leave_type_id = lt.id AND lb.user_id = $1 AND lb.year = $2
       ORDER BY lt.id`,
      [userId, year]);
    const pending = await pool.query(
      `SELECT leave_type_id, start_date, end_date FROM leave_requests
       WHERE user_id = $1 AND status = 'PENDING'`,
      [userId]);
    const pendingByType = {};
    for (const r of pending.rows) {
      pendingByType[r.leave_type_id] = (pendingByType[r.leave_type_id] || 0) + leaveDays(r.start_date, r.end_date, HOLIDAYS);
    }
    res.json(q.rows.map((b) => {
      const used_days = Number(b.used_days);
      const pending_days = pendingByType[b.id] || 0;
      return { ...b, used_days, pending_days, remaining_days: b.annual_allocation - used_days - pending_days };
    }));
}));

module.exports = router;
