const express = require('express');

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '0.4.0', uptime: process.uptime() });
});

app.use('/api', require('./routes/auth'));
app.use('/api/leave-requests', require('./routes/leaveRequests'));
app.use('/api/balances', require('./routes/balances'));
app.use('/api/team', require('./routes/team'));

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: { code: err.code || 'INTERNAL', message: err.message }
  });
});

module.exports = app;
