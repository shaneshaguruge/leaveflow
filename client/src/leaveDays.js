// Working days between two YYYY-MM-DD dates, inclusive, weekends excluded.
// Previews what the API will charge. Public holidays (poya days etc.) are NOT reflected here yet:
// the server skips them, so for ranges containing a holiday the API's count is authoritative.
// dayPart applies to the last day: AM or PM makes that day a half (0.5) if it is a weekday.
export function workingDays(startDate, endDate, dayPart = 'FULL') {
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) return 0;
  const cursor = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  let days = 0;
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const last = end.getUTCDay();
  if (dayPart !== 'FULL' && last !== 0 && last !== 6) days -= 0.5;
  return days;
}

// "2026-10-09 AM" for a half day (the part is on the last day); null for a full-day request.
export function halfDayLabel(request) {
  return request.day_part && request.day_part !== 'FULL' ? `${request.end_date} ${request.day_part}` : null;
}

// "2026-10-09", "2026-10-09 AM", "2026-10-05 → 2026-10-07" or "2026-10-05 → 2026-10-07 · 2026-10-07 AM".
export function dateRangeLabel(request) {
  const half = halfDayLabel(request);
  if (request.start_date === request.end_date) return half || request.start_date;
  const range = `${request.start_date} → ${request.end_date}`;
  return half ? `${range} · ${half}` : range;
}

export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(new Date(value + 'T00:00:00Z').getTime());
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
