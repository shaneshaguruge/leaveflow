// Public holidays come from the public_holidays table (migration 006), maintained by HR in the app.
// Returns every holiday as a 'YYYY-MM-DD' string for leaveDays(). The table is small (~25 rows a year), so
// loading it per request keeps every day count in the system on the same, current list.
const pool = require('../db/pool');

async function loadHolidays(db = pool) {
  const q = await db.query('SELECT holiday_date FROM public_holidays ORDER BY holiday_date');
  return q.rows.map((r) => r.holiday_date);
}

module.exports = { loadHolidays };
