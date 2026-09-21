const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

const findRequest = (id) =>
  db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);

// Cancel guard: only a PENDING request can be cancelled. The status check and the
// update are one atomic statement, so nothing non-PENDING can ever be cancelled.
function cancelPending(id, res, next) {
  const row = findRequest(id);
  if (!row) return next(httpError(404, 'NOT_FOUND', 'no such leave request'));
  const result = db.prepare(
    `UPDATE leave_requests SET status = 'CANCELLED', decided_by = user_id,
     decided_at = datetime('now') WHERE id = ? AND status = 'PENDING'`
  ).run(id);
  if (result.changes === 0) {
    return next(httpError(409, 'INVALID_STATE',
      'only PENDING requests can be cancelled; this one is ' + findRequest(id).status));
  }
  res.json(findRequest(id));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/leave-requests', (req, res) => {
  const rows = db.prepare('SELECT * FROM leave_requests ORDER BY id').all();
  res.json(rows);
});

app.post('/api/leave-requests', (req, res, next) => {
  const { user_id, start_date, end_date, reason } = req.body || {}; // NOTE: Express 5
  if (!user_id || !start_date || !end_date) {
    return next(httpError(400, 'VALIDATION_ERROR',
      'user_id, start_date and end_date are required'));
  }
  if (end_date < start_date) {
    return next(httpError(400, 'VALIDATION_ERROR',
      'end_date must be on or after start_date'));
  }
  const result = db.prepare(
    `INSERT INTO leave_requests (user_id, start_date, end_date, reason)
     VALUES (?, ?, ?, ?)`
  ).run(user_id, start_date, end_date, reason || null);
  res.status(201).json(findRequest(result.lastInsertRowid));
});

app.patch('/api/leave-requests/:id', (req, res, next) => {
  const { action, decided_by } = req.body || {}; // NOTE: Express 5
  if (action === 'cancel') return cancelPending(req.params.id, res, next);
  if (action !== 'approve' && action !== 'reject') {
    return next(httpError(400, 'VALIDATION_ERROR',
      'action must be "approve", "reject" or "cancel"'));
  }
  const row = findRequest(req.params.id);
  if (!row) return next(httpError(404, 'NOT_FOUND', 'no such leave request'));
  if (row.status !== 'PENDING') {
    return next(httpError(409, 'INVALID_STATE', 'request is already ' + row.status));
  }
  const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
  db.prepare(
    `UPDATE leave_requests SET status = ?, decided_by = ?,
     decided_at = datetime('now') WHERE id = ?`
  ).run(status, decided_by || null, req.params.id);
  res.json(findRequest(req.params.id));
});

// Phase 3 lab route, kept for compatibility; uses the same cancel guard as PATCH.
app.delete('/api/leave-requests/:id', (req, res, next) => {
  cancelPending(req.params.id, res, next);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: { code: err.code || 'INTERNAL', message: err.message }
  });
});

app.listen(4000, () => console.log('LeaveFlow v0 on http://localhost:4000'));
