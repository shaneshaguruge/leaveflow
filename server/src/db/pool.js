require('dotenv').config();
const { Pool, types } = require('pg');

// DATE (OID 1082) as the plain 'YYYY-MM-DD' string. The default turns it into a JS Date at
// local midnight, which serialises a day early in Sri Lanka (+05:30).
types.setTypeParser(1082, (value) => value);
// NUMERIC (OID 1700), e.g. used_days, as a number instead of a string.
types.setTypeParser(1700, (value) => parseFloat(value));

// One pool config for every environment. Hosted Postgres (Neon on Vercel) needs TLS: its connection string carries
// `sslmode=require` (and `channel_binding`), which we turn into pg's `ssl` option with certificate checks on.
// Local, Docker Compose and CI URLs have no sslmode, so they connect without TLS as before.
// On Vercel each function instance is short-lived, so it keeps only a few connections (Neon's pooler does the rest).
// On Vercel, use the Neon integration's pooled connection string.
function poolConfig(connectionString = (process.env.VERCEL ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL), env = process.env) {
  const config = { connectionString };
  if (connectionString) {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get('sslmode');
    if (sslmode && sslmode !== 'disable') config.ssl = { rejectUnauthorized: true };
    url.searchParams.delete('sslmode');
    url.searchParams.delete('channel_binding');
    config.connectionString = url.toString();
  }
  if (env.VERCEL) Object.assign(config, { max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  return config;
}

const pool = new Pool(poolConfig());
// An idle client dropped by the server (DB restart, failover) is emitted as 'error' on the pool.
// Without a listener Node treats it as fatal and the whole API exits; log it and let the pool reconnect.
pool.on('error', (err) => console.error('idle Postgres client error:', err.code || '', err.message));
module.exports = pool;
module.exports.pool = pool; // lets Phase 6's `const { pool } = require(...)` work too
module.exports.poolConfig = poolConfig;
