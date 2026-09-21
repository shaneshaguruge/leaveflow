// Working days between two dates, inclusive, excluding weekends.
// holidays: array of 'YYYY-MM-DD' strings (poya days etc.) — excluded too.
// dayPart describes the LAST day of the request: FULL (whole day), AM (morning off) or PM (afternoon off).
// A half day costs 0.5, but only if that last day is a working day (a half day on a poya or a weekend is 0).
const DAY_PARTS = ['FULL', 'AM', 'PM'];

function isWorkingDay(date, holidays) {
  const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6 && !holidays.includes(date.toISOString().slice(0, 10));
}

function leaveDays(startDate, endDate, holidays = [], dayPart = 'FULL') {
  if (!DAY_PARTS.includes(dayPart)) {
    throw new Error('day_part must be FULL, AM or PM');
  }
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date');
  }
  if (end < start) {
    throw new Error('end_date must not be before start_date');
  }
  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (isWorkingDay(cursor, holidays)) {
      days += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (dayPart !== 'FULL' && isWorkingDay(end, holidays)) {
    days -= 0.5;
  }
  return days;
}

module.exports = { leaveDays, DAY_PARTS };
