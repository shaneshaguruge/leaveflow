# BUG-001 — API process exits when PostgreSQL restarts

| | |
|---|---|
| **Title** | The whole API process crashes when the PostgreSQL server restarts; it does not come back when the database does |
| **Reported** | 2026-09-21, while hardening the API (Phase 5 Part E) |
| **Component** | `server/src/db/pool.js` (pg connection pool) |
| **Severity** | **High** — every endpoint is down until someone restarts the API by hand; no data is lost |
| **Priority** | **High** — a database restart (maintenance, failover, a crashed DB container) is routine in production |
| **Status** | **Fixed** in PR #17 (`feat/hardening`, commit `090756f`) |

## Steps to reproduce

1. Start the database (`cd server && npm run db`) and the API (`npm run dev`).
2. Make any request that uses the database so the pool holds an idle client, e.g. log in:
   `POST http://localhost:4000/api/auth/login` with `{ "email": "ishara@ceylonroots.lk", "password": "password123" }`.
3. Restart PostgreSQL while the API keeps running (`npm run db:stop`, then `npm run db`).
4. Call `GET http://localhost:4000/api/health`.

## Expected

The API stays up. Requests made while the database is down fail with `500 INTERNAL` ("Something went wrong"),
and once PostgreSQL is back the pool opens new connections and requests succeed again, with no manual restart.

## Actual

At step 3 the API process exits. PostgreSQL closes the pool's idle connection with
`57P01 terminating connection due to administrator command`; `pg` reports that as an `'error'` event on the pool,
and because nothing listened for that event Node treated it as an unhandled error and terminated the process.
At step 4 the request fails because nothing is listening on port 4000, and it keeps failing after the database is back.

## Environment

- Windows 11 Pro, Node v24.14.0, npm 11.19.1
- PostgreSQL 16 on localhost:5432 (started via `npm run db`, the `embedded-postgres` dev helper)
- `pg` ^8.23.0, Express 5, API at commit before `090756f` (branch `feat/hardening`)

## Root cause and fix

`pg.Pool` emits `'error'` when an **idle** client loses its connection. An `EventEmitter` `'error'` event with no
listener is thrown, which kills the process. The fix (PR #17) adds a listener in `server/src/db/pool.js` that
logs the error code and message; the dead client is discarded and the pool reconnects on the next query.
Verified in PR #17 by stopping and restarting the database mid-run: the API stayed up and recovered.

## Follow-up

- Regression check: repeat the steps above after any change to `pool.js`.
- Not covered by the automated suite (it needs the database stopped mid-run); keep it in the manual/exploratory checklist.
