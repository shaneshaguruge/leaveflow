// Working days between two YYYY-MM-DD dates, inclusive, weekends excluded.
// Previews what the API will charge. Public holidays (poya days etc.) are NOT reflected here yet:
// the server skips them, so for ranges containing a holiday the API's count is authoritative.
export function workingDays(startDate, endDate) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) return 0;
  const cursor = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  let days = 0;
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(new Date(value + 'T00:00:00Z').getTime());
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
