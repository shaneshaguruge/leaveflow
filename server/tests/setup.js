// Required by every test file that touches the database (the API tests): each test starts from the same known world.
const { pool } = require('../src/db/pool'); // reads DATABASE_URL

beforeEach(async () => {
  await pool.query('TRUNCATE leave_requests, leave_balances RESTART IDENTITY CASCADE');
  // users and leave_types are re-seeded, not truncated: every test
  // relies on the same Ishara / Ruwan fixtures existing.
});

afterAll(async () => {
  await pool.end();
});
