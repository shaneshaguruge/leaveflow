// Development database: a real PostgreSQL 16 server started from node_modules
// (the embedded-postgres package). It stands in for Part A's `docker run postgres:16`
// on machines where Docker isn't available. The API only ever sees DATABASE_URL,
// so any other Postgres 16 (Docker, a service container in CI, RDS) works unchanged.
//
//   npm run db        start it (creates the cluster and both databases on first run)
//   npm run db:stop   stop it cleanly from another terminal
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const url = new URL(process.env.DATABASE_URL || 'postgres://postgres:leaveflow_dev@localhost:5432/leaveflow');
const DATA_DIR = path.join(__dirname, '..', '.pgdata');
const PORT = Number(url.port || 5432);
const DATABASES = [url.pathname.slice(1), 'leaveflow_test'];

async function stop() {
  const platform = `@embedded-postgres/${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`;
  const { pg_ctl } = await import(platform);
  execFileSync(pg_ctl, ['stop', '-D', DATA_DIR, '-m', 'fast'], { stdio: 'inherit' });
}

async function start() {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: PORT,
    persistent: true,
    onLog: () => {},
  });
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('initialising a new PostgreSQL cluster in', DATA_DIR);
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  for (const db of DATABASES) {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
    if (!found.rowCount) {
      await pg.createDatabase(db);
      console.log('created database', db);
    }
  }
  const { rows } = await client.query('SHOW server_version');
  await client.end();
  console.log(`PostgreSQL ${rows[0].server_version} running on port ${PORT} (databases: ${DATABASES.join(', ')}). Ctrl+C to stop.`);

  const shutdown = async () => { await pg.stop(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

(process.argv[2] === 'stop' ? stop() : start())
  .catch((err) => { console.error(err); process.exit(1); });
