// Resets leaveflow_e2e before the suite: drop + recreate schema public, then run the server's migrations
// (schema + seed). Makes the spec repeatable: every run starts from the same seeded world.
const { execSync } = require('child_process');
const { SERVER_DIR, E2E_DB, DATABASE_URL, JWT_SECRET } = require('./env');

module.exports = async function globalSetup() {
  const dbName = new URL(DATABASE_URL).pathname.slice(1);
  if (dbName !== E2E_DB) throw new Error(`Refusing to reset "${dbName}": the E2E suite only resets ${E2E_DB}`);

  // pg is a server dependency; resolve it from server/ so the root package stays tiny.
  const { Client } = require(require.resolve('pg', { paths: [SERVER_DIR] }));
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }

  execSync('npm run migrate', {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL, JWT_SECRET },
  });
};
