// Runs once before the whole Jest run: brings the test database's schema up to date.
// DATABASE_URL comes from the real environment (CI) or server/.env (locally, via dotenv in pool.js).
module.exports = async () => {
  require('dotenv').config({ quiet: true });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — point it at the leaveflow_test database');
  const dbName = new URL(url).pathname.slice(1);
  // The suite TRUNCATEs tables before every test: refuse to run against anything but a *_test database.
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against database "${dbName}" — use a *_test database (e.g. leaveflow_test)`);
  }
  const pool = require('../src/db/pool');
  const { migrate } = require('../src/db/migrate');
  try {
    await migrate();
  } finally {
    await pool.end();
  }
};
