const { leaveDays } = require('../src/lib/leaveDays');
const { HOLIDAYS } = require('../src/lib/holidays');

// 13 and 14 April 2026 are public holidays (Sinhala & Tamil New Year), so they must not be deducted.
test('a Mon-Fri request over Sinhala & Tamil New Year counts only the working days', () => {
  expect(leaveDays('2026-04-13', '2026-04-17', HOLIDAYS)).toBe(3);
});
