// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json) and handed to the Express app.
// The first request in a new function instance applies migrations + the demo seed (idempotent, lock-protected).
const app = require('../server/src/app');
const { ensureMigrated } = require('../server/src/db/migrate');

module.exports = async (req, res) => {
  try {
    await ensureMigrated();
  } catch (err) {
    console.error('database not ready:', err.code || '', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: { code: 'DB_UNAVAILABLE', message: 'The database is not reachable yet' } }));
  }
  return app(req, res);
};
