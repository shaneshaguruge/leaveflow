// Balance arithmetic in one place. Reserved = the days of PENDING requests; remaining = allocation − used − reserved.
const { leaveDays } = require('./leaveDays');

// requests: [{ start_date, end_date, day_part }] — the pending ones. Cancelling a request removes it from this list,
// which is how a cancelled half day gives its 0.5 back.
function reservedDays(requests, holidays) {
  return requests.reduce((sum, r) => sum + leaveDays(r.start_date, r.end_date, holidays, r.day_part || 'FULL'), 0);
}

function remainingDays({ allocation, used, pending }) {
  return allocation - used - pending;
}

module.exports = { reservedDays, remainingDays };
