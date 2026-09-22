// `npm run dev` from the repo root: the whole app on one command, no Docker.
// Starts PostgreSQL (server `npm run db`), applies migrations, then runs the API (:4000) and the web app (:5173).
// Ctrl+C stops everything; the database data stays in server/.pgdata.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server');
const CLIENT = path.join(ROOT, 'client');

// A fresh clone has no server/.env: use the same local defaults as `npm run db` (dev only, never production).
const env = { ...process.env };
if (!fs.existsSync(path.join(SERVER, '.env'))) {
  env.DATABASE_URL = env.DATABASE_URL || 'postgres://postgres:leaveflow_dev@localhost:5432/leaveflow';
  env.JWT_SECRET = env.JWT_SECRET || 'local-dev-only-secret';
  console.log('[dev] no server/.env found: using local defaults (see server/.env.example)');
}

const children = [];
function run(name, cwd, args, { onLine } = {}) {
  const child = spawn('npm', args, { cwd, env, shell: true });
  children.push(child);
  const prefix = (chunk) => chunk.toString().split(/\r?\n/).filter(Boolean).forEach((line) => {
    console.log(`[${name}] ${line}`);
    if (onLine) onLine(line);
  });
  child.stdout.on('data', prefix);
  child.stderr.on('data', prefix);
  return child;
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else child.kill('SIGINT');
  }
}
process.on('SIGINT', () => { stopAll(); setTimeout(() => process.exit(0), 1500); });

const db = run('db', SERVER, ['run', 'db'], {
  onLine: (line) => {
    if (!line.includes('running on port') || db.ready) return;
    db.ready = true;
    const migrate = run('migrate', SERVER, ['run', 'migrate']);
    migrate.on('exit', (code) => {
      if (code !== 0) { console.error('[dev] migrations failed; stopping'); stopAll(); process.exit(1); }
      run('api', SERVER, ['run', 'dev']);
      run('web', CLIENT, ['run', 'dev']);
      console.log('[dev] open http://localhost:5173  (Ctrl+C stops everything)');
    });
  },
});
db.on('exit', (code) => {
  if (!db.ready) { console.error(`[dev] the database did not start (exit ${code}); is port 5432 already in use?`); process.exit(1); }
});
