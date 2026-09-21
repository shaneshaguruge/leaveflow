// Capstone API: half days and holiday-aware counting (docs/capstone/stories.md US-17, US-18, US-20).
require('./setup'); // truncates leave_requests / leave_balances before every test
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const RUWAN = 'ruwan@ceylonroots.lk';
const ISHARA = 'ishara@ceylonroots.lk';
const ANNUAL = 1, CASUAL = 2, SICK = 3;

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.token;
}
const apply = async (email, body) => request(app).post('/api/leave-requests')
  .set('Authorization', `Bearer ${await loginAs(email)}`).send({ leave_type_id: ANNUAL, reason: 'Errand', ...body });
const act = async (email, id, action) => request(app).patch(`/api/leave-requests/${id}`)
  .set('Authorization', `Bearer ${await loginAs(email)}`).send({ action });
const balances = async (email) => Object.fromEntries(
  (await request(app).get('/api/balances').set('Authorization', `Bearer ${await loginAs(email)}`)).body.map((b) => [b.id, b]));
async function usedDays(userId, typeId, year = 2026) {
  const q = await pool.query('SELECT used_days FROM leave_balances WHERE user_id = $1 AND leave_type_id = $2 AND year = $3',
    [userId, typeId, year]);
  return q.rowCount ? Number(q.rows[0].used_days) : 0;
}

describe('booking a half day (US-17)', () => {
  test('a morning half day is saved with day_part AM (AC-17.1)', async () => {
    const res = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' });
    expect(res.status).toBe(201);
    expect(res.body.day_part).toBe('AM');
  });

  test('without day_part the request is a full day, as before (AC-17.5)', async () => {
    const res = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09' });
    expect(res.status).toBe(201);
    expect(res.body.day_part).toBe('FULL');
  });

  test('an unknown day_part is refused with 400', async () => {
    const res = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'EVENING' });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'day_part: must be FULL, AM or PM' });
  });

  test('Sick leave cannot be a half day (AC-17.6)', async () => {
    const res = await apply(ISHARA, { leave_type_id: SICK, start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'PM' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Half days are for Annual or Casual leave');
  });

  test('a morning and an afternoon on the same date are both accepted; a second morning or a full day clash (AC-17.4)', async () => {
    const day = { start_date: '2026-10-09', end_date: '2026-10-09' };
    expect((await apply(ISHARA, { ...day, day_part: 'AM' })).status).toBe(201);
    expect((await apply(ISHARA, { ...day, day_part: 'PM', leave_type_id: CASUAL })).status).toBe(201);
    const again = await apply(ISHARA, { ...day, day_part: 'AM' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('OVERLAPPING_REQUEST');
    expect((await apply(ISHARA, { ...day, start_date: '2026-10-08' })).status).toBe(409);
  });

  test('a half day on Vesak poya is refused and the message names the holiday (AC-20.3)', async () => {
    const res = await apply(ISHARA, { start_date: '2026-05-01', end_date: '2026-05-01', day_part: 'AM' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('2026-05-01 is Vesak Full Moon Poya Day + International Labour Day — no leave needed');
  });
});

describe('half-day balance math (US-18)', () => {
  test('an approved Annual half day takes exactly 0.5 from Annual only: 14 → 13.5 (AC-18.1)', async () => {
    const r = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'PM' });
    expect((await act(RUWAN, r.body.id, 'approve')).status).toBe(200);
    const b = await balances(ISHARA);
    expect(b[ANNUAL]).toMatchObject({ used_days: 0.5, pending_days: 0, remaining_days: 13.5 });
    expect(b[CASUAL].remaining_days).toBe(7);
    expect(b[SICK].remaining_days).toBe(7);
  });

  test('an approved Casual half day takes 0.5 from Casual only: 7 → 6.5 (AC-18.1b)', async () => {
    const r = await apply(ISHARA, { leave_type_id: CASUAL, start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' });
    expect((await act(RUWAN, r.body.id, 'approve')).status).toBe(200);
    const b = await balances(ISHARA);
    expect(b[CASUAL]).toMatchObject({ used_days: 0.5, remaining_days: 6.5 });
    expect(b[ANNUAL].remaining_days).toBe(14);
  });

  test('a pending half day reserves 0.5, and cancelling it gives the 0.5 back (AC-18.2, AC-18.3)', async () => {
    const r = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' });
    expect((await balances(ISHARA))[ANNUAL]).toMatchObject({ pending_days: 0.5, remaining_days: 13.5 });
    expect((await act(ISHARA, r.body.id, 'cancel')).status).toBe(200);
    expect((await balances(ISHARA))[ANNUAL]).toMatchObject({ pending_days: 0, remaining_days: 14 });
  });

  test('a rejected half day deducts nothing (AC-18.4)', async () => {
    const r = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' });
    expect((await act(RUWAN, r.body.id, 'reject')).status).toBe(200);
    expect(await usedDays(2, ANNUAL)).toBe(0);
  });

  test('with 0.5 left a half day is accepted and a full day refused (AC-18.5)', async () => {
    await pool.query('INSERT INTO leave_balances (user_id, leave_type_id, year, used_days) VALUES (2, 1, 2026, 13.5)');
    expect((await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09' })).status).toBe(409);
    expect((await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' })).status).toBe(201);
  });

  test('Mon–Wed ending with a morning costs 2.5 when approved (AC-17.3)', async () => {
    const r = await apply(ISHARA, { start_date: '2026-10-05', end_date: '2026-10-07', day_part: 'AM' });
    expect((await act(RUWAN, r.body.id, 'approve')).status).toBe(200);
    expect(await usedDays(2, ANNUAL)).toBe(2.5);
  });

  test("the manager's card shows the day part, 0.5 days and the balance after (AC-18.6)", async () => {
    const r = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'PM' });
    const cards = await request(app).get('/api/team/requests').set('Authorization', `Bearer ${await loginAs(RUWAN)}`);
    expect(cards.body.find((c) => c.id === r.body.id)).toMatchObject({ day_part: 'PM', days: 0.5, remaining_days: 14, remaining_after: 13.5 });
  });

  test('My requests lists the day part and 0.5 days (AC-18.7)', async () => {
    const r = await apply(ISHARA, { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' });
    const mine = await request(app).get('/api/leave-requests').set('Authorization', `Bearer ${await loginAs(ISHARA)}`);
    expect(mine.body.find((x) => x.id === r.body.id)).toMatchObject({ day_part: 'AM', days: 0.5 });
  });
});

describe('holiday-aware counting through the API (US-20)', () => {
  test('Vesak inside a longer request is never deducted: Wed 29 Apr – Mon 4 May uses 3 (AC-20.1, AC-20.4)', async () => {
    const r = await apply(ISHARA, { start_date: '2026-04-29', end_date: '2026-05-04' });
    expect((await balances(ISHARA))[ANNUAL].pending_days).toBe(3);
    expect((await act(RUWAN, r.body.id, 'approve')).status).toBe(200);
    expect(await usedDays(2, ANNUAL)).toBe(3);
  });

  test('Friday to Tuesday over a long weekend (Medin poya Monday) deducts only Friday and Tuesday (AC-20.2)', async () => {
    const r = await apply(ISHARA, { start_date: '2026-02-27', end_date: '2026-03-03' });
    expect((await act(RUWAN, r.body.id, 'approve')).status).toBe(200);
    expect(await usedDays(2, ANNUAL)).toBe(2);
  });
});
