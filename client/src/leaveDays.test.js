import { describe, test, expect } from 'vitest';
import { dateRangeLabel, workingDays } from './leaveDays';

describe('workingDays', () => {
  test('counts inclusive of both ends', () => {
    expect(workingDays('2026-03-02', '2026-03-06')).toBe(5); // Mon..Fri
    expect(workingDays('2026-03-02', '2026-03-02')).toBe(1);
  });
  test('skips weekends', () => {
    expect(workingDays('2026-03-06', '2026-03-09')).toBe(2); // Fri, Sat, Sun, Mon
    expect(workingDays('2026-03-07', '2026-03-08')).toBe(0); // Sat, Sun
  });
  test('returns 0 for invalid or reversed ranges', () => {
    expect(workingDays('2026-03-06', '2026-03-02')).toBe(0);
    expect(workingDays('', '2026-03-02')).toBe(0);
  });
});

describe('half days (Capstone US-17)', () => {
  test('a morning or an afternoon is 0.5; on the last day of a range it takes 0.5 off', () => {
    expect(workingDays('2026-10-09', '2026-10-09', 'AM')).toBe(0.5);
    expect(workingDays('2026-10-05', '2026-10-07', 'PM')).toBe(2.5);
  });
  test('a half day on a weekend is 0', () => {
    expect(workingDays('2026-10-10', '2026-10-10', 'AM')).toBe(0);
  });
  test('labels name the half-day date and part', () => {
    expect(dateRangeLabel({ start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'AM' })).toBe('2026-10-09 AM');
    expect(dateRangeLabel({ start_date: '2026-10-05', end_date: '2026-10-07', day_part: 'PM' }))
      .toBe('2026-10-05 → 2026-10-07 · 2026-10-07 PM');
    expect(dateRangeLabel({ start_date: '2026-10-05', end_date: '2026-10-07', day_part: 'FULL' })).toBe('2026-10-05 → 2026-10-07');
  });
});
