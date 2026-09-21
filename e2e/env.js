// Connection settings for the E2E stack. The suite only ever touches the leaveflow_e2e database.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const CLIENT_DIR = path.join(ROOT, 'client');
const E2E_DB = 'leaveflow_e2e';

// Minimal .env reader (KEY=VALUE lines) so the root package needs no dotenv dependency.
function readServerEnv() {
  const file = path.join(SERVER_DIR, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const serverEnv = readServerEnv();

// E2E_DATABASE_URL wins; otherwise reuse server/.env's host and credentials but force the e2e database name.
function e2eDatabaseUrl() {
  const base = process.env.E2E_DATABASE_URL || serverEnv.DATABASE_URL
    || 'postgres://postgres:postgres@localhost:5432/' + E2E_DB;
  const url = new URL(base);
  url.pathname = '/' + E2E_DB;
  return url.toString();
}

module.exports = {
  ROOT,
  SERVER_DIR,
  CLIENT_DIR,
  E2E_DB,
  DATABASE_URL: e2eDatabaseUrl(),
  JWT_SECRET: process.env.JWT_SECRET || serverEnv.JWT_SECRET || 'e2e-only-jwt-secret',
};
