// Capstone API: HR manages the holiday list (docs/capstone/stories.md US-21).
require('./setup'); // truncates leave_requests / leave_balances before every test (holidays are not truncated)
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const RUWAN = 'ruwan@ceylonroots.lk';
const ISHARA = 'ishara@ceylonroots.lk';
const DILINI = 'dilini@ceylonroots.lk';
const ANNUAL = 1;

async function loginAs(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.token;
}
const as = async (email) => `Bearer ${await loginAs(email)}`;
const usedDays = async () => {
  const q = await pool.query('SELECT used_days FROM leave_balances WHERE user_id = 2 AND leave_type_id = 1 AND year = 2026');
  return q.rowCount ? Number(q.rows[0].used_days) : 0;
};

// Every test leaves the seeded 2026 list exactly as migration 006 wrote it.
const SEEDED = { date: '2026-04-14', name: 'Sinhala and Tamil New Year Day', note: 'to confirm against the official gazette' };
afterEach(async () => {
  await pool.query("DELETE FROM public_holidays WHERE note IS NULL AND holiday_date IN ('2026-10-14', '2027-01-06')");
  await pool.query('INSERT INTO public_holidays (holiday_date, name, note) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [SEEDED.date, SEEDED.name, SEEDED.note]);
});

describe('GET /api/holidays (AC-21.1)', () => {
  test('HR sees the 2026 list by date, with names and the gazette note', async () => {
    const res = await request(app).get('/api/holidays?year=2026').set('Authorization', await as(DILINI));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(25);
    expect(res.body[0]).toEqual({ date: '2026-01-03', name: 'Duruthu Full Moon Poya Day', year: 2026,
      note: 'to confirm against the official gazette' });
    expect(res.body.map((h) => h.date)).toEqual([...res.body.map((h) => h.date)].sort());
  });

  test('a bad year is 400', async () => {
    const res = await request(app).get('/api/holidays?year=26').set('Authorization', await as(DILINI));
    expect(res.status).toBe(400);
  });
});

describe('only HR manages holidays (AC-21.4)', () => {
  test.each([['an employee', ISHARA], ['a manager', RUWAN]])('%s gets 403 on list, add and delete', async (_, email) => {
    const auth = await as(email);
    expect((await request(app).get('/api/holidays').set('Authorization', auth)).status).toBe(403);
    expect((await request(app).post('/api/holidays').set('Authorization', auth).send({ date: '2027-01-06', name: 'X' })).status).toBe(403);
    expect((await request(app).delete('/api/holidays/2026-05-01').set('Authorization', auth)).status).toBe(403);
  });

  test('no token is 401', async () => {
    expect((await request(app).get('/api/holidays')).status).toBe(401);
  });
});

describe('adding and deleting (AC-21.2, AC-21.3)', () => {
  test('HR adds a holiday: listed, excluded from day counts; the same date again is 409', async () => {
    const hr = await as(DILINI);
    const add = await request(app).post('/api/holidays').set('Authorization', hr).send({ date: '2027-01-06', name: '  Special holiday ' });
    expect(add.status).toBe(201);
    expect(add.body).toEqual({ holiday: { date: '2027-01-06', name: 'Special holiday', year: 2027, note: null }, adjusted: [] });
    expect((await request(app).get('/api/holidays?year=2027').set('Authorization', hr)).body.map((h) => h.date)).toEqual(['2027-01-06']);

    // Tue 5 – Thu 7 Jan 2027 now counts 2
    const r = await request(app).post('/api/leave-requests').set('Authorization', await as(ISHARA))
      .send({ leave_type_id: ANNUAL, start_date: '2027-01-05', end_date: '2027-01-07' });
    const mine = await request(app).get('/api/leave-requests').set('Authorization', await as(ISHARA));
    expect(mine.body.find((x) => x.id === r.body.id).days).toBe(2);

    const dup = await request(app).post('/api/holidays').set('Authorization', hr).send({ date: '2027-01-06', name: 'Again' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toEqual({ code: 'HOLIDAY_EXISTS', message: '2027-01-06 is already a holiday' });
  });

  test('HR deletes a holiday: gone, and the date counts as a working day again for pending requests', async () => {
    const hr = await as(DILINI);
    await request(app).post('/api/holidays').set('Authorization', hr).send({ date: '2027-01-06', name: 'Special holiday' });
    const r = await request(app).post('/api/leave-requests').set('Authorization', await as(ISHARA))
      .send({ leave_type_id: ANNUAL, start_date: '2027-01-05', end_date: '2027-01-07' });
    const del = await request(app).delete('/api/holidays/2027-01-06').set('Authorization', hr);
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ deleted: { date: '2027-01-06', name: 'Special holiday', year: 2027 }, not_recharged: [] });
    const mine = await request(app).get('/api/leave-requests').set('Authorization', await as(ISHARA));
    expect(mine.body.find((x) => x.id === r.body.id).days).toBe(3);
  });

  test('validation: bad date, empty name, unknown date to delete', async () => {
    const hr = await as(DILINI);
    expect((await request(app).post('/api/holidays').set('Authorization', hr).send({ date: '6 Jan', name: 'X' })).status).toBe(400);
    expect((await request(app).post('/api/holidays').set('Authorization', hr).send({ date: '2027-01-06', name: '  ' })).status).toBe(400);
    const missing = await request(app).delete('/api/holidays/2027-02-02').set('Authorization', hr);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });
});

describe('changing the list after approval (AC-21.5, AC-21.6)', () => {
  test('adding a holiday gives the day back to an approved request that covers it, and HR sees it', async () => {
    const r = await request(app).post('/api/leave-requests').set('Authorization', await as(ISHARA))
      .send({ leave_type_id: ANNUAL, start_date: '2026-10-12', end_date: '2026-10-14' }); // Mon–Wed = 3
    await request(app).patch(`/api/leave-requests/${r.body.id}`).set('Authorization', await as(RUWAN)).send({ action: 'approve' });
    expect(await usedDays()).toBe(3);

    const add = await request(app).post('/api/holidays').set('Authorization', await as(DILINI))
      .send({ date: '2026-10-14', name: 'Special bank holiday' });
    expect(add.status).toBe(201);
    expect(add.body.adjusted).toEqual([expect.objectContaining({
      id: r.body.id, employee_name: 'Ishara Fernando', days_before: 3, days_after: 2 })]);
    expect(await usedDays()).toBe(2);
  });

  test('deleting a holiday never re-charges approved leave, and HR sees who is covered', async () => {
    const r = await request(app).post('/api/leave-requests').set('Authorization', await as(ISHARA))
      .send({ leave_type_id: ANNUAL, start_date: '2026-04-13', end_date: '2026-04-17' }); // New Year week = 3
    await request(app).patch(`/api/leave-requests/${r.body.id}`).set('Authorization', await as(RUWAN)).send({ action: 'approve' });
    expect(await usedDays()).toBe(3);

    const del = await request(app).delete('/api/holidays/2026-04-14').set('Authorization', await as(DILINI));
    expect(del.status).toBe(200);
    expect(del.body.not_recharged).toEqual([expect.objectContaining({ id: r.body.id, employee_name: 'Ishara Fernando' })]);
    expect(await usedDays()).toBe(3); // still 3, not 4
  });

  test('demo question: a PM half day ending on a newly added holiday refunds 0.5, not 1.0, and keeps day_part PM', async () => {
    const r = await request(app).post('/api/leave-requests').set('Authorization', await as(ISHARA))
      .send({ leave_type_id: ANNUAL, start_date: '2026-10-12', end_date: '2026-10-14', day_part: 'PM' }); // 2.5
    await request(app).patch(`/api/leave-requests/${r.body.id}`).set('Authorization', await as(RUWAN)).send({ action: 'approve' });
    expect(await usedDays()).toBe(2.5);

    const add = await request(app).post('/api/holidays').set('Authorization', await as(DILINI))
      .send({ date: '2026-10-14', name: 'Special holiday' });
    expect(add.body.adjusted).toEqual([expect.objectContaining({ id: r.body.id, day_part: 'PM', days_before: 2.5, days_after: 2 })]);
    expect(await usedDays()).toBe(2); // refunded 0.5: only half of the 14th was ever charged
    const row = await pool.query('SELECT day_part, status FROM leave_requests WHERE id = $1', [r.body.id]);
    expect(row.rows[0]).toEqual({ day_part: 'PM', status: 'APPROVED' });
  });
});
