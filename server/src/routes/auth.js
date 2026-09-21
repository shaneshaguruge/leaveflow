const express = require('express');
const bcrypt = require('bcryptjs'); // bcryptjs: pure JS, same $2b$ hashes as bcrypt, no build tools needed
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errors');
const { validate, required } = require('../middleware/validate');
const router = express.Router();

// Brute-force guard (Phase 10): 10 login attempts per minute per IP; the 11th gets 429 in the
// API's error shape. Off under NODE_ENV=test, where the Jest suite logs in many times.
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-6', // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next, options) => res.status(options.statusCode).json({ error: {
    code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in a minute.' } }),
});

router.post('/auth/login', loginLimiter, validate([
  ['email', required, 'is required'],
  ['password', required, 'is required'],
]), asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const q = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = q.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw httpError(401, 'BAD_CREDENTIALS', 'Wrong email or password');
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json((await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id])).rows[0]);
}));

module.exports = router;
