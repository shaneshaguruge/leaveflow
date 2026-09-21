// US-16: while reviewing a request, a manager sees who else on the team is already off (GET /api/team/requests?from=&to=).
require('./setup'); // truncates leave_requests / leave_balances before every test
const request = require('supertest');
const app = require('../src/app');

// Seeded by migrations 002/005, never truncated: password 'password123' for everyone.
const RUWAN = 'ruwan@ceylonroots.lk'; //   MANAGER of Ishara and Kasun
const ISHARA = 'ishara@ceylonroots.lk'; // EMPLOYEE, reports to Ruwan
const KASUN = 'kasun@ceylonroots.lk'; //   EMPLOYEE, reports to Ruwan
const DILINI = 'dilini@ceylonroots.lk'; // HR_ADMIN, nobody's report
const ANNUAL = 1;

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.token;
}

async function apply(email, start_date, end_date) {
  const res = await request(app)
    .post('/api/leave-requests')
    .set('Authorization', `Bearer ${await loginAs(email)}`)
    .send({ leave_type_id: ANNUAL, start_date, end_date, reason: 'Test' });
  expect(res.status).toBe(201);
  return res.body.id;
}

async function decide(approverEmail, id, action) {
  const res = await request(app)
    .patch(`/api/leave-requests/${id}`)
    .set('Authorization', `Bearer ${await loginAs(approverEmail)}`)
    .send({ action });
  expect(res.status).toBe(200);
}

function teamWeek(token, from, to) {
  return request(app).get('/api/team/requests').query({ from, to }).set('Authorization', `Bearer ${token}`);
}

describe('GET /api/team/requests?from=&to= (who else is off)', () => {
  test('200 with the overlapping APPROVED leave of the manager\'s own reports only', async () => {
    // Under review: Ishara's PENDING Mon 16 - Wed 18 Nov 2026.
    await apply(ISHARA, '2026-11-16', '2026-11-18');
    // Kasun (Ruwan's report), APPROVED, overlaps on the 18th -> shown.
    const kasunIn = await apply(KASUN, '2026-11-18', '2026-11-20');
    await decide(RUWAN, kasunIn, 'approve');
    // Kasun, APPROVED, ends the day before -> not shown.
    const kasunBefore = await apply(KASUN, '2026-11-12', '2026-11-13');
    await decide(RUWAN, kasunBefore, 'approve');
    // Dilini (not Ruwan's report), APPROVED by HR, overlaps -> not shown to Ruwan.
    const dilini = await apply(DILINI, '2026-11-16', '2026-11-16');
    await decide(DILINI, dilini, 'approve');

    const res = await teamWeek(await loginAs(RUWAN), '2026-11-16', '2026-11-18');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({
      id: kasunIn, employee_name: 'Kasun Perera', start_date: '2026-11-18', end_date: '2026-11-20', status: 'APPROVED',
    })]);
  });

  test('a REJECTED or still-PENDING overlap is not listed', async () => {
    const rejected = await apply(KASUN, '2026-11-16', '2026-11-16');
    await decide(RUWAN, rejected, 'reject');
    await apply(KASUN, '2026-11-17', '2026-11-17'); // stays PENDING

    const res = await teamWeek(await loginAs(RUWAN), '2026-11-16', '2026-11-18');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('empty array when nobody on the team is off', async () => {
    const res = await teamWeek(await loginAs(RUWAN), '2026-10-05', '2026-10-07');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('HR_ADMIN sees overlapping approved leave across the company', async () => {
    const id = await apply(ISHARA, '2026-11-16', '2026-11-16');
    await decide(RUWAN, id, 'approve');
    const res = await teamWeek(await loginAs(DILINI), '2026-11-16', '2026-11-18');
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.employee_name)).toEqual(['Ishara Fernando']);
  });

  test('403 for an EMPLOYEE', async () => {
    const res = await teamWeek(await loginAs(ISHARA), '2026-11-16', '2026-11-18');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('401 without a token', async () => {
    const res = await request(app).get('/api/team/requests').query({ from: '2026-11-16', to: '2026-11-18' });
    expect(res.status).toBe(401);
  });

  test('400 VALIDATION_ERROR for a bad or reversed range', async () => {
    const token = await loginAs(RUWAN);
    for (const [from, to] of [['2026-11-16', undefined], ['16/11/2026', '2026-11-18'], ['2026-11-18', '2026-11-16']]) {
      const res = await teamWeek(token, from, to);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  test('a SQL-looking value is just an invalid date (parameters only)', async () => {
    const res = await teamWeek(await loginAs(RUWAN), "2026-11-16' OR '1'='1", '2026-11-18');
    expect(res.status).toBe(400);
  });

  test('without from/to the route still returns the PENDING approvals list', async () => {
    const id = await apply(ISHARA, '2026-11-16', '2026-11-16');
    const res = await request(app).get('/api/team/requests').set('Authorization', `Bearer ${await loginAs(RUWAN)}`);
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.id)).toEqual([id]);
  });
});
