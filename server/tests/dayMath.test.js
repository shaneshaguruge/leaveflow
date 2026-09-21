// Capstone day math, written BEFORE the implementation (docs/capstone/stories.md US-17, US-18, US-20).
// Pure functions only: no database. Holidays are passed in as 'YYYY-MM-DD' strings.
const { leaveDays } = require('../src/lib/leaveDays');
const { reservedDays, remainingDays } = require('../src/lib/balance');
const { requestsClash } = require('../src/lib/overlap');

const VESAK = '2026-05-01'; // Fri, Vesak Full Moon Poya Day
const MEDIN = '2026-03-02'; // Mon, Medin Full Moon Poya Day
const H2026 = [MEDIN, VESAK, '2026-05-02'];

describe('leaveDays with public holidays (US-20)', () => {
  test('a holiday inside a range is not counted (AC-20.1: Wed 29 Apr – Mon 4 May = 3)', () => {
    expect(leaveDays('2026-04-29', '2026-05-04', H2026)).toBe(3);
  });

  test('a range across a weekend and a holiday counts only working days (AC-20.2: Fri 27 Feb – Tue 3 Mar = 2)', () => {
    expect(leaveDays('2026-02-27', '2026-03-03', H2026)).toBe(2);
  });

  test('full day is the default: existing callers are unchanged', () => {
    expect(leaveDays('2026-03-09', '2026-03-13')).toBe(5);
    expect(leaveDays('2026-03-09', '2026-03-13', [], 'FULL')).toBe(5);
  });
});

describe('leaveDays with a day part (US-17)', () => {
  test('a single morning is 0.5', () => {
    expect(leaveDays('2026-10-09', '2026-10-09', [], 'AM')).toBe(0.5);
  });

  test('a single afternoon is 0.5', () => {
    expect(leaveDays('2026-10-09', '2026-10-09', [], 'PM')).toBe(0.5);
  });

  test('a half day on a poya is 0 (AC-20.3)', () => {
    expect(leaveDays(VESAK, VESAK, H2026, 'AM')).toBe(0);
    expect(leaveDays(MEDIN, MEDIN, H2026, 'PM')).toBe(0);
  });

  test('a half day on a weekend is 0', () => {
    expect(leaveDays('2026-10-10', '2026-10-10', [], 'AM')).toBe(0);
  });

  test('a PM half day on the last day of a range: Mon 5 – Wed 7 Oct + PM = 2.5', () => {
    expect(leaveDays('2026-10-05', '2026-10-07', [], 'PM')).toBe(2.5);
  });

  test('a morning on the last day of a range that ends on a holiday adds nothing: Wed 29 Apr – Fri 1 May + AM = 2', () => {
    expect(leaveDays('2026-04-29', VESAK, H2026, 'AM')).toBe(2);
  });

  test('a half day on the last day, across a weekend and a holiday: Fri 27 Feb – Tue 3 Mar + AM = 1.5', () => {
    expect(leaveDays('2026-02-27', '2026-03-03', H2026, 'AM')).toBe(1.5);
  });

  test('an unknown day part is rejected', () => {
    expect(() => leaveDays('2026-10-09', '2026-10-09', [], 'EVENING')).toThrow('day_part must be FULL, AM or PM');
  });
});

describe('balance with half days (US-18)', () => {
  const halfDay = { start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' };
  const fullWeek = { start_date: '2026-10-12', end_date: '2026-10-16', day_part: 'FULL' };

  test('a pending half day reserves 0.5 (AC-18.2)', () => {
    expect(reservedDays([halfDay], [])).toBe(0.5);
    expect(reservedDays([halfDay, fullWeek], [])).toBe(5.5);
  });

  test('cancelling a pending half day refunds 0.5 (AC-18.3): 13.5 remaining → 14', () => {
    const before = remainingDays({ allocation: 14, used: 0, pending: reservedDays([halfDay], []) });
    const after = remainingDays({ allocation: 14, used: 0, pending: reservedDays([], []) });
    expect(before).toBe(13.5);
    expect(after).toBe(14);
    expect(after - before).toBe(0.5);
  });

  test('an approved half day leaves 13.5 of 14 (AC-18.1)', () => {
    expect(remainingDays({ allocation: 14, used: 0.5, pending: 0 })).toBe(13.5);
  });

  test('pending days skip holidays too (AC-20.4)', () => {
    expect(reservedDays([{ start_date: '2026-04-29', end_date: '2026-05-04', day_part: 'FULL' }], H2026)).toBe(3);
  });
});

describe('requestsClash: which requests overlap (AC-17.4)', () => {
  const on = (start_date, end_date, day_part) => ({ start_date, end_date, day_part });

  test('a morning and an afternoon on the same date do not clash', () => {
    expect(requestsClash(on('2026-10-09', '2026-10-09', 'AM'), on('2026-10-09', '2026-10-09', 'PM'))).toBe(false);
  });

  test('two mornings on the same date clash', () => {
    expect(requestsClash(on('2026-10-09', '2026-10-09', 'AM'), on('2026-10-09', '2026-10-09', 'AM'))).toBe(true);
  });

  test('a full day clashes with a half day on that date', () => {
    expect(requestsClash(on('2026-10-09', '2026-10-09', 'FULL'), on('2026-10-09', '2026-10-09', 'PM'))).toBe(true);
  });

  test('Mon–Wed ending with PM leaves Wednesday morning free', () => {
    expect(requestsClash(on('2026-10-05', '2026-10-07', 'PM'), on('2026-10-07', '2026-10-07', 'AM'))).toBe(false);
  });

  test('Mon–Wed ending with AM still covers the whole of Tuesday', () => {
    expect(requestsClash(on('2026-10-05', '2026-10-07', 'AM'), on('2026-10-06', '2026-10-06', 'PM'))).toBe(true);
  });

  test('ranges that do not share a date never clash', () => {
    expect(requestsClash(on('2026-10-05', '2026-10-07', 'FULL'), on('2026-10-08', '2026-10-08', 'FULL'))).toBe(false);
  });

  test('a range ending on the start day of another clashes (the BUG-002 case)', () => {
    expect(requestsClash(on('2026-10-01', '2026-10-05', 'FULL'), on('2026-10-05', '2026-10-07', 'FULL'))).toBe(true);
  });
});
