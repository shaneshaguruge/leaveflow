// API tests: the real Express app (no listening server) against the real leaveflow_test database.
require('./setup'); // truncates leave_requests / leave_balances before every test
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

// Seeded by migrations 002/003 and never truncated: password 'password123' for everyone.
const RUWAN = 'ruwan@ceylonroots.lk'; //   id 1, MANAGER, Ishara's manager
const ISHARA = 'ishara@ceylonroots.lk'; // id 2, EMPLOYEE
const DILINI = 'dilini@ceylonroots.lk'; // id 3, HR_ADMIN
const ANNUAL = 1;

async function loginAs(email) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'password123' });
  expect(res.status).toBe(200);
  return res.body.token;
}

function apply(token, body) {
  return request(app)
    .post('/api/leave-requests')
    .set('Authorization', `Bearer ${token}`)
    .send({ leave_type_id: ANNUAL, reason: 'Family trip', ...body });
}

function act(token, id, action) {
  return request(app)
    .patch(`/api/leave-requests/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ action });
}

async function usedDays(userId, leaveTypeId, year) {
  const q = await pool.query(
    'SELECT used_days FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3',
    [userId, leaveTypeId, year]);
  return q.rowCount ? Number(q.rows[0].used_days) : 0;
}

describe('POST /api/leave-requests', () => {
  test('creates a PENDING request for a valid submission', async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { start_date: '2026-03-02', end_date: '2026-03-06' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.user_id).toBe(2);
    expect(res.body.start_date).toBe('2026-03-02'); // DATE round-trips as the same string, not a day early
  });

  test('rejects end_date before start_date with 400', async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { start_date: '2026-03-06', end_date: '2026-03-02', reason: 'Oops' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects an unknown leave type with 400 BAD_TYPE', async () => {
    const token = await loginAs(ISHARA);
    const res = await apply(token, { leave_type_id: 999, start_date: '2026-03-09', end_date: '2026-03-10' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_TYPE');
  });

  test('rejects a missing token with 401', async () => {
    const res = await request(app).post('/api/leave-requests').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_TOKEN');
  });

  test('rejects a forged token with 401', async () => {
    const res = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', 'Bearer not.a.real.token')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('BAD_TOKEN');
  });

  test('refuses dates overlapping an existing PENDING request with 409', async () => {
    const token = await loginAs(ISHARA);
    expect((await apply(token, { start_date: '2026-06-15', end_date: '2026-06-17' })).status).toBe(201);
    const res = await apply(token, { start_date: '2026-06-17', end_date: '2026-06-19' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OVERLAPPING_REQUEST');
  });

  test('refuses a request larger than the remaining balance with 409', async () => {
    const token = await loginAs(ISHARA);
    // Mon 6 Jul - Fri 24 Jul 2026: 15 working days, no holidays; the Annual allocation is 14.
    const res = await apply(token, { start_date: '2026-07-06', end_date: '2026-07-24' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
  });
});

describe('GET /api/leave-requests', () => {
  test('an employee sees only their own requests', async () => {
    await apply(await loginAs(RUWAN), { start_date: '2026-06-08', end_date: '2026-06-09' });
    const ishara = await loginAs(ISHARA);
    await apply(ishara, { start_date: '2026-06-10', end_date: '2026-06-11' });
    const res = await request(app).get('/api/leave-requests').set('Authorization', `Bearer ${ishara}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user_id).toBe(2);
  });

  test("an HR admin sees everyone's requests", async () => {
    await apply(await loginAs(RUWAN), { start_date: '2026-06-08', end_date: '2026-06-09' });
    await apply(await loginAs(ISHARA), { start_date: '2026-06-10', end_date: '2026-06-11' });
    const hr = await loginAs(DILINI);
    const res = await request(app).get('/api/leave-requests').set('Authorization', `Bearer ${hr}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('each request carries the employee name (HR All requests shows names, not ids)', async () => {
    await apply(await loginAs(RUWAN), { start_date: '2026-06-08', end_date: '2026-06-09' });
    await apply(await loginAs(ISHARA), { start_date: '2026-06-10', end_date: '2026-06-11' });
    const hr = await request(app).get('/api/leave-requests').set('Authorization', `Bearer ${await loginAs(DILINI)}`);
    expect(hr.body.map((r) => [r.user_id, r.employee_name]).sort()).toEqual([[1, 'Ruwan Jayasuriya'], [2, 'Ishara Fernando']]);
    const own = await request(app).get('/api/leave-requests').set('Authorization', `Bearer ${await loginAs(ISHARA)}`);
    expect(own.body.map((r) => r.employee_name)).toEqual(['Ishara Fernando']); // still only her own
  });
});

describe('PATCH /api/leave-requests/:id', () => {
  test('happy path: employee applies, sees it listed, manager approves, balance is deducted', async () => {
    const ishara = await loginAs(ISHARA);
    // Mon 9 - Fri 13 Mar 2026: five working days, no holidays (Nadeesha's five-day demo approval).
    const created = await apply(ishara, { start_date: '2026-03-09', end_date: '2026-03-13' });
    expect(created.status).toBe(201);

    const list = await request(app).get('/api/leave-requests').set('Authorization', `Bearer ${ishara}`);
    expect(list.status).toBe(200);
    expect(list.body.map((r) => r.id)).toEqual([created.body.id]);

    const approved = await act(await loginAs(RUWAN), created.body.id, 'approve');
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('APPROVED');
    expect(approved.body.decided_by).toBe(1);
    expect(approved.body.decided_at).not.toBeNull();
    expect(await usedDays(2, ANNUAL, 2026)).toBe(5); // 14 - 5 = 9 remaining
  });

  test('US-4 reject: the manager rejects a PENDING request, nothing is deducted, and the decision is final', async () => {
    const ishara = await loginAs(ISHARA);
    const created = await apply(ishara, { start_date: '2026-03-09', end_date: '2026-03-13' });
    expect(created.status).toBe(201);

    const ruwan = await loginAs(RUWAN);
    const rejected = await act(ruwan, created.body.id, 'reject');
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe('REJECTED');
    expect(rejected.body.decided_by).toBe(1);
    expect(rejected.body.decided_at).not.toBeNull();
    expect(await usedDays(2, ANNUAL, 2026)).toBe(0); // a rejection never touches the balance

    const mine = await request(app).get('/api/leave-requests').set('Authorization', `Bearer ${ishara}`);
    expect(mine.body.find((r) => r.id === created.body.id).status).toBe('REJECTED'); // US-10: Ishara sees it

    const pending = await request(app).get('/api/team/requests').set('Authorization', `Bearer ${ruwan}`);
    expect(pending.body.map((r) => r.id)).not.toContain(created.body.id); // gone from Approvals

    const again = await act(ruwan, created.body.id, 'approve');
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATE');
    expect(await usedDays(2, ANNUAL, 2026)).toBe(0);
  });

  test('forbids an EMPLOYEE rejecting a request with 403', async () => {
    const token = await loginAs(ISHARA);
    const created = await apply(token, { start_date: '2026-03-09', end_date: '2026-03-10' });
    const res = await act(token, created.body.id, 'reject');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('approving a request spanning Vesak poya deducts 3 days, not 4', async () => {
    const created = await apply(await loginAs(ISHARA), { start_date: '2026-04-29', end_date: '2026-05-04' });
    expect(created.status).toBe(201);
    expect((await act(await loginAs(RUWAN), created.body.id, 'approve')).status).toBe(200);
    expect(await usedDays(2, ANNUAL, 2026)).toBe(3);
  });

  test('forbids an EMPLOYEE approving a request with 403', async () => {
    const token = await loginAs(ISHARA);
    const created = await apply(token, { start_date: '2026-03-09', end_date: '2026-03-10' });
    const res = await act(token, created.body.id, 'approve');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await usedDays(2, ANNUAL, 2026)).toBe(0);
  });

  test('forbids a manager approving their own request with 403', async () => {
    const ruwan = await loginAs(RUWAN);
    const created = await apply(ruwan, { start_date: '2026-03-09', end_date: '2026-03-10' });
    const res = await act(ruwan, created.body.id, 'approve');
    expect(res.status).toBe(403);
  });

  test('refuses to approve an already-APPROVED request with 409 (decisions are final)', async () => {
    const created = await apply(await loginAs(ISHARA), { start_date: '2026-03-09', end_date: '2026-03-10' });
    const ruwan = await loginAs(RUWAN);
    expect((await act(ruwan, created.body.id, 'approve')).status).toBe(200);
    const again = await act(ruwan, created.body.id, 'approve');
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATE');
    expect(await usedDays(2, ANNUAL, 2026)).toBe(2); // not deducted twice
  });

  test('returns 404 for a request that does not exist', async () => {
    const res = await act(await loginAs(RUWAN), 999, 'approve');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('rejects an unknown action with 400', async () => {
    const res = await act(await loginAs(RUWAN), 1, 'delete');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('cancelling a request', () => {
  test('the owner cancels a PENDING request (200, CANCELLED)', async () => {
    const ishara = await loginAs(ISHARA);
    const created = await apply(ishara, { start_date: '2026-03-09', end_date: '2026-03-10' });
    const res = await act(ishara, created.body.id, 'cancel');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
  });

  test('cancelling an APPROVED request is refused with 409', async () => {
    const ishara = await loginAs(ISHARA);
    const created = await apply(ishara, { start_date: '2026-03-09', end_date: '2026-03-10' });
    expect((await act(await loginAs(RUWAN), created.body.id, 'approve')).status).toBe(200);
    const res = await act(ishara, created.body.id, 'cancel');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test("cancelling someone else's request is forbidden with 403", async () => {
    const created = await apply(await loginAs(ISHARA), { start_date: '2026-03-09', end_date: '2026-03-10' });
    const res = await act(await loginAs(RUWAN), created.body.id, 'cancel');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
