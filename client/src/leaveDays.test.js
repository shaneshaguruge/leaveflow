import { describe, test, expect } from 'vitest';
import { workingDays } from './leaveDays';

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
