require('dotenv').config();
const { Pool, types } = require('pg');

// DATE (OID 1082) as the plain 'YYYY-MM-DD' string. The default turns it into a JS Date at
// local midnight, which serialises a day early in Sri Lanka (+05:30).
types.setTypeParser(1082, (value) => value);
// NUMERIC (OID 1700), e.g. used_days, as a number instead of a string.
types.setTypeParser(1700, (value) => parseFloat(value));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// An idle client dropped by the server (DB restart, failover) is emitted as 'error' on the pool.
// Without a listener Node treats it as fatal and the whole API exits; log it and let the pool reconnect.
pool.on('error', (err) => console.error('idle Postgres client error:', err.code || '', err.message));
module.exports = pool;
module.exports.pool = pool; // lets Phase 6's `const { pool } = require(...)` work too
