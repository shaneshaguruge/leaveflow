const { leaveDays } = require('../src/lib/leaveDays');

describe('leaveDays', () => {
  test('counts a normal Mon-Fri span as 5 days', () => {
    expect(leaveDays('2026-03-02', '2026-03-06')).toBe(5);
  });

  test('counts a single working day as 1', () => {
    expect(leaveDays('2026-03-04', '2026-03-04')).toBe(1);
  });

  test('excludes the weekend in a Fri-Mon span', () => {
    expect(leaveDays('2026-03-06', '2026-03-09')).toBe(2);
  });

  test('throws when end is before start', () => {
    expect(() => leaveDays('2026-03-06', '2026-03-02')).toThrow(
      'end_date must not be before start_date'
    );
  });

  test('excludes Vesak poya from a spanning request', () => {
    const holidays = ['2026-05-01']; // Vesak Full Moon Poya Day 2026
    expect(leaveDays('2026-04-29', '2026-05-04', holidays)).toBe(3);
  });

  test('throws on a value that is not a date', () => {
    expect(() => leaveDays('not-a-date', '2026-03-06')).toThrow('Invalid date');
  });

  test('counts a weekend-only span as 0', () => {
    expect(leaveDays('2026-03-07', '2026-03-08')).toBe(0);
  });

  test('does not subtract a holiday that falls on a weekend twice', () => {
    // 2026-05-02 (day after Vesak) is a Saturday: Wed 29 Apr - Mon 4 May is still 3.
    expect(leaveDays('2026-04-29', '2026-05-04', ['2026-05-01', '2026-05-02'])).toBe(3);
  });
});
