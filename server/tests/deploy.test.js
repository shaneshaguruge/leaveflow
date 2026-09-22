// Vercel + Neon deployment: pool config, lock-protected migrations, and the serverless entry (api/index.js).
require('./setup'); // shared pool; closes it after the file
const request = require('supertest');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { pool, poolConfig } = require('../src/db/pool');
const { migrate } = require('../src/db/migrate');

describe('poolConfig', () => {
  test('a hosted URL with sslmode=require turns on verified TLS and drops the params pg does not need', () => {
    const c = poolConfig('postgres://u:p@ep-example-pooler.aws.neon.tech/leaveflow?sslmode=require&channel_binding=require', {});
    expect(c.ssl).toEqual({ rejectUnauthorized: true });
    expect(c.connectionString).toBe('postgres://u:p@ep-example-pooler.aws.neon.tech/leaveflow');
    expect(c.max).toBeUndefined();
  });

  test('local, Docker and CI URLs stay without TLS', () => {
    const c = poolConfig('postgres://leaveflow:leaveflow@db:5432/leaveflow', {});
    expect(c.ssl).toBeUndefined();
    expect(c.connectionString).toBe('postgres://leaveflow:leaveflow@db:5432/leaveflow');
  });

  test('on Vercel each function instance keeps a small pool', () => {
    expect(poolConfig('postgres://u:p@h/db?sslmode=require', { VERCEL: '1' })).toMatchObject({ max: 3, idleTimeoutMillis: 10000 });
  });
});

describe('migrations under concurrency (two cold starts at once)', () => {
  const DB = 'leaveflow_migrate_lock_test';
  const url = () => { const u = new URL(process.env.DATABASE_URL); u.pathname = '/' + DB; return u.toString(); };

  test('three runners at the same time on an empty database apply every file exactly once', async () => {
    await pool.query(`DROP DATABASE IF EXISTS ${DB}`);
    await pool.query(`CREATE DATABASE ${DB}`);
    const fresh = new Pool({ connectionString: url() });
    try {
      const results = await Promise.all([migrate(fresh), migrate(fresh), migrate(fresh)]);
      const files = fs.readdirSync(path.join(__dirname, '../src/db/migrations')).filter((f) => f.endsWith('.sql')).sort();
      expect(results.flat().sort()).toEqual(files); // each file applied by exactly one runner
      expect(results.filter((r) => r.length === 0)).toHaveLength(2); // the other two waited, then found nothing to do
      const users = await fresh.query('SELECT count(*)::int AS n FROM users');
      expect(users.rows[0].n).toBe(4); // demo seed applied once, not three times
      const holidays = await fresh.query('SELECT count(*)::int AS n FROM public_holidays');
      expect(holidays.rows[0].n).toBe(25);
      expect(await migrate(fresh)).toEqual([]); // and again later: nothing
    } finally {
      await fresh.end();
      await pool.query(`DROP DATABASE IF EXISTS ${DB}`);
    }
  });
});

describe('Vercel entry (api/index.js)', () => {
  const handler = require('../../api/index.js');

  test('/api/health answers through the serverless handler', async () => {
    const res = await request(handler).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('a demo login works through the handler (migrations ran first)', async () => {
    const res = await request(handler).post('/api/auth/login').send({ email: 'ishara@ceylonroots.lk', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 2, name: 'Ishara Fernando', role: 'EMPLOYEE' });
  });
});
