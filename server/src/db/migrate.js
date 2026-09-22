const fs = require('fs'), path = require('path');
const pool = require('./pool');
const dir = path.join(__dirname, 'migrations');
// Any fixed number: every LeaveFlow process that migrates takes this same Postgres advisory lock.
const MIGRATION_LOCK = 727401;

// Applies every not-yet-applied .sql file in order (schema AND demo seed). Safe to run many times, and safe when two
// processes start at once (e.g. two Vercel cold starts): everything runs in ONE transaction holding a transaction-level
// advisory lock, so the second runner waits, then sees the files already recorded and applies nothing. A transaction
// lock (not a session lock) also works through a transaction-mode connection pooler such as Neon's.
// Leaves the pool open, so callers (npm run migrate below, Jest's globalSetup, the Vercel entry) decide when to end it.
async function migrate(db = pool) {
  const client = await db.connect();
  const applied = [];
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations
      (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const seen = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
      if (seen.rowCount) continue;
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      applied.push(file);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  applied.forEach((file) => console.log('applied', file));
  return applied;
}

// For long-lived or serverless entry points: migrate once per process, however many requests arrive together.
let ready = null;
function ensureMigrated() {
  if (!ready) ready = migrate().catch((err) => { ready = null; throw err; });
  return ready;
}

module.exports = { migrate, ensureMigrated };

if (require.main === module) { // `npm run migrate` / `node src/db/migrate.js`
  migrate().then(() => pool.end()).catch((err) => { console.error(err); process.exit(1); });
}
