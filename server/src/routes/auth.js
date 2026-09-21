const express = require('express');
const bcrypt = require('bcryptjs'); // bcryptjs: pure JS, same $2b$ hashes as bcrypt, no build tools needed
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email and password are required' } });
    }
    const q = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = q.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: { code: 'BAD_CREDENTIALS', message: 'Wrong email or password' } });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try { res.json((await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id])).rows[0]); }
  catch (err) { next(err); }
});

module.exports = router;
