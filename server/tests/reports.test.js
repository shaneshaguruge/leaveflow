// US-12: HR exports the All requests list as CSV (GET /api/reports/leave-requests.csv).
require('./setup'); // truncates leave_requests / leave_balances before every test
const request = require('supertest');
const app = require('../src/app');
const { cell } = require('../src/lib/csv');

const RUWAN = 'ruwan@ceylonroots.lk';
const ISHARA = 'ishara@ceylonroots.lk';
const DILINI = 'dilini@ceylonroots.lk';

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.token;
}

async function apply(email, body) {
  const res = await request(app).post('/api/leave-requests').set('Authorization', `Bearer ${await loginAs(email)}`)
    .send({ leave_type_id: 1, reason: 'Trip', ...body });
  expect(res.status).toBe(201);
  return res.body.id;
}

function csv(token, query = {}) {
  return request(app).get('/api/reports/leave-requests.csv').query(query).set('Authorization', `Bearer ${token}`)
    .buffer(true).parse((res, cb) => { let s = ''; res.on('data', (c) => { s += c; }); res.on('end', () => cb(null, s)); });
}

const lines = (body) => body.replace(/^﻿/, '').trim().split('\r\n');

describe('GET /api/reports/leave-requests.csv', () => {
  test('HR gets a CSV with a header row, names, holiday-aware working days and who decided', async () => {
    // 29 Apr - 4 May 2026 spans Vesak poya (1 May) and a weekend: 3 working days.
    const vesak = await apply(ISHARA, { start_date: '2026-04-29', end_date: '2026-05-04', reason: 'Vesak trip, Kandy' });
    await request(app).patch(`/api/leave-requests/${vesak}`).set('Authorization', `Bearer ${await loginAs(RUWAN)}`)
      .send({ action: 'approve' });

    const res = await csv(await loginAs(DILINI), { year: '2026' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toBe('attachment; filename="leave-requests-2026.csv"');
    expect(res.body.startsWith('﻿')).toBe(true); // Excel reads the names as UTF-8
    const [header, row] = lines(res.body);
    expect(header).toBe('Request ID,Employee,Type,Start date,End date,Working days,Status,Decided by,Decided at,Reason');
    expect(row).toMatch(new RegExp(`^${vesak},Ishara Fernando,Annual,2026-04-29,2026-05-04,3,APPROVED,Ruwan Jayasuriya,2026-\\d\\d-\\d\\dT[^,]+,"Vesak trip, Kandy"$`));
  });

  test('status, type and year filters give the same rows as the screen', async () => {
    await apply(ISHARA, { start_date: '2026-06-08', end_date: '2026-06-09' });
    await apply(ISHARA, { start_date: '2026-06-15', end_date: '2026-06-15', leave_type_id: 2 });
    await apply(RUWAN, { start_date: '2026-06-10', end_date: '2026-06-10' });
    const hr = await loginAs(DILINI);
    expect(lines((await csv(hr)).body)).toHaveLength(4); // header + 3
    expect(lines((await csv(hr, { type: '2' })).body)).toHaveLength(2);
    expect(lines((await csv(hr, { status: 'APPROVED' })).body)).toHaveLength(1); // header only
    expect(lines((await csv(hr, { year: '2025' })).body)).toHaveLength(1);
  });

  test('403 for an EMPLOYEE and for a MANAGER (HR only)', async () => {
    expect((await csv(await loginAs(ISHARA))).status).toBe(403);
    expect((await csv(await loginAs(RUWAN))).status).toBe(403);
  });

  test('400 for a bad year, status or type', async () => {
    const hr = await loginAs(DILINI);
    for (const q of [{ year: '26' }, { status: 'DONE' }, { type: 'annual' }]) {
      const res = await csv(hr, q);
      expect(res.status).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe('VALIDATION_ERROR');
    }
  });

  test('a reason that looks like a formula is neutralised (CSV injection)', async () => {
    await apply(ISHARA, { start_date: '2026-06-08', end_date: '2026-06-08', reason: '=HYPERLINK("http://x","click")' });
    const [, row] = lines((await csv(await loginAs(DILINI))).body);
    expect(row.endsWith(`"'=HYPERLINK(""http://x"",""click"")"`)).toBe(true);
    expect(cell('+1')).toBe("'+1");
    expect(cell('-1')).toBe("'-1");
    expect(cell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(cell('plain')).toBe('plain');
  });
});
