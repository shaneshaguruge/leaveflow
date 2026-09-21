const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/requests', requireAuth, requireRole('MANAGER', 'HR_ADMIN'), async (req, res, next) => {
  try {
    const q = await pool.query(
      `SELECT lr.*, u.name AS employee_name
       FROM leave_requests lr JOIN users u ON u.id = lr.user_id
       WHERE lr.status = 'PENDING' AND (u.manager_id = $1 OR $2 = 'HR_ADMIN')
       ORDER BY lr.created_at`, [req.user.id, req.user.role]);
    res.json(q.rows);
  } catch (err) { next(err); }
});

module.exports = router;
