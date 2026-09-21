// Manager approvals (wireframe docs/wireframes/manager-approvals.jpeg): balance after approval, newest first, history.
require('./setup'); // truncates leave_requests / leave_balances before every test
const request = require('supertest');
const app = require('../src/app');

const RUWAN = 'ruwan@ceylonroots.lk'; //   MANAGER of Ishara and Kasun
const ISHARA = 'ishara@ceylonroots.lk';
const KASUN = 'kasun@ceylonroots.lk';
const DILINI = 'dilini@ceylonroots.lk'; // HR_ADMIN

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.token;
}

async function apply(email, start_date, end_date, leave_type_id = 1) {
  const res = await request(app).post('/api/leave-requests').set('Authorization', `Bearer ${await loginAs(email)}`)
    .send({ leave_type_id, start_date, end_date, reason: 'Test' });
  expect(res.status).toBe(201);
  return res.body.id;
}

async function decide(email, id, action) {
  const res = await request(app).patch(`/api/leave-requests/${id}`).set('Authorization', `Bearer ${await loginAs(email)}`)
    .send({ action });
  expect(res.status).toBe(200);
}

const get = async (email, query = {}) =>
  request(app).get('/api/team/requests').query(query).set('Authorization', `Bearer ${await loginAs(email)}`);

describe('GET /api/team/requests (Approvals list)', () => {
  test('each pending card carries working days and the balance before and after approving ("10 → 7 after")', async () => {
    const first = await apply(ISHARA, '2026-03-09', '2026-03-10'); // 2 days
    await decide(RUWAN, first, 'approve'); // Annual: 14 − 2 = 12 left
    const vesak = await apply(ISHARA, '2026-04-29', '2026-05-04'); // spans Vesak poya + weekend: 3 working days

    const res = await get(RUWAN);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({ id: vesak, days: 3, remaining_days: 12, remaining_after: 9 })]);
  });

  test('the pending list is newest first', async () => {
    const older = await apply(ISHARA, '2026-03-09', '2026-03-09');
    const newer = await apply(KASUN, '2026-03-10', '2026-03-10');
    const newest = await apply(ISHARA, '2026-03-11', '2026-03-11', 2);
    expect((await get(RUWAN)).body.map((r) => r.id)).toEqual([newest, newer, older]);
  });
});

describe('GET /api/team/requests?history=true', () => {
  test("lists the manager's team's APPROVED and REJECTED requests with who decided, most recent decision first", async () => {
    const a = await apply(ISHARA, '2026-03-09', '2026-03-09');
    const b = await apply(KASUN, '2026-03-10', '2026-03-10');
    const c = await apply(ISHARA, '2026-03-11', '2026-03-11'); // stays PENDING
    const d = await apply(DILINI, '2026-03-12', '2026-03-12'); // not Ruwan's report
    await decide(RUWAN, a, 'approve');
    await decide(RUWAN, b, 'reject');
    await decide(DILINI, d, 'approve');

    const res = await get(RUWAN, { history: 'true' });
    expect(res.status).toBe(200);
    expect(res.body.map((r) => [r.id, r.status, r.decided_by_name])).toEqual([
      [b, 'REJECTED', 'Ruwan Jayasuriya'],
      [a, 'APPROVED', 'Ruwan Jayasuriya'],
    ]);
    expect(res.body.map((r) => r.id)).not.toContain(c);
    // HR sees the company-wide history
    expect((await get(DILINI, { history: 'true' })).body.map((r) => r.id)).toEqual([d, b, a]);
  });

  test('403 for an EMPLOYEE, 400 for a bad value', async () => {
    expect((await get(ISHARA, { history: 'true' })).status).toBe(403);
    const bad = await get(RUWAN, { history: 'yes' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });
});
