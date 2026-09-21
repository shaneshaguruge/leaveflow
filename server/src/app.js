const express = require('express');
const { httpLogger } = require('./middleware/logging');
const { errorHandler } = require('./middleware/errors');

const app = express();
// Behind a reverse proxy (nginx in compose, Render, CloudFront/App Runner) req.ip is the proxy's
// address, so every user would share ONE login rate-limit bucket. TRUST_PROXY = the number of proxy
// hops in front of the API. Unset (local dev) means X-Forwarded-For is ignored, so it can't be spoofed.
if (process.env.TRUST_PROXY) {
  const hops = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(hops) ? Number(hops) : hops);
}
app.use(httpLogger);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '0.4.0', uptime: process.uptime() });
});

app.use('/api', require('./routes/auth'));
app.use('/api/leave-requests', require('./routes/leaveRequests'));
app.use('/api/balances', require('./routes/balances'));
app.use('/api/team', require('./routes/team'));

app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such endpoint' } }));
app.use(errorHandler);

module.exports = app;
