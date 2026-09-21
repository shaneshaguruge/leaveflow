// Do two requests from the same person overlap? Dates are inclusive. A request's day_part applies to its last day,
// so on that day it occupies only the morning (AM) or the afternoon (PM); on every other day, both halves.
function halvesOn(request, date) {
  if (date === request.end_date && request.day_part && request.day_part !== 'FULL') {
    return [request.day_part];
  }
  return ['AM', 'PM'];
}

function requestsClash(a, b) {
  const from = a.start_date > b.start_date ? a.start_date : b.start_date;
  const to = a.end_date < b.end_date ? a.end_date : b.end_date;
  if (from > to) return false; // no shared date
  const cursor = new Date(from + 'T00:00:00Z');
  const last = new Date(to + 'T00:00:00Z');
  while (cursor <= last) {
    const date = cursor.toISOString().slice(0, 10);
    const taken = halvesOn(a, date);
    if (halvesOn(b, date).some((half) => taken.includes(half))) return true;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return false;
}

module.exports = { requestsClash, halvesOn };
