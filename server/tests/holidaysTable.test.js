// US-19: the public_holidays table (migration 006) is the one holiday list every day count uses.
require('./setup'); // shared pool; closes it after the file
const { pool } = require('../src/db/pool');
const { loadHolidays } = require('../src/lib/holidays');
const { leaveDays } = require('../src/lib/leaveDays');

describe('public_holidays (seeded by migration 006)', () => {
  test('holds the 25 Sri Lankan public holidays of 2026, each marked to confirm against the gazette', async () => {
    const q = await pool.query('SELECT holiday_date, name, year, note FROM public_holidays WHERE year = 2026');
    expect(q.rowCount).toBe(25);
    for (const r of q.rows) {
      expect(new Date(r.holiday_date + 'T00:00:00Z').toISOString().slice(0, 10)).toBe(r.holiday_date);
      expect(r.name.trim()).not.toBe('');
      expect(r.note).toMatch(/to confirm against the official gazette/);
    }
  });

  test('contains Vesak poya and Sinhala and Tamil New Year', async () => {
    const holidays = await loadHolidays();
    expect(holidays).toEqual(expect.arrayContaining(['2026-05-01', '2026-04-13', '2026-04-14']));
  });

  test('a Mon–Fri request over Sinhala & Tamil New Year counts only the working days (was the Phase 8 fire-drill test)', async () => {
    expect(leaveDays('2026-04-13', '2026-04-17', await loadHolidays())).toBe(3);
  });

  test('Vesak week from the table: Wed 29 Apr – Mon 4 May = 3', async () => {
    expect(leaveDays('2026-04-29', '2026-05-04', await loadHolidays())).toBe(3);
  });

  test('year is generated from the date and cannot disagree with it', async () => {
    const q = await pool.query("SELECT year FROM public_holidays WHERE holiday_date = '2026-12-25'");
    expect(q.rows[0].year).toBe(2026);
    await expect(pool.query("UPDATE public_holidays SET year = 2027 WHERE holiday_date = '2026-12-25'")).rejects.toThrow();
  });

  test('the same date cannot be a holiday twice (the date is the primary key)', async () => {
    await expect(pool.query("INSERT INTO public_holidays (holiday_date, name) VALUES ('2026-05-01', 'Labour Day')"))
      .rejects.toThrow(/duplicate key/);
  });

  test('existing requests default to a full day', async () => {
    const q = await pool.query(`SELECT column_default, is_nullable FROM information_schema.columns
      WHERE table_name = 'leave_requests' AND column_name = 'day_part'`);
    expect(q.rows[0]).toEqual({ column_default: "'FULL'::text", is_nullable: 'NO' });
  });
});
