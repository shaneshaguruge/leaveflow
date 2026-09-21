const express = require('express');
const bcrypt = require('bcryptjs'); // bcryptjs: pure JS, same $2b$ hashes as bcrypt, no build tools needed
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../middleware/errors');
const { validate, required } = require('../middleware/validate');
const router = express.Router();

router.post('/auth/login', validate([
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
